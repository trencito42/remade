import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { sourceFeeds, sources } from "@/lib/db/schema";
import type { SourceTier } from "@/types/domain";

export type SourceWithFeeds = typeof sources.$inferSelect & {
  feeds: Array<typeof sourceFeeds.$inferSelect>;
};

export async function listSources(): Promise<SourceWithFeeds[]> {
  const db = await getDb();
  const allSources = await db.select().from(sources).orderBy(sources.name);
  const allFeeds = await db.select().from(sourceFeeds);
  return allSources.map((source) => ({
    ...source,
    feeds: allFeeds.filter((feed) => feed.sourceId === source.id),
  }));
}

export async function listSourceHealth(): Promise<SourceWithFeeds[]> {
  return listSources();
}

export async function listEnabledFeeds(): Promise<Array<typeof sourceFeeds.$inferSelect & { source: typeof sources.$inferSelect }>> {
  const db = await getDb();
  const feeds = await db
    .select()
    .from(sourceFeeds)
    .where(eq(sourceFeeds.enabled, true));
  const allSources = await db.select().from(sources).where(eq(sources.enabled, true));
  const sourceMap = new Map(allSources.map((s) => [s.id, s]));

  const result: Array<typeof sourceFeeds.$inferSelect & { source: typeof sources.$inferSelect }> = [];
  for (const feed of feeds) {
    const source = sourceMap.get(feed.sourceId);
    if (source) {
      result.push({ ...feed, source });
    }
  }
  return result;
}

export async function getSource(id: string): Promise<SourceWithFeeds | null> {
  const db = await getDb();
  const [source] = await db.select().from(sources).where(eq(sources.id, id)).limit(1);
  if (!source) return null;
  const feeds = await db.select().from(sourceFeeds).where(eq(sourceFeeds.sourceId, id));
  return { ...source, feeds };
}

export async function getSourceByDomain(domain: string): Promise<typeof sources.$inferSelect | null> {
  const db = await getDb();
  const [source] = await db.select().from(sources).where(eq(sources.domain, domain)).limit(1);
  return source ?? null;
}

export async function createSource(input: {
  name: string;
  domain: string;
  type?: string;
  tier: number;
  category?: string;
  reliabilityWeight?: number;
  feedUrl: string;
  feedType?: string;
  enabled?: boolean;
}): Promise<{ sourceId: string; feedId: string }> {
  const db = await getDb();
  const sourceId = crypto.randomUUID();
  const feedId = crypto.randomUUID();
  const now = new Date();

  await db.insert(sources).values({
    id: sourceId,
    name: input.name.trim(),
    domain: input.domain.trim().toLowerCase().replace(/^https?:\/\//, ""),
    type: input.type || "publisher",
    tier: input.tier as SourceTier,
    reliabilityWeight: input.reliabilityWeight ?? (input.tier === 0 ? 1.5 : input.tier === 1 ? 1.2 : 1),
    category: input.category || "technology",
    enabled: input.enabled ?? true,
    isSeed: false,
    createdAt: now,
  });

  await db.insert(sourceFeeds).values({
    id: feedId,
    sourceId,
    url: input.feedUrl.trim(),
    feedType: input.feedType || "rss",
    enabled: input.enabled ?? true,
    articlesReceived: 0,
  });

  return { sourceId, feedId };
}

export async function updateSource(
  id: string,
  data: Partial<{
    name: string;
    domain: string;
    tier: number;
    category: string;
    enabled: boolean;
    reliabilityWeight: number;
  }>,
) {
  const db = await getDb();
  await db.update(sources).set(data).where(eq(sources.id, id));
}

export async function deleteSource(id: string) {
  const db = await getDb();
  await db.delete(sources).where(eq(sources.id, id));
}

export async function toggleSourceEnabled(id: string, enabled: boolean) {
  const db = await getDb();
  await db.update(sources).set({ enabled }).where(eq(sources.id, id));
}

export async function toggleFeedEnabled(feedId: string, enabled: boolean) {
  const db = await getDb();
  await db.update(sourceFeeds).set({ enabled }).where(eq(sourceFeeds.id, feedId));
}

export async function addFeedToSource(input: {
  sourceId: string;
  url: string;
  feedType?: string;
}) {
  const db = await getDb();
  const id = crypto.randomUUID();
  await db.insert(sourceFeeds).values({
    id,
    sourceId: input.sourceId,
    url: input.url.trim(),
    feedType: input.feedType || "rss",
    enabled: true,
    articlesReceived: 0,
  });
  return id;
}

export async function recordFeedSuccess(feedId: string, newArticlesCount: number) {
  const db = await getDb();
  const [feed] = await db.select().from(sourceFeeds).where(eq(sourceFeeds.id, feedId)).limit(1);
  if (!feed) return;
  await db
    .update(sourceFeeds)
    .set({
      lastCheckedAt: new Date(),
      lastSuccessAt: new Date(),
      lastError: null,
      articlesReceived: feed.articlesReceived + newArticlesCount,
    })
    .where(eq(sourceFeeds.id, feedId));
}

export async function recordFeedFailure(feedId: string, error: string) {
  const db = await getDb();
  await db
    .update(sourceFeeds)
    .set({
      lastCheckedAt: new Date(),
      lastErrorAt: new Date(),
      lastError: error.slice(0, 500),
    })
    .where(eq(sourceFeeds.id, feedId));
}
