import { eq } from "drizzle-orm";
import type { AppDb } from "@/lib/db/client";
import {
  draftArticles,
  entities,
  entityAliases,
  publishedArticles,
  rawArticles,
  sourceFeeds,
  sources,
  storyClaims,
  storyClusters,
  storySources,
  storyUpdates,
} from "@/lib/db/schema";
import { defaultEntities } from "@/features/extraction/entities";
import { stories } from "@/lib/mock/stories";
import { contentHash, titleHash } from "@/features/ingestion/dedupe";

const defaultFeeds = [
  { name: "The Verge", domain: "theverge.com", url: "https://www.theverge.com/rss/index.xml", tier: 1, category: "technology" },
  { name: "Ars Technica", domain: "arstechnica.com", url: "https://feeds.arstechnica.com/arstechnica/index/", tier: 1, category: "technology" },
  { name: "Polygon", domain: "polygon.com", url: "https://www.polygon.com/rss/index.xml", tier: 2, category: "gaming" },
  { name: "Eurogamer", domain: "eurogamer.net", url: "https://www.eurogamer.net/feed", tier: 2, category: "gaming" },
];

let seeded = false;

export async function ensureSeed(db: AppDb) {
  if (seeded) return;
  const existingEntities = await db.select({ id: entities.id }).from(entities).limit(1);
  const existingClusters = await db.select({ id: storyClusters.id }).from(storyClusters).limit(1);
  const existingFeeds = await db.select({ id: sourceFeeds.id }).from(sourceFeeds).limit(1);

  const now = new Date();

  if (!existingEntities.length) {
    for (const entity of defaultEntities) {
      const id = crypto.randomUUID();
      await db.insert(entities).values({
        id,
        name: entity.name,
        type: entity.type,
        canonicalKey: entity.canonicalKey,
      });
      const seen = new Set<string>();
      for (const alias of entity.aliases) {
        const key = alias.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        await db.insert(entityAliases).values({
          id: crypto.randomUUID(),
          entityId: id,
          alias,
          normalizedAlias: key,
        });
      }
    }
  }

  if (!existingFeeds.length) {
    for (const feed of defaultFeeds) {
      const sourceId = crypto.randomUUID();
      await db.insert(sources).values({
        id: sourceId,
        name: feed.name,
        domain: feed.domain,
        type: "publisher",
        tier: feed.tier,
        reliabilityWeight: feed.tier === 1 ? 1.2 : 1,
        category: feed.category,
        enabled: true,
        isSeed: false,
        createdAt: now,
      });
      await db.insert(sourceFeeds).values({
        id: crypto.randomUUID(),
        sourceId,
        url: feed.url,
        feedType: "rss",
        enabled: true,
        articlesReceived: 0,
      });
    }
  }

  if (existingClusters.length) {
    seeded = true;
    return;
  }

  for (const story of stories) {
    await db.insert(storyClusters).values({
      id: story.id,
      slug: story.slug,
      workingTitle: story.title,
      summary: story.summary,
      status: story.status,
      category: story.category,
      importance: 70,
      firstSeenAt: new Date(story.firstSeenAt),
      lastUpdatedAt: new Date(story.lastUpdatedAt),
      confidence: story.confidence,
      sourceCount: story.sourceCount,
      isSeed: true,
      createdAt: now,
      updatedAt: now,
    });

    for (const source of story.sources) {
      const domain = `${source.id}.example`;
      const [existingSource] = await db.select().from(sources).where(eq(sources.domain, domain)).limit(1);
      const sourceId = existingSource?.id ?? crypto.randomUUID();
      if (!existingSource) {
        await db.insert(sources).values({
          id: sourceId,
          name: source.name,
          domain,
          type: "publisher",
          tier: source.tier,
          reliabilityWeight: 1,
          enabled: true,
          isSeed: true,
          createdAt: now,
        });
      }
      await db.insert(rawArticles).values({
        id: source.id,
        sourceId,
        externalId: source.url,
        url: source.url,
        canonicalUrl: source.url,
        title: source.title,
        excerpt: story.dek,
        bodyText: story.summary,
        publishedAt: new Date(source.publishedAt),
        fetchedAt: now,
        contentHash: contentHash(source.title, story.summary, source.url),
        titleHash: titleHash(source.title),
        ingestionStatus: "clustered",
        isSeed: true,
      });
      await db.insert(storySources).values({
        storyId: story.id,
        rawArticleId: source.id,
        relationship: source.relationship,
        isPrimarySource: source.isPrimary,
        confidence: 0.8,
      });
    }

    for (const claim of story.claims) {
      await db.insert(storyClaims).values({
        id: claim.id,
        storyId: story.id,
        claimText: claim.text,
        claimType: claim.type,
        confidence: 0.7,
        status: claim.status,
        firstSeenAt: new Date(story.firstSeenAt),
        excerpt: claim.excerpt,
      });
    }

    for (const item of story.timeline) {
      await db.insert(storyUpdates).values({
        id: crypto.randomUUID(),
        storyId: story.id,
        updateType: "coverage",
        summary: item.text,
        createdAt: new Date(item.at),
      });
    }

    const draftId = `draft-${story.id}`;
    await db.insert(draftArticles).values({
      id: draftId,
      storyId: story.id,
      title: story.draft.title,
      dek: story.draft.dek,
      body: story.draft.body,
      heroImage: null,
      status: story.published ? "ready" : "draft",
    });

    if (story.published) {
      await db.insert(publishedArticles).values({
        id: `pub-${story.id}`,
        draftId,
        storyId: story.id,
        slug: story.slug,
        title: story.title,
        dek: story.dek,
        body: story.body,
        heroImage: null,
        publishedAt: new Date(story.lastUpdatedAt),
        updatedAt: new Date(story.lastUpdatedAt),
        seoTitle: story.title,
        seoDescription: story.dek,
        category: story.category,
        searchText: `${story.title} ${story.dek} ${story.summary}`,
      });
    }
  }

  seeded = true;
}
