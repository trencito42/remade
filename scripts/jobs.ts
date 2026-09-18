import { and, desc, eq, isNull, lte, or } from "drizzle-orm";
import { getDb } from "../src/lib/db/client";
import { rawArticles, sourceFeeds, storyClaims, storyClusters } from "../src/lib/db/schema";
import { ingestFeed } from "../src/features/ingestion/service";
import { clusterRawArticle } from "../src/features/clustering/match";
import { extractClaimsForStory } from "../src/features/claims/service";
import { generateStoryBrief } from "../src/features/stories/brief";
import { finishJob, startJob } from "../src/features/jobs/repository";

const isOnce = process.argv.includes("--once");
const pollIntervalMs = Number(process.env.POLL_INTERVAL_MS ?? 30_000);

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function runJobsIteration() {
  const db = await getDb();
  const now = new Date();

  // 1. Ingestion Job
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
  const feedsToFetch = await db
    .select()
    .from(sourceFeeds)
    .where(
      and(
        eq(sourceFeeds.enabled, true),
        or(
          isNull(sourceFeeds.lastCheckedAt),
          lte(sourceFeeds.lastCheckedAt, fiveMinutesAgo),
        ),
      ),
    )
    .limit(10);

  for (const feed of feedsToFetch) {
    console.log(`[Worker] Ingesting feed: ${feed.url}`);
    await ingestFeed(feed.id);
  }

  // 2. Unclustered Articles Job (atomic claim)
  const unclustered = await db
    .select({ id: rawArticles.id })
    .from(rawArticles)
    .where(eq(rawArticles.ingestionStatus, "stored"))
    .limit(20);

  for (const item of unclustered) {
    // Atomic lock: set to 'processing'
    const [claimed] = await db
      .update(rawArticles)
      .set({ ingestionStatus: "processing" })
      .where(and(eq(rawArticles.id, item.id), eq(rawArticles.ingestionStatus, "stored")))
      .returning();

    if (!claimed) continue; // Claimed by another worker

    const jobId = await startJob("cluster_article", { articleId: item.id });
    try {
      console.log(`[Worker] Clustering article: ${item.id}`);
      await clusterRawArticle(item.id);
      await finishJob(jobId);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`[Worker] Clustering failed for ${item.id}:`, errorMsg);
      await finishJob(jobId, errorMsg);
      await db
        .update(rawArticles)
        .set({ ingestionStatus: "failed" })
        .where(eq(rawArticles.id, item.id));
    }
  }

  // 3. Claims & Story Brief Job for updated clusters without claims
  const recentClusters = await db
    .select()
    .from(storyClusters)
    .orderBy(desc(storyClusters.lastUpdatedAt))
    .limit(10);

  for (const cluster of recentClusters) {
    const existingClaims = await db
      .select({ id: storyClaims.id })
      .from(storyClaims)
      .where(eq(storyClaims.storyId, cluster.id))
      .limit(1);

    if (existingClaims.length === 0) {
      const jobId = await startJob("extract_claims_and_brief", { storyId: cluster.id });
      try {
        console.log(`[Worker] Extracting claims for story: ${cluster.workingTitle}`);
        await extractClaimsForStory(cluster.id);
        await generateStoryBrief(cluster.id);
        await finishJob(jobId);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error(`[Worker] Claims/brief extraction failed for ${cluster.id}:`, errorMsg);
        await finishJob(jobId, errorMsg);
      }
    }
  }
}

async function main() {
  console.log(`[Dispatch Worker] Starting worker loop (Interval: ${pollIntervalMs}ms, Single-pass: ${isOnce})...`);

  while (true) {
    try {
      await runJobsIteration();
    } catch (err) {
      console.error("[Worker Error]", err);
    }

    if (isOnce) {
      console.log("[Dispatch Worker] Single-pass complete.");
      break;
    }

    await sleep(pollIntervalMs);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Worker fatal error:", err);
    process.exit(1);
  });
