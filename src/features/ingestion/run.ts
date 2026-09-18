import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { jobRuns, rawArticles, sourceFeeds } from "@/lib/db/schema";
import { RssAtomAdapter } from "@/features/ingestion/rss";
import { contentHash, titleHash } from "@/features/ingestion/dedupe";
import { clusterRawArticle } from "@/features/clustering/match";
import { toPlainText } from "@/lib/security/sanitize";

export type IngestResult = {
  feedId: string;
  fetched: number;
  stored: number;
  duplicates: number;
  clustered: number;
  error: string | null;
};

export async function ingestAllFeeds() {
  const db = await getDb();
  const feeds = await db.select().from(sourceFeeds).where(eq(sourceFeeds.enabled, true));
  const results: IngestResult[] = [];
  for (const feed of feeds) {
    results.push(await ingestFeed(feed.id));
  }
  return results;
}

export async function ingestFeed(feedId: string): Promise<IngestResult> {
  const db = await getDb();
  const started = new Date();
  const [feed] = await db.select().from(sourceFeeds).where(eq(sourceFeeds.id, feedId)).limit(1);
  const result: IngestResult = { feedId, fetched: 0, stored: 0, duplicates: 0, clustered: 0, error: null };
  if (!feed) {
    result.error = "Feed not found";
    return result;
  }

  try {
    const adapter = new RssAtomAdapter(feed.url);
    const items = await adapter.fetchItems();
    result.fetched = items.length;
    await db
      .update(sourceFeeds)
      .set({ lastCheckedAt: new Date() })
      .where(eq(sourceFeeds.id, feed.id));

    for (const raw of items.slice(0, 40)) {
      const item = adapter.normalizeItem(raw);
      if (!item.url) continue;
      let canonical: string;
      try {
        canonical = adapter.getCanonicalUrl(item);
      } catch {
        continue;
      }
      const externalId = item.externalId || canonical;
      const hash = contentHash(item.title, item.bodyText, canonical);
      const tHash = titleHash(item.title);

      const [byCanonical] = await db.select({ id: rawArticles.id }).from(rawArticles).where(eq(rawArticles.canonicalUrl, canonical)).limit(1);
      const [byExternal] = await db
        .select({ id: rawArticles.id })
        .from(rawArticles)
        .where(and(eq(rawArticles.sourceId, feed.sourceId), eq(rawArticles.externalId, externalId)))
        .limit(1);
      if (byCanonical || byExternal) {
        result.duplicates += 1;
        continue;
      }

      const id = crypto.randomUUID();
      await db.insert(rawArticles).values({
        id,
        sourceId: feed.sourceId,
        externalId,
        url: item.url,
        canonicalUrl: canonical,
        title: toPlainText(item.title),
        excerpt: item.excerpt,
        bodyText: item.bodyText,
        publishedAt: item.publishedAt && !Number.isNaN(item.publishedAt.getTime()) ? item.publishedAt : null,
        fetchedAt: new Date(),
        language: item.language,
        author: item.author,
        imageUrl: item.imageUrl,
        contentHash: hash,
        titleHash: tHash,
        ingestionStatus: "stored",
        isSeed: false,
      });
      result.stored += 1;
      await clusterRawArticle(id);
      result.clustered += 1;
    }

    await db
      .update(sourceFeeds)
      .set({
        lastSuccessAt: new Date(),
        lastError: null,
        articlesReceived: feed.articlesReceived + result.stored,
      })
      .where(eq(sourceFeeds.id, feed.id));
  } catch (error) {
    result.error = error instanceof Error ? error.message : "Ingest failed";
    await db
      .update(sourceFeeds)
      .set({ lastError: result.error, lastErrorAt: new Date(), lastCheckedAt: new Date() })
      .where(eq(sourceFeeds.id, feed.id));
  }

  await db.insert(jobRuns).values({
    id: crypto.randomUUID(),
    jobName: "ingest_feed",
    payload: { ...result },
    status: result.error ? "error" : "ok",
    error: result.error,
    startedAt: started,
    finishedAt: new Date(),
  });
  return result;
}
