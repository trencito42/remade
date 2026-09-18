import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { rawArticles, sources, storyClusters, storySources } from "@/lib/db/schema";
import { findLikelyDuplicateClusters, reconcileHighConfidenceDuplicates } from "@/features/clustering/reconcile";
import { clusterStoredArticles } from "@/features/clustering/match";
import { clusterScore, cosineSimilarity, decideMatch, distinctiveMismatch, eventAgreement, titleSimilarity, temporalScore } from "@/features/clustering/score";

export const dynamic = "force-dynamic";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return Response.json({ error: "disabled" }, { status: 404 });
  }

  const db = await getDb();
  const articles = await db.select().from(rawArticles);
  const clusters = await db.select().from(storyClusters).orderBy(desc(storyClusters.lastUpdatedAt));
  const links = await db.select().from(storySources);
  const allSources = await db.select().from(sources);
  const sourceName = new Map(allSources.map((row) => [row.id, row.name]));
  const articleCluster = new Map(links.map((link) => [link.rawArticleId, link.storyId]));

  const counts = clusters.map((cluster) => cluster.sourceCount).sort((a, b) => a - b);
  const buckets = { 1: 0, 2: 0, 3: 0, "4+": 0 };
  for (const n of counts) {
    if (n <= 1) buckets[1] += 1;
    else if (n === 2) buckets[2] += 1;
    else if (n === 3) buckets[3] += 1;
    else buckets["4+"] += 1;
  }

  const status: Record<string, number> = {};
  for (const article of articles) {
    status[article.ingestionStatus] = (status[article.ingestionStatus] ?? 0) + 1;
  }

  const pairs = [];
  for (let i = 0; i < articles.length; i += 1) {
    for (let j = i + 1; j < articles.length; j += 1) {
      const a = articles[i]!;
      const b = articles[j]!;
      const tSim = titleSimilarity(a.title, b.title);
      if (tSim < 0.28) continue;
      const score = clusterScore({
        embeddingSimilarity: cosineSimilarity(a.embedding, b.embedding),
        titleSimilarity: tSim,
        entityOverlap: 0.5,
        temporalScore: temporalScore(a.publishedAt ?? a.fetchedAt, b.publishedAt ?? b.fetchedAt),
        categoryScore: 0.45,
        eventAgreement: eventAgreement(a.title, b.title),
        distinctiveMismatch: distinctiveMismatch(a.title, b.title),
      });
      pairs.push({
        score,
        tSim,
        decision: decideMatch(score, b.title),
        sameCluster: articleCluster.get(a.id) === articleCluster.get(b.id),
        a: { id: a.id, source: sourceName.get(a.sourceId), title: a.title, cluster: articleCluster.get(a.id) },
        b: { id: b.id, source: sourceName.get(b.sourceId), title: b.title, cluster: articleCluster.get(b.id) },
      });
    }
  }
  pairs.sort((a, b) => b.score - a.score);

  const duplicates = await findLikelyDuplicateClusters();

  return Response.json({
    rawArticles: articles.length,
    storyClusters: clusters.length,
    ingestionStatus: status,
    avgSources: counts.length ? counts.reduce((sum, n) => sum + n, 0) / counts.length : 0,
    medianSources: counts[Math.floor(counts.length / 2)] ?? 0,
    maxSources: counts.at(-1) ?? 0,
    buckets,
    multiSource: clusters.filter((cluster) => cluster.sourceCount >= 2).map((cluster) => ({
      id: cluster.id,
      sourceCount: cluster.sourceCount,
      title: cluster.workingTitle,
    })),
    similarPairs: pairs.slice(0, 20),
    duplicateRecommendations: duplicates.slice(0, 15),
  });
}

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return Response.json({ error: "disabled" }, { status: 404 });
  }
  const stored = await clusterStoredArticles(200);
  const reconciled = await reconcileHighConfidenceDuplicates();
  return Response.json({ stored, reconciled });
}
