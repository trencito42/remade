import { describe, expect, it, vi, beforeAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import * as schema from "@/lib/db/schema";
import { contentHash, titleHash } from "@/features/ingestion/dedupe";
import { clusterScore, decideMatch, temporalScore, titleSimilarity } from "@/features/clustering/score";
import { areContradictoryClaims } from "@/features/claims/service";
import { slugify } from "@/lib/utils";

describe("End-to-End News Pipeline Flow (Mocked AI)", () => {
  let db: ReturnType<typeof drizzlePglite<typeof schema>>;

  beforeAll(async () => {
    const pglite = new PGlite();
    await pglite.waitReady;
    const sql = fs.readFileSync(path.join(process.cwd(), "src/lib/db/bootstrap.sql"), "utf8");
    await pglite.exec(sql);
    db = drizzlePglite(pglite, { schema });
  });

  it("completes full lifecycle: Source -> RawArticle -> Cluster -> Claims -> Draft -> Publish", async () => {
    const now = new Date();

    // 1. Create Source & Feed
    const sourceId = "source-test-1";
    await db.insert(schema.sources).values({
      id: sourceId,
      name: "The Verge",
      domain: "theverge.com",
      type: "publisher",
      tier: 1,
      reliabilityWeight: 1.2,
      category: "technology",
      enabled: true,
      createdAt: now,
    });

    const feedId = "feed-test-1";
    await db.insert(schema.sourceFeeds).values({
      id: feedId,
      sourceId,
      url: "https://theverge.com/rss.xml",
      feedType: "rss",
      enabled: true,
    });

    // 2. Ingest Article 1: "NVIDIA announces GeForce RTX 5090"
    const art1Id = "art-test-1";
    const title1 = "NVIDIA announces GeForce RTX 5090 with 32GB VRAM";
    const url1 = "https://theverge.com/2026/09/rtx-5090-announcement";
    const body1 = "NVIDIA officially revealed the RTX 5090 GPU starting at $1,999. It features 32GB GDDR7 memory.";

    await db.insert(schema.rawArticles).values({
      id: art1Id,
      sourceId,
      externalId: url1,
      url: url1,
      canonicalUrl: url1,
      title: title1,
      excerpt: "NVIDIA officially revealed the RTX 5090 GPU.",
      bodyText: body1,
      publishedAt: now,
      fetchedAt: now,
      contentHash: contentHash(title1, body1, url1),
      titleHash: titleHash(title1),
      ingestionStatus: "stored",
    });

    // 3. Cluster Article 1 -> Creates StoryCluster
    const clusterId = "cluster-test-1";
    const clusterSlug = `${slugify(title1)}-${clusterId.slice(0, 6)}`;
    await db.insert(schema.storyClusters).values({
      id: clusterId,
      slug: clusterSlug,
      workingTitle: title1,
      summary: "NVIDIA announced the RTX 5090 GPU.",
      status: "confirmed",
      category: "hardware",
      firstSeenAt: now,
      lastUpdatedAt: now,
      confidence: 0.9,
      sourceCount: 1,
      createdAt: now,
      updatedAt: now,
    });

    await db.insert(schema.storySources).values({
      storyId: clusterId,
      rawArticleId: art1Id,
      relationship: "origin",
      isPrimarySource: true,
      confidence: 1.0,
    });

    // 4. Ingest Article 2 (from Ars Technica covering the same event)
    const art2Id = "art-test-2";
    const title2 = "NVIDIA reveals RTX 5090: 32GB memory for $1,999";
    const url2 = "https://arstechnica.com/gadgets/2026/09/rtx-5090-specs";
    const body2 = "Ars Technica confirms the RTX 5090 is priced at $1,999 and ships next month.";

    const tSim = titleSimilarity(title1, title2);
    expect(tSim).toBeGreaterThanOrEqual(0.4);

    const matchScore = clusterScore({
      embeddingSimilarity: 0.85,
      titleSimilarity: tSim,
      entityOverlap: 1.0, // Both match NVIDIA and RTX 5090
      temporalScore: 1.0,
      categoryScore: 1.0,
    });

    const decision = decideMatch(matchScore, title2);
    expect(decision).toBe("attach");

    // Attach Article 2 to existing StoryCluster
    await db.insert(schema.rawArticles).values({
      id: art2Id,
      sourceId,
      externalId: url2,
      url: url2,
      canonicalUrl: url2,
      title: title2,
      excerpt: "Ars Technica reports on the RTX 5090.",
      bodyText: body2,
      publishedAt: now,
      fetchedAt: now,
      contentHash: contentHash(title2, body2, url2),
      titleHash: titleHash(title2),
      ingestionStatus: "clustered",
    });

    await db.insert(schema.storySources).values({
      storyId: clusterId,
      rawArticleId: art2Id,
      relationship: "independent_confirmation",
      isPrimarySource: false,
      confidence: matchScore,
    });

    // 5. Extract Claims
    const claim1Id = "claim-1";
    await db.insert(schema.storyClaims).values({
      id: claim1Id,
      storyId: clusterId,
      claimText: "RTX 5090 price is set at $1,999",
      claimType: "metric",
      confidence: 0.95,
      status: "confirmed",
      firstSeenAt: now,
    });

    await db.insert(schema.storyClaimSources).values({
      claimId: claim1Id,
      rawArticleId: art1Id,
      supportType: "supports",
    });
    await db.insert(schema.storyClaimSources).values({
      claimId: claim1Id,
      rawArticleId: art2Id,
      supportType: "supports",
    });

    // Verify contradiction checker
    expect(areContradictoryClaims("Priced at $1,999", "Priced at $2,499")).toBe(true);

    // 6. Generate and Save Draft
    const draftId = "draft-test-1";
    const draftBody = [
      { id: "p1", type: "p" as const, text: "NVIDIA has officially unveiled the GeForce RTX 5090 desktop GPU." },
      { id: "p2", type: "p" as const, text: "The flagship card is priced at $1,999 and includes 32GB of GDDR7 memory." },
    ];

    await db.insert(schema.draftArticles).values({
      id: draftId,
      storyId: clusterId,
      title: "NVIDIA Unveils GeForce RTX 5090 for $1,999",
      dek: "The new flagship Blackwell GPU packs 32GB of GDDR7 memory.",
      body: draftBody,
      status: "ready",
      generatedAt: now,
      reviewedAt: now,
      seoTitle: "NVIDIA GeForce RTX 5090 Announced",
      seoDescription: "NVIDIA unveils the RTX 5090 with 32GB VRAM starting at $1,999.",
    });

    // 7. Publish Story
    const publishedSlug = "nvidia-geforce-rtx-5090-announced";
    const pubId = "pub-test-1";
    await db.insert(schema.publishedArticles).values({
      id: pubId,
      draftId,
      storyId: clusterId,
      slug: publishedSlug,
      title: "NVIDIA Unveils GeForce RTX 5090 for $1,999",
      dek: "The new flagship Blackwell GPU packs 32GB of GDDR7 memory.",
      body: draftBody,
      publishedAt: now,
      updatedAt: now,
      category: "hardware",
      searchText: "nvidia unveils geforce rtx 5090 32gb memory hardware",
    });

    // 8. Verify Published Article in Database
    const publishedRows = await db.select().from(schema.publishedArticles);
    expect(publishedRows.length).toBe(1);
    expect(publishedRows[0]?.slug).toBe(publishedSlug);
    expect(publishedRows[0]?.title).toContain("RTX 5090");
    expect(publishedRows[0]?.category).toBe("hardware");

    // Verify linked story cluster has 2 sources
    const storySourcesCount = await db.select().from(schema.storySources);
    expect(storySourcesCount.length).toBe(2);
  });
});
