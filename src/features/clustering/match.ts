import { desc, eq, gte, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import {
  entities,
  rawArticles,
  sources,
  storyClusters,
  storyEntities,
  storySources,
} from "@/lib/db/schema";
import { inferCategory } from "@/features/extraction/category";
import { resolveAndExtractEntities } from "@/features/extraction/entities";
import {
  clusterScore,
  cosineSimilarity,
  decideMatch,
  temporalScore,
  titleSimilarity,
} from "@/features/clustering/score";
import { judgeClusterAmbiguity } from "@/features/clustering/judge";
import { slugify } from "@/lib/utils";
import { clusteringConfig } from "@/lib/config/env";
import { AiProvider } from "@/lib/ai/provider";

export async function clusterRawArticle(rawArticleId: string): Promise<string | null> {
  const db = await getDb();
  const [article] = await db
    .select()
    .from(rawArticles)
    .where(eq(rawArticles.id, rawArticleId))
    .limit(1);
  if (!article) return null;

  const [source] = await db
    .select()
    .from(sources)
    .where(eq(sources.id, article.sourceId))
    .limit(1);

  // 1. Obtain Entities (Fast pass + AI pass)
  const hits = await resolveAndExtractEntities(
    article.title,
    article.excerpt ?? "",
    article.bodyText ?? "",
  );

  // 2. Obtain Embedding if available
  let articleEmbedding: number[] | null = article.embedding ?? null;
  if (!articleEmbedding) {
    const ai = AiProvider.fromEnv();
    if (ai.available) {
      try {
        const compactText = `${article.title}\n${(article.excerpt || article.bodyText || "").slice(0, 300)}`;
        const embeds = await ai.embed([compactText]);
        if (embeds && embeds[0]) {
          articleEmbedding = embeds[0];
          await db
            .update(rawArticles)
            .set({ embedding: articleEmbedding })
            .where(eq(rawArticles.id, article.id));
        }
      } catch {
        // Embeddings degraded mode: proceed without embedding
      }
    }
  }

  // 3. Category & Window
  const text = `${article.title}\n${article.excerpt ?? ""}\n${article.bodyText ?? ""}`;
  const category = inferCategory(text);
  const articleTime = article.publishedAt ?? article.fetchedAt;
  const windowStart = new Date(
    articleTime.getTime() - clusteringConfig.recentWindowHours * 3_600_000,
  );

  // 4. Candidate StoryClusters from recent window
  const recentClusters = await db
    .select()
    .from(storyClusters)
    .where(gte(storyClusters.lastUpdatedAt, windowStart))
    .orderBy(desc(storyClusters.lastUpdatedAt))
    .limit(40);

  const clusterIds = recentClusters.map((c) => c.id);
  const clusterEntities = clusterIds.length
    ? await db.select().from(storyEntities)
    : [];

  const hitEntityIds = hits.map((h) => h.id);

  let best: {
    cluster: typeof storyClusters.$inferSelect;
    score: number;
    titleSim: number;
  } | null = null;

  for (const cluster of recentClusters) {
    const clusterEntityIds = clusterEntities
      .filter((row) => row.storyId === cluster.id)
      .map((row) => row.entityId);

    const overlap =
      clusterEntityIds.length === 0 || hitEntityIds.length === 0
        ? 0
        : hitEntityIds.filter((id) => clusterEntityIds.includes(id)).length /
          new Set([...clusterEntityIds, ...hitEntityIds]).size;

    const tSim = titleSimilarity(article.title, cluster.workingTitle);
    const embSim = cosineSimilarity(articleEmbedding, cluster.embedding);

    const score = clusterScore({
      embeddingSimilarity: embSim,
      entityOverlap: overlap,
      temporalScore: temporalScore(articleTime, cluster.lastUpdatedAt),
      categoryScore: category === cluster.category ? 1 : 0,
      titleSimilarity: tSim,
    });

    if (!best || score > best.score) {
      best = { cluster, score, titleSim: tSim };
    }
  }

  let decision = best ? decideMatch(best.score, article.title) : "create";

  // Phase 10: AI Ambiguous Cluster Judge
  if (decision === "ambiguous" && best) {
    // Get recent source titles of the candidate cluster
    const clusterLinks = await db
      .select()
      .from(storySources)
      .where(eq(storySources.storyId, best.cluster.id));
    const linkedIds = clusterLinks.map((l) => l.rawArticleId);
    const linkedArticles = linkedIds.length
      ? await db.select({ title: rawArticles.title }).from(rawArticles)
      : [];

    const judge = await judgeClusterAmbiguity({
      article: {
        title: article.title,
        excerpt: article.excerpt ?? "",
        entities: hits.map((h) => h.name),
        publishedAt: articleTime.toISOString(),
      },
      candidateStory: {
        title: best.cluster.workingTitle,
        summary: best.cluster.summary ?? "",
        entities: hits.map((h) => h.name),
        recentSourceTitles: linkedArticles.map((a) => a.title),
      },
    });

    if (judge.sameEvent && judge.confidence >= 0.6) {
      decision = "attach";
    } else {
      decision = "create";
    }
  }

  const attach = Boolean(best && (decision === "attach" || decision === "child"));
  const storyId = attach && best ? best.cluster.id : crypto.randomUUID();
  const now = new Date();

  // Phase 11: Source Provenance Determination
  const isPrimary = Boolean(
    source?.tier === 0 || (!attach && (source?.tier ?? 3) <= 1),
  );

  let relationship = "origin";
  if (attach) {
    if (article.citedSourceUrl) {
      relationship = "aggregation";
    } else if (source && source.tier <= 1) {
      relationship = "independent_confirmation";
    } else {
      relationship = "follow";
    }
  }

  if (!attach) {
    const slug = `${slugify(article.title)}-${storyId.slice(0, 6)}`;
    await db.insert(storyClusters).values({
      id: storyId,
      slug,
      workingTitle: article.title,
      summary: article.excerpt ?? article.title,
      status: "developing",
      category,
      importance: source && source.tier <= 1 ? 65 : 50,
      firstSeenAt: articleTime,
      lastUpdatedAt: now,
      confidence: source && source.tier === 0 ? 0.9 : 0.4,
      sourceCount: 1,
      parentStoryId: decision === "child" && best ? best.cluster.id : null,
      embedding: articleEmbedding,
      isSeed: false,
      createdAt: now,
      updatedAt: now,
    });
  } else if (best) {
    // Determine new confidence and status
    const newConfidence = Math.min(0.98, Math.max(best.cluster.confidence, best.score));
    const newStatus = isPrimary || relationship === "independent_confirmation" ? "confirmed" : "developing";

    await db
      .update(storyClusters)
      .set({
        lastUpdatedAt: now,
        updatedAt: now,
        sourceCount: sql`${storyClusters.sourceCount} + 1`,
        confidence: newConfidence,
        status: best.cluster.status === "confirmed" ? "confirmed" : newStatus,
        embedding: best.cluster.embedding ?? articleEmbedding,
      })
      .where(eq(storyClusters.id, storyId));
  }

  // Attach RawArticle to StorySource
  await db
    .insert(storySources)
    .values({
      storyId,
      rawArticleId: article.id,
      relationship,
      isPrimarySource: isPrimary,
      confidence: best?.score ?? 1,
    })
    .onConflictDoNothing();

  // Attach Entities to Story
  for (const hit of hits) {
    await db
      .insert(storyEntities)
      .values({ storyId, entityId: hit.id, salience: 1 })
      .onConflictDoNothing();
  }

  // Mark article clustered
  await db
    .update(rawArticles)
    .set({ ingestionStatus: "clustered" })
    .where(eq(rawArticles.id, article.id));

  return storyId;
}

export async function recountSources(storyId: string) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(storySources)
    .where(eq(storySources.storyId, storyId));
  await db
    .update(storyClusters)
    .set({ sourceCount: rows.length, updatedAt: new Date() })
    .where(eq(storyClusters.id, storyId));
}
