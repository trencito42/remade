import { desc, eq } from "drizzle-orm";
import { getDb } from "../src/lib/db/client";
import { rawArticles, sources, storyClusters, storyEntities, storySources } from "../src/lib/db/schema";
import { clusterScore, cosineSimilarity, decideMatch, temporalScore, titleSimilarity } from "../src/features/clustering/score";
import { titleTokens } from "../src/lib/parsing/title";

async function main() {
  const db = await getDb();
  const articles = await db.select().from(rawArticles);
  const clusters = await db.select().from(storyClusters);
  const links = await db.select().from(storySources);
  const allSources = await db.select().from(sources);
  const storyEnts = await db.select().from(storyEntities);

  const sourceName = new Map(allSources.map((s) => [s.id, s.name]));
  const byStatus = new Map<string, number>();
  for (const a of articles) {
    byStatus.set(a.ingestionStatus, (byStatus.get(a.ingestionStatus) ?? 0) + 1);
  }

  const counts = clusters.map((c) => c.sourceCount).sort((a, b) => a - b);
  const avg = counts.length ? counts.reduce((s, n) => s + n, 0) / counts.length : 0;
  const median = counts.length ? counts[Math.floor(counts.length / 2)] : 0;
  const buckets = { 1: 0, 2: 0, 3: 0, "4+": 0 };
  for (const n of counts) {
    if (n <= 1) buckets[1] += 1;
    else if (n === 2) buckets[2] += 1;
    else if (n === 3) buckets[3] += 1;
    else buckets["4+"] += 1;
  }

  console.log("=== CLUSTER DISTRIBUTION ===");
  console.log({
    rawArticles: articles.length,
    storyClusters: clusters.length,
    storySources: links.length,
    ingestionStatus: Object.fromEntries(byStatus),
    avgSources: Number(avg.toFixed(3)),
    medianSources: median,
    maxSources: counts.at(-1) ?? 0,
    buckets,
  });

  console.log("\n=== MULTI-SOURCE CLUSTERS ===");
  for (const c of clusters.filter((x) => x.sourceCount >= 2).slice(0, 20)) {
    console.log(`${c.sourceCount} | ${c.category} | ${c.workingTitle.slice(0, 90)}`);
  }

  const articleById = new Map(articles.map((a) => [a.id, a]));
  const clusterById = new Map(clusters.map((c) => [c.id, c]));
  const articleCluster = new Map<string, string>();
  for (const link of links) articleCluster.set(link.rawArticleId, link.storyId);

  type Pair = {
    a: (typeof articles)[0];
    b: (typeof articles)[0];
    tSim: number;
    score: number;
    decision: string;
    clusterA?: string;
    clusterB?: string;
  };
  const pairs: Pair[] = [];
  const recent = [...articles].sort(
    (a, b) => (b.publishedAt ?? b.fetchedAt).getTime() - (a.publishedAt ?? a.fetchedAt).getTime(),
  );

  for (let i = 0; i < recent.length; i += 1) {
    for (let j = i + 1; j < recent.length; j += 1) {
      const a = recent[i]!;
      const b = recent[j]!;
      const tSim = titleSimilarity(a.title, b.title);
      if (tSim < 0.22) continue;
      const hours =
        Math.abs((a.publishedAt ?? a.fetchedAt).getTime() - (b.publishedAt ?? b.fetchedAt).getTime()) / 3_600_000;
      if (hours > 168) continue;
      const score = clusterScore({
        embeddingSimilarity: cosineSimilarity(a.embedding, b.embedding),
        titleSimilarity: tSim,
        entityOverlap: 0,
        temporalScore: temporalScore(a.publishedAt ?? a.fetchedAt, b.publishedAt ?? b.fetchedAt),
        categoryScore: 0.5,
      });
      pairs.push({
        a,
        b,
        tSim,
        score,
        decision: decideMatch(score, b.title),
        clusterA: articleCluster.get(a.id),
        clusterB: articleCluster.get(b.id),
      });
    }
  }

  pairs.sort((x, y) => y.tSim - x.tSim);
  console.log("\n=== SIMILAR TITLE PAIRS (entityOverlap forced 0) ===");
  for (const p of pairs.slice(0, 25)) {
    const same = p.clusterA && p.clusterA === p.clusterB;
    console.log(
      JSON.stringify({
        sameCluster: Boolean(same),
        tSim: Number(p.tSim.toFixed(3)),
        score: Number(p.score.toFixed(3)),
        decision: p.decision,
        a: {
          id: p.a.id.slice(0, 8),
          src: sourceName.get(p.a.sourceId),
          title: p.a.title,
          cluster: p.clusterA?.slice(0, 8),
        },
        b: {
          id: p.b.id.slice(0, 8),
          src: sourceName.get(p.b.sourceId),
          title: p.b.title,
          cluster: p.clusterB?.slice(0, 8),
        },
        tokensA: titleTokens(p.a.title).join(" "),
        tokensB: titleTokens(p.b.title).join(" "),
      }),
    );
  }

  const split = pairs.filter((p) => p.tSim >= 0.35 && p.clusterA && p.clusterB && p.clusterA !== p.clusterB);
  console.log(`\nSplit similar pairs tSim>=0.35: ${split.length}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
