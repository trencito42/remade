import { desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import {
  draftArticles,
  publishedArticles,
  rawArticles,
  sourceFeeds,
  sources,
  storyClaims,
  storyClusters,
  storySources,
  storyUpdates,
} from "@/lib/db/schema";
import type { MockStory } from "@/lib/mock/stories";
import { categoryMeta } from "@/lib/mock/stories";
import type { StoryStatus } from "@/types/domain";

export async function listClusters(): Promise<MockStory[]> {
  const db = await getDb();
  const clusters = await db.select().from(storyClusters).orderBy(desc(storyClusters.lastUpdatedAt)).limit(80);
  const stories = await Promise.all(clusters.map((cluster) => hydrateStory(cluster.id, cluster)));
  return stories.filter((story): story is MockStory => Boolean(story));
}

export async function listPublished(category?: keyof typeof categoryMeta): Promise<MockStory[]> {
  const db = await getDb();
  const rows = category
    ? await db
        .select()
        .from(publishedArticles)
        .where(eq(publishedArticles.category, category))
        .orderBy(desc(publishedArticles.publishedAt))
        .limit(40)
    : await db.select().from(publishedArticles).orderBy(desc(publishedArticles.publishedAt)).limit(40);
  const stories: MockStory[] = [];
  for (const row of rows) {
    const story = await getStoryById(row.storyId);
    if (story?.published) stories.push(story);
  }
  return stories;
}

export async function getStoryById(id: string) {
  return hydrateStory(id);
}

export async function getStoryBySlug(slug: string) {
  const db = await getDb();
  const [published] = await db.select().from(publishedArticles).where(eq(publishedArticles.slug, slug)).limit(1);
  if (published) return hydrateStory(published.storyId);
  const [cluster] = await db.select().from(storyClusters).where(eq(storyClusters.slug, slug)).limit(1);
  if (!cluster) return null;
  return hydrateStory(cluster.id, cluster);
}

export async function listSourceHealth() {
  const db = await getDb();
  const allSources = await db.select().from(sources).orderBy(sources.name);
  const feeds = await db.select().from(sourceFeeds);
  return allSources.map((source) => ({
    ...source,
    feeds: feeds.filter((feed) => feed.sourceId === source.id),
  }));
}

async function hydrateStory(
  id: string,
  clusterRow?: typeof storyClusters.$inferSelect,
): Promise<MockStory | null> {
  const db = await getDb();
  const cluster = clusterRow ?? (await db.select().from(storyClusters).where(eq(storyClusters.id, id)).limit(1))[0];
  if (!cluster) return null;
  const links = await db.select().from(storySources).where(eq(storySources.storyId, id));
  const articleIds = links.map((link) => link.rawArticleId);
  const articles = articleIds.length
    ? await db.select().from(rawArticles).where(inArray(rawArticles.id, articleIds))
    : [];
  const allSources = await db.select().from(sources);
  const published = await db.select().from(publishedArticles).where(eq(publishedArticles.storyId, id)).limit(1);
  const drafts = await db.select().from(draftArticles).where(eq(draftArticles.storyId, id)).limit(1);
  const claims = await db.select().from(storyClaims).where(eq(storyClaims.storyId, id));
  const updates = await db.select().from(storyUpdates).where(eq(storyUpdates.storyId, id));

  const sourceViews = articles
    .map((article) => {
      const source = allSources.find((item) => item.id === article.sourceId);
      const link = links.find((item) => item.rawArticleId === article.id);
      return {
        id: article.id,
        name: source?.name ?? "Unknown",
        tier: (source?.tier ?? 3) as 0 | 1 | 2 | 3 | 4,
        publishedAt: (article.publishedAt ?? article.fetchedAt).toISOString(),
        url: article.url,
        title: article.title,
        isPrimary: Boolean(link?.isPrimarySource),
        relationship: (link?.relationship ?? "follow") as "origin" | "follow" | "repeat",
      };
    })
    .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));

  const lead = sourceViews.find((item) => item.isPrimary) ?? sourceViews[0];
  const draft = drafts[0];
  const publishedRow = published[0];
  const body =
    publishedRow?.body ?? draft?.body ?? [{ id: "p1", type: "p" as const, text: cluster.summary ?? cluster.workingTitle }];

  return {
    id: cluster.id,
    slug: publishedRow?.slug ?? cluster.slug,
    title: publishedRow?.title ?? cluster.workingTitle,
    dek: publishedRow?.dek ?? cluster.summary ?? "",
    summary: cluster.summary ?? "",
    status: cluster.status as StoryStatus,
    category: (cluster.category as MockStory["category"]) || "technology",
    confidence: cluster.confidence,
    firstSeenAt: cluster.firstSeenAt.toISOString(),
    lastUpdatedAt: cluster.lastUpdatedAt.toISOString(),
    sourceCount: cluster.sourceCount || sourceViews.length,
    leadSource: lead?.name ?? "Wire",
    published: Boolean(publishedRow),
    sources: sourceViews,
    claims: claims.map((claim) => ({
      id: claim.id,
      text: claim.claimText,
      type: claim.claimType,
      status: claim.status as MockStory["claims"][number]["status"],
      excerpt: claim.excerpt ?? "",
      sourceIds: [],
      contradicting: claim.status === "disputed",
    })),
    timeline: updates.map((update) => ({ at: update.createdAt.toISOString(), text: update.summary })),
    brief: {
      confirmed: claims.filter((claim) => claim.status === "confirmed").map((claim) => claim.claimText),
      developing: claims.filter((claim) => claim.status === "unverified" || claim.status === "rumor").map((claim) => claim.claimText),
      contradictions: claims.filter((claim) => claim.status === "disputed").map((claim) => claim.claimText),
    },
    draft: {
      title: draft?.title ?? cluster.workingTitle,
      dek: draft?.dek ?? cluster.summary ?? "",
      body: draft?.body ?? body,
    },
    body,
  };
}
