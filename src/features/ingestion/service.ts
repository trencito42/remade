import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { jobRuns, rawArticles, sourceFeeds } from "@/lib/db/schema";
import { RssAtomAdapter } from "@/features/ingestion/rss";
import { contentHash, titleHash } from "@/features/ingestion/dedupe";
import { clusterRawArticle } from "@/features/clustering/match";
import { extractFullArticle } from "@/features/extraction/article";
import { toPlainText } from "@/lib/security/sanitize";
import { assertSafeHttpUrl } from "@/lib/security/url";
import { recordFeedFailure, recordFeedSuccess } from "@/features/sources/repository";
import { findDuplicateArticle } from "@/features/articles/repository";

export type IngestResult = {
  feedId: string;
  sourceId: string;
  fetched: number;
  stored: number;
  duplicates: number;
  clustered: number;
  error: string | null;
};

export async function ingestAllEnabledFeeds(): Promise<IngestResult[]> {
  const db = await getDb();
  const feeds = await db
    .select()
    .from(sourceFeeds)
    .where(eq(sourceFeeds.enabled, true));

  const results: IngestResult[] = [];
  for (const feed of feeds) {
    try {
      const result = await ingestFeed(feed.id);
      results.push(result);
    } catch (err) {
      results.push({
        feedId: feed.id,
        sourceId: feed.sourceId,
        fetched: 0,
        stored: 0,
        duplicates: 0,
        clustered: 0,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  return results;
}

export async function ingestFeed(feedId: string): Promise<IngestResult> {
  const db = await getDb();
  const started = new Date();

  const [feed] = await db
    .select()
    .from(sourceFeeds)
    .where(eq(sourceFeeds.id, feedId))
    .limit(1);

  const result: IngestResult = {
    feedId,
    sourceId: feed?.sourceId ?? "",
    fetched: 0,
    stored: 0,
    duplicates: 0,
    clustered: 0,
    error: null,
  };

  if (!feed) {
    result.error = "Feed not found";
    return result;
  }

  try {
    const adapter = new RssAtomAdapter(feed.url);
    const rawItems = await adapter.fetchItems();
    result.fetched = rawItems.length;
    console.log(`[Ingest] Feed: ${feed.url} (${rawItems.length} items found)`);

    await db
      .update(sourceFeeds)
      .set({ lastCheckedAt: new Date() })
      .where(eq(sourceFeeds.id, feed.id));

    for (const raw of rawItems.slice(0, 15)) {
      const item = adapter.normalizeItem(raw);
      if (!item.url) continue;

      let canonical: string;
      try {
        assertSafeHttpUrl(item.url);
        canonical = adapter.getCanonicalUrl(item);
      } catch {
        continue;
      }

      const externalId = item.externalId || canonical;
      const cHash = contentHash(item.title, item.bodyText, canonical);
      const tHash = titleHash(item.title);

      // Check duplicates
      const dup = await findDuplicateArticle({
        canonicalUrl: canonical,
        sourceId: feed.sourceId,
        externalId,
        contentHash: cHash,
      });

      if (dup) {
        result.duplicates += 1;
        continue;
      }

      // Phase 6: Safe Full Article Content Extraction
      let finalBody = item.bodyText;
      let finalAuthor = item.author;
      let finalImage = item.imageUrl;
      let finalPublishedAt = item.publishedAt;
      let citedSourceUrl: string | null = null;

      try {
        const fullContent = await extractFullArticle(canonical);
        if (fullContent) {
          if (fullContent.bodyText && fullContent.bodyText.length > finalBody.length) {
            finalBody = fullContent.bodyText;
          }
          if (fullContent.author) finalAuthor = fullContent.author;
          if (fullContent.imageUrl) finalImage = fullContent.imageUrl;
          if (fullContent.publishedAt) finalPublishedAt = fullContent.publishedAt;
          if (fullContent.citedSourceUrl) citedSourceUrl = fullContent.citedSourceUrl;
        }
      } catch {
        // Degrade gracefully to RSS content
      }

      const id = crypto.randomUUID();
      const validDate =
        finalPublishedAt && !Number.isNaN(finalPublishedAt.getTime())
          ? finalPublishedAt
          : null;

      await db.insert(rawArticles).values({
        id,
        sourceId: feed.sourceId,
        externalId,
        url: item.url,
        canonicalUrl: canonical,
        title: toPlainText(item.title),
        excerpt: item.excerpt ? toPlainText(item.excerpt).slice(0, 400) : null,
        bodyText: finalBody,
        publishedAt: validDate,
        fetchedAt: new Date(),
        language: item.language,
        author: finalAuthor,
        imageUrl: finalImage,
        contentHash: cHash,
        titleHash: tHash,
        ingestionStatus: "stored",
        citedSourceUrl,
        isSeed: false,
      });
      result.stored += 1;

      // Trigger clustering
      try {
        await clusterRawArticle(id);
        result.clustered += 1;
      } catch (err) {
        console.error(`Clustering failed for article ${id}:`, err);
      }
    }

    // Update feed success
    await recordFeedSuccess(feed.id, result.stored);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Ingest failed";
    result.error = errorMsg;
    await recordFeedFailure(feed.id, errorMsg);
  }

  // Record in jobRuns
  await db.insert(jobRuns).values({
    id: crypto.randomUUID(),
    jobName: "ingest_feed",
    payload: { ...result },
    status: result.error ? "error" : "completed",
    error: result.error,
    startedAt: started,
    finishedAt: new Date(),
  });

  return result;
}
