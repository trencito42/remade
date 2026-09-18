import { and, desc, eq, gte, inArray } from "drizzle-orm";
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
  categoryScore as categoryMatchScore,
  cosineSimilarity,
  decideMatch,
  eventAgreement,
  scoreBreakdown,
  temporalScore,
  titleSimilarity,
  distinctiveMismatch,
  type ScoreBreakdown,
} from "@/features/clustering/score";
import { judgeClusterAmbiguity } from "@/features/clustering/judge";
import { slugify } from "@/lib/utils";
import { clusteringConfig, getEnv } from "@/lib/config/env";
import { AiProvider } from "@/lib/ai/provider";
import { titleTokens } from "@/lib/parsing/title";
import { recountStorySources } from "@/features/stories/repository";
import { listUnclusteredArticles } from "@/features/articles/repository";

let clusterQueue: Promise<unknown> = Promise.resolve();

export async function clusterRawArticle(rawArticleId: string): Promise<string | null> {
  const run = clusterQueue.then(() => clusterRawArticleUnlocked(rawArticleId));
  clusterQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export async function clusterRawArticleUnlocked(rawArticleId: string): Promise<string | null> {
  const db = await getDb();
  const [article] = await db.select().from(rawArticles).where(eq(rawArticles.id, rawArticleId)).limit(1);
  if (!article) return null;

  if (article.ingestionStatus === "clustered") {
    const [existing] = await db
      .select({ storyId: storySources.storyId })
      .from(storySources)
      .where(eq(storySources.rawArticleId, article.id))
      .limit(1);
    if (existing) return existing.storyId;
  }

  const [source] = await db.select().from(sources).where(eq(sources.id, article.sourceId)).limit(1);

  const hits = await resolveAndExtractEntities(article.title, article.excerpt ?? "", article.bodyText ?? "");

  let articleEmbedding: number[] | null = article.embedding ?? null;
  const ai = AiProvider.fromEnv();
  if (!articleEmbedding && ai.embeddingsEnabled) {
    try {
      const compactText = `${article.title}\n${(article.excerpt || article.bodyText || "").slice(0, 300)}`;
      const embeds = await ai.embed([compactText]);
      if (embeds?.[0]) {
        articleEmbedding = embeds[0];
        await db.update(rawArticles).set({ embedding: articleEmbedding }).where(eq(rawArticles.id, article.id));
      }
    } catch {
      // degraded mode
    }
  }

  const text = `${article.title}\n${article.excerpt ?? ""}\n${article.bodyText ?? ""}`;
  const category = inferCategory(text);
  const articleTime = article.publishedAt ?? article.fetchedAt;
  const candidates = await findCandidateClusters({
    articleTitle: article.title,
    articleTime,
    entityIds: hits.map((hit) => hit.id),
  });

  const hitEntityIds = hits.map((hit) => hit.id);
  const clusterIds = candidates.map((cluster) => cluster.id);
  const clusterEntityRows = clusterIds.length
    ? await db
        .select({
          storyId: storyEntities.storyId,
          entityId: storyEntities.entityId,
          name: entities.name,
        })
        .from(storyEntities)
        .innerJoin(entities, eq(entities.id, storyEntities.entityId))
        .where(inArray(storyEntities.storyId, clusterIds))
    : [];

  let best: {
    cluster: typeof storyClusters.$inferSelect;
    breakdown: ScoreBreakdown;
    entityNames: string[];
  } | null = null;

  for (const cluster of candidates) {
    const rows = clusterEntityRows.filter((row) => row.storyId === cluster.id);
    const clusterEntityIds = rows.map((row) => row.entityId);
    const overlap =
      clusterEntityIds.length === 0 || hitEntityIds.length === 0
        ? 0
        : hitEntityIds.filter((id) => clusterEntityIds.includes(id)).length /
          new Set([...clusterEntityIds, ...hitEntityIds]).size;

    const breakdown = scoreBreakdown({
      embeddingSimilarity: cosineSimilarity(articleEmbedding, cluster.embedding),
      entityOverlap: overlap,
      temporalScore: temporalScore(articleTime, cluster.lastUpdatedAt),
      categoryScore: categoryMatchScore(category, cluster.category),
      titleSimilarity: titleSimilarity(article.title, cluster.workingTitle),
      eventAgreement: eventAgreement(article.title, cluster.workingTitle),
      distinctiveMismatch: distinctiveMismatch(article.title, cluster.workingTitle),
    });

    if (!best || breakdown.finalScore > best.breakdown.finalScore) {
      best = { cluster, breakdown, entityNames: rows.map((row) => row.name) };
    }
  }

  let decision = best ? decideMatch(best.breakdown.finalScore, article.title) : "create";
  let judgeUsed = false;
  let judgeResult: { sameEvent: boolean; confidence: number; reason: string } | null = null;

  if (decision === "ambiguous" && best) {
    judgeUsed = true;
    const clusterLinks = await db.select().from(storySources).where(eq(storySources.storyId, best.cluster.id));
    const linkedIds = clusterLinks.map((link) => link.rawArticleId);
    const linkedArticles = linkedIds.length
      ? await db
          .select({ title: rawArticles.title })
          .from(rawArticles)
          .where(inArray(rawArticles.id, linkedIds))
      : [];

    judgeResult = await judgeClusterAmbiguity({
      article: {
        title: article.title,
        excerpt: article.excerpt ?? "",
        entities: hits.map((hit) => hit.name),
        publishedAt: articleTime.toISOString(),
      },
      candidateStory: {
        title: best.cluster.workingTitle,
        summary: best.cluster.summary ?? "",
        entities: best.entityNames,
        recentSourceTitles: linkedArticles.map((row) => row.title),
      },
    });

    if (judgeResult.sameEvent && judgeResult.confidence >= 0.6 && best.breakdown.eventAgreement >= 0) {
      decision = "attach";
    } else {
      decision = "create";
    }
  }

  const attach = Boolean(best && (decision === "attach" || decision === "child"));
  const storyId = attach && best ? best.cluster.id : crypto.randomUUID();
  const now = new Date();

  const isPrimary = Boolean(source?.tier === 0 || (!attach && (source?.tier ?? 3) <= 1));
  let relationship = "origin";
  if (attach) {
    if (article.citedSourceUrl) relationship = "aggregation";
    else if (source && source.tier <= 1) relationship = "independent_confirmation";
    else relationship = "follow";
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
    const newConfidence = Math.min(0.98, Math.max(best.cluster.confidence, best.breakdown.finalScore));
    const newStatus = isPrimary || relationship === "independent_confirmation" ? "confirmed" : "developing";
    await db
      .update(storyClusters)
      .set({
        lastUpdatedAt: now,
        updatedAt: now,
        confidence: newConfidence,
        status: best.cluster.status === "confirmed" ? "confirmed" : newStatus,
        embedding: best.cluster.embedding ?? articleEmbedding,
      })
      .where(eq(storyClusters.id, storyId));
  }

  await db
    .insert(storySources)
    .values({
      storyId,
      rawArticleId: article.id,
      relationship,
      isPrimarySource: isPrimary,
      confidence: best?.breakdown.finalScore ?? 1,
    })
    .onConflictDoNothing();

  for (const hit of hits) {
    await db.insert(storyEntities).values({ storyId, entityId: hit.id, salience: 1 }).onConflictDoNothing();
  }

  await recountStorySources(storyId);

  await db.update(rawArticles).set({ ingestionStatus: "clustered" }).where(eq(rawArticles.id, article.id));

  if (getEnv().clusterDebug) {
    console.info(
      "[cluster]",
      JSON.stringify({
        articleId: article.id,
        articleTitle: article.title,
        candidateCount: candidates.length,
        bestCandidateId: best?.cluster.id ?? null,
        bestCandidateTitle: best?.cluster.workingTitle ?? null,
        signals: best?.breakdown ?? null,
        score: best?.breakdown.finalScore ?? null,
        decision,
        judgeUsed,
        judgeResult,
        finalStoryId: storyId,
        reason: attach ? "attach" : "create",
      }),
    );
  }

  return storyId;
}

async function findCandidateClusters(input: {
  articleTitle: string;
  articleTime: Date;
  entityIds: string[];
}) {
  const db = await getDb();
  const windowStart = new Date(input.articleTime.getTime() - clusteringConfig.recentWindowHours * 3_600_000);
  const recent = await db
    .select()
    .from(storyClusters)
    .where(gte(storyClusters.lastUpdatedAt, windowStart))
    .orderBy(desc(storyClusters.lastUpdatedAt))
    .limit(clusteringConfig.candidateLimit);

  const entityWindow = new Date(input.articleTime.getTime() - 14 * 24 * 3_600_000);
  const byEntity = input.entityIds.length
    ? await db
        .select({ cluster: storyClusters })
        .from(storyClusters)
        .innerJoin(storyEntities, eq(storyEntities.storyId, storyClusters.id))
        .where(and(inArray(storyEntities.entityId, input.entityIds), gte(storyClusters.lastUpdatedAt, entityWindow)))
        .limit(40)
    : [];

  const merged = new Map(recent.map((cluster) => [cluster.id, cluster]));
  for (const row of byEntity) merged.set(row.cluster.id, row.cluster);

  const tokenWindow = new Date(input.articleTime.getTime() - 14 * 24 * 3_600_000);
  const wider = await db
    .select()
    .from(storyClusters)
    .where(gte(storyClusters.lastUpdatedAt, tokenWindow))
    .orderBy(desc(storyClusters.lastUpdatedAt))
    .limit(200);

  const tokens = new Set(titleTokens(input.articleTitle).filter((token) => token.length >= 4 || /\d/.test(token)));
  if (tokens.size) {
    for (const cluster of wider) {
      const overlap = titleTokens(cluster.workingTitle).filter((token) => tokens.has(token));
      if (overlap.length >= 2) merged.set(cluster.id, cluster);
    }
  }

  return [...merged.values()];
}

export async function clusterStoredArticles(limit = 80) {
  const pending = await listUnclusteredArticles(limit);
  const storyIds: string[] = [];
  for (const article of pending) {
    const storyId = await clusterRawArticle(article.id);
    if (storyId) storyIds.push(storyId);
  }
  return { pending: pending.length, clustered: storyIds.length };
}

export async function recountSources(storyId: string) {
  return recountStorySources(storyId);
}

export async function explainArticleMatch(articleTitle: string, clusterTitle: string, extra?: Partial<Parameters<typeof scoreBreakdown>[0]>) {
  return scoreBreakdown({
    embeddingSimilarity: extra?.embeddingSimilarity ?? null,
    entityOverlap: extra?.entityOverlap ?? 0,
    temporalScore: extra?.temporalScore ?? 0.5,
    categoryScore: extra?.categoryScore ?? 0.45,
    titleSimilarity: titleSimilarity(articleTitle, clusterTitle),
    eventAgreement: eventAgreement(articleTitle, clusterTitle),
  });
}
