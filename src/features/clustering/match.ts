import { desc, eq, gte, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { entities, entityAliases, rawArticles, storyClusters, storyEntities, storySources } from "@/lib/db/schema";
import { inferCategory } from "@/features/extraction/category";
import { extractEntities } from "@/features/extraction/entities";
import { clusterScore, decideMatch, temporalScore, titleSimilarity } from "@/features/clustering/score";
import { slugify } from "@/lib/utils";
import { clusteringConfig } from "@/lib/config/env";

export async function clusterRawArticle(rawArticleId: string) {
  const db = await getDb();
  const [article] = await db.select().from(rawArticles).where(eq(rawArticles.id, rawArticleId)).limit(1);
  if (!article) return null;

  const catalogRows = await db.select().from(entities);
  const aliasRows = await db.select().from(entityAliases);
  const catalog = catalogRows.map((entity) => ({
    canonicalKey: entity.canonicalKey,
    name: entity.name,
    type: entity.type,
    aliases: aliasRows.filter((alias) => alias.entityId === entity.id).map((alias) => alias.alias),
  }));

  const text = `${article.title}\n${article.excerpt ?? ""}\n${article.bodyText ?? ""}`;
  const hits = extractEntities(text, catalog);
  const category = inferCategory(text);
  const articleTime = article.publishedAt ?? article.fetchedAt;
  const windowStart = new Date(articleTime.getTime() - clusteringConfig.recentWindowHours * 3_600_000);

  const recent = await db
    .select()
    .from(storyClusters)
    .where(gte(storyClusters.lastUpdatedAt, windowStart))
    .orderBy(desc(storyClusters.lastUpdatedAt))
    .limit(40);

  const recentEntities = recent.length
    ? await db.select().from(storyEntities)
    : [];

  let best: { id: string; title: string; score: number; category: string } | null = null;
  for (const cluster of recent) {
    const clusterKeys = recentEntities.filter((row) => row.storyId === cluster.id).map((row) => row.entityId);
    const hitKeys = hits
      .map((hit) => catalogRows.find((entity) => entity.canonicalKey === hit.canonicalKey)?.id)
      .filter((id): id is string => Boolean(id));
    const overlap =
      clusterKeys.length === 0 || hitKeys.length === 0
        ? 0
        : hitKeys.filter((id) => clusterKeys.includes(id)).length / new Set([...clusterKeys, ...hitKeys]).size;
    const score = clusterScore({
      embeddingSimilarity: null,
      entityOverlap: overlap,
      temporalScore: temporalScore(articleTime, cluster.lastUpdatedAt),
      categoryScore: category === cluster.category ? 1 : 0,
      titleSimilarity: titleSimilarity(article.title, cluster.workingTitle),
    });
    if (!best || score > best.score) {
      best = { id: cluster.id, title: cluster.workingTitle, score, category: cluster.category };
    }
  }

  const decision = best ? decideMatch(best.score, article.title) : "create";
  const attach = best && (decision === "attach" || decision === "child" || (decision === "ambiguous" && best.score >= 0.64));
  const storyId = attach && best ? best.id : crypto.randomUUID();
  const now = new Date();

  if (!attach) {
    await db.insert(storyClusters).values({
      id: storyId,
      slug: `${slugify(article.title)}-${storyId.slice(0, 6)}`,
      workingTitle: article.title,
      summary: article.excerpt ?? article.title,
      status: "developing",
      category,
      importance: 50,
      firstSeenAt: articleTime,
      lastUpdatedAt: now,
      confidence: 0.4,
      sourceCount: 1,
      parentStoryId: decision === "child" && best ? best.id : null,
      isSeed: false,
      createdAt: now,
      updatedAt: now,
    });
  } else if (best) {
    await db
      .update(storyClusters)
      .set({
        lastUpdatedAt: now,
        updatedAt: now,
        sourceCount: sql`${storyClusters.sourceCount} + 1`,
        confidence: Math.min(0.98, best.score),
        status: "developing",
      })
      .where(eq(storyClusters.id, storyId));
  }

  await db
    .insert(storySources)
    .values({
      storyId,
      rawArticleId: article.id,
      relationship: attach ? "follow" : "origin",
      isPrimarySource: !attach,
      confidence: best?.score ?? 1,
    })
    .onConflictDoNothing();

  for (const hit of hits) {
    const entity = catalogRows.find((row) => row.canonicalKey === hit.canonicalKey);
    if (!entity) continue;
    await db.insert(storyEntities).values({ storyId, entityId: entity.id, salience: 1 }).onConflictDoNothing();
  }

  await db.update(rawArticles).set({ ingestionStatus: "clustered" }).where(eq(rawArticles.id, article.id));
  return storyId;
}

export async function recountSources(storyId: string) {
  const db = await getDb();
  const rows = await db.select().from(storySources).where(eq(storySources.storyId, storyId));
  await db.update(storyClusters).set({ sourceCount: rows.length, updatedAt: new Date() }).where(eq(storyClusters.id, storyId));
}
