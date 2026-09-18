import "server-only";
import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import {
  draftArticles,
  entities,
  publishedArticles,
  rawArticles,
  sources,
  storyClaimSources,
  storyClaims,
  storyClusters,
  storyEntities,
  storySources,
  storyUpdates,
  type ArticleBlock,
} from "@/lib/db/schema";
import type { ClaimStatus, ClaimSupport, StoryFeedItem, StoryStatus, WorkspaceClaim, WorkspaceSource } from "@/types/domain";

export type StoryClusterRow = typeof storyClusters.$inferSelect;

export async function createStoryCluster(data: typeof storyClusters.$inferInsert): Promise<StoryClusterRow> {
  const db = await getDb();
  const [created] = await db.insert(storyClusters).values(data).returning();
  if (!created) throw new Error("Failed to create story cluster");
  return created;
}

export async function updateStoryCluster(
  id: string,
  data: Partial<typeof storyClusters.$inferInsert>,
) {
  const db = await getDb();
  await db
    .update(storyClusters)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(storyClusters.id, id));
}

export async function attachArticleToStory(input: {
  storyId: string;
  rawArticleId: string;
  relationship: string;
  isPrimarySource?: boolean;
  confidence?: number;
}) {
  const db = await getDb();
  await db
    .insert(storySources)
    .values({
      storyId: input.storyId,
      rawArticleId: input.rawArticleId,
      relationship: input.relationship,
      isPrimarySource: input.isPrimarySource ?? false,
      confidence: input.confidence ?? 0.8,
    })
    .onConflictDoNothing();

  await recountStorySources(input.storyId);
}

export async function recountStorySources(storyId: string) {
  const db = await getDb();
  const rows = await db
    .select({ count: sql<number>`count(*)` })
    .from(storySources)
    .where(eq(storySources.storyId, storyId));
  const count = Number(rows[0]?.count ?? 0);
  await db
    .update(storyClusters)
    .set({ sourceCount: count, lastUpdatedAt: new Date(), updatedAt: new Date() })
    .where(eq(storyClusters.id, storyId));
}

export async function getStoryCluster(id: string): Promise<StoryClusterRow | null> {
  const db = await getDb();
  const [row] = await db.select().from(storyClusters).where(eq(storyClusters.id, id)).limit(1);
  return row ?? null;
}

export async function getStoryClusterBySlug(slug: string): Promise<StoryClusterRow | null> {
  const db = await getDb();
  const [row] = await db.select().from(storyClusters).where(eq(storyClusters.slug, slug)).limit(1);
  return row ?? null;
}

export async function listStoryCandidates(since: Date, limit = 50): Promise<StoryClusterRow[]> {
  const db = await getDb();
  return db
    .select()
    .from(storyClusters)
    .where(gte(storyClusters.lastUpdatedAt, since))
    .orderBy(desc(storyClusters.lastUpdatedAt))
    .limit(limit);
}

export async function listStoryFeed(options: {
  category?: string;
  status?: string;
  limit?: number;
} = {}): Promise<StoryFeedItem[]> {
  const db = await getDb();
  const conditions = [];
  if (options.category) conditions.push(eq(storyClusters.category, options.category));
  if (options.status) conditions.push(eq(storyClusters.status, options.status));

  const query = db
    .select()
    .from(storyClusters)
    .orderBy(desc(storyClusters.lastUpdatedAt))
    .limit(options.limit ?? 80);

  const clusters = conditions.length > 0
    ? await query.where(and(...conditions))
    : await query;

  if (!clusters.length) return [];

  const clusterIds = clusters.map((c) => c.id);
  const links = await db
    .select()
    .from(storySources)
    .where(inArray(storySources.storyId, clusterIds));

  const articleIds = Array.from(new Set(links.map((l) => l.rawArticleId)));
  const articles = articleIds.length
    ? await db.select().from(rawArticles).where(inArray(rawArticles.id, articleIds))
    : [];
  const articleMap = new Map(articles.map((a) => [a.id, a]));

  const sourceIds = Array.from(new Set(articles.map((a) => a.sourceId)));
  const allSources = sourceIds.length
    ? await db.select().from(sources).where(inArray(sources.id, sourceIds))
    : [];
  const sourceMap = new Map(allSources.map((s) => [s.id, s]));

  return clusters.map((c) => {
    const clusterLinks = links.filter((l) => l.storyId === c.id);
    const primaryLink = clusterLinks.find((l) => l.isPrimarySource) ?? clusterLinks[0];
    let leadSourceName: string | null = null;
    if (primaryLink) {
      const art = articleMap.get(primaryLink.rawArticleId);
      if (art) {
        const src = sourceMap.get(art.sourceId);
        leadSourceName = src?.name ?? null;
      }
    }

    return {
      id: c.id,
      workingTitle: c.workingTitle,
      status: c.status as StoryStatus,
      category: c.category,
      sourceCount: c.sourceCount,
      lastUpdatedAt: c.lastUpdatedAt.toISOString(),
      firstSeenAt: c.firstSeenAt.toISOString(),
      confidence: c.confidence,
      leadSourceName,
    };
  });
}

export type HydratedWorkspace = {
  id: string;
  slug: string;
  title: string;
  dek: string;
  summary: string;
  status: StoryStatus;
  category: string;
  confidence: number;
  firstSeenAt: string;
  lastUpdatedAt: string;
  sourceCount: number;
  leadSource: string;
  published: boolean;
  publishedSlug?: string;
  sources: Array<{
    id: string;
    name: string;
    tier: number;
    publishedAt: string;
    url: string;
    title: string;
    isPrimary: boolean;
    relationship: string;
    excerpt?: string | null;
  }>;
  claims: Array<{
    id: string;
    text: string;
    type: string;
    status: ClaimStatus;
    excerpt: string;
    sourceIds: string[];
    contradicting: boolean;
    confidence: number;
  }>;
  brief: {
    confirmed: string[];
    developing: string[];
    contradictions: string[];
  };
  timeline: Array<{ at: string; text: string }>;
  draft: {
    id?: string;
    title: string;
    dek: string;
    body: ArticleBlock[];
    status: string;
  };
  body: ArticleBlock[];
};

export async function getStoryWorkspace(id: string): Promise<HydratedWorkspace | null> {
  const db = await getDb();
  const [cluster] = await db.select().from(storyClusters).where(eq(storyClusters.id, id)).limit(1);
  if (!cluster) return null;

  const links = await db.select().from(storySources).where(eq(storySources.storyId, id));
  const articleIds = links.map((l) => l.rawArticleId);
  const articles = articleIds.length
    ? await db.select().from(rawArticles).where(inArray(rawArticles.id, articleIds))
    : [];

  const sourceIds = Array.from(new Set(articles.map((a) => a.sourceId)));
  const sourceRows = sourceIds.length
    ? await db.select().from(sources).where(inArray(sources.id, sourceIds))
    : [];
  const sourceMap = new Map(sourceRows.map((s) => [s.id, s]));

  const [published] = await db.select().from(publishedArticles).where(eq(publishedArticles.storyId, id)).limit(1);
  const [draft] = await db.select().from(draftArticles).where(eq(draftArticles.storyId, id)).limit(1);
  const claims = await db.select().from(storyClaims).where(eq(storyClaims.storyId, id));
  const claimIds = claims.map((c) => c.id);

  const claimSources = claimIds.length
    ? await db.select().from(storyClaimSources).where(inArray(storyClaimSources.claimId, claimIds))
    : [];

  const updates = await db.select().from(storyUpdates).where(eq(storyUpdates.storyId, id)).orderBy(storyUpdates.createdAt);

  const sourceViews = articles
    .map((article) => {
      const source = sourceMap.get(article.sourceId);
      const link = links.find((l) => l.rawArticleId === article.id);
      return {
        id: article.id,
        name: source?.name ?? "Unknown",
        tier: source?.tier ?? 3,
        publishedAt: (article.publishedAt ?? article.fetchedAt).toISOString(),
        url: article.url,
        title: article.title,
        isPrimary: Boolean(link?.isPrimarySource),
        relationship: link?.relationship ?? "follow",
        excerpt: article.excerpt,
      };
    })
    .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));

  const lead = sourceViews.find((item) => item.isPrimary) ?? sourceViews[0];

  const defaultBody: ArticleBlock[] = [
    { id: "p-1", type: "p", text: cluster.summary ?? cluster.workingTitle },
  ];

  const body = published?.body ?? draft?.body ?? defaultBody;

  const workspaceClaims = claims.map((claim) => {
    const supportedSources = claimSources
      .filter((cs) => cs.claimId === claim.id)
      .map((cs) => cs.rawArticleId);

    return {
      id: claim.id,
      text: claim.claimText,
      type: claim.claimType,
      status: claim.status as ClaimStatus,
      excerpt: claim.excerpt ?? "",
      sourceIds: supportedSources.length > 0 ? supportedSources : sourceViews.map((s) => s.id),
      contradicting: claim.status === "disputed",
      confidence: claim.confidence,
    };
  });

  return {
    id: cluster.id,
    slug: cluster.slug,
    title: published?.title ?? draft?.title ?? cluster.workingTitle,
    dek: published?.dek ?? draft?.dek ?? cluster.summary ?? "",
    summary: cluster.summary ?? "",
    status: cluster.status as StoryStatus,
    category: cluster.category,
    confidence: cluster.confidence,
    firstSeenAt: cluster.firstSeenAt.toISOString(),
    lastUpdatedAt: cluster.lastUpdatedAt.toISOString(),
    sourceCount: cluster.sourceCount || sourceViews.length,
    leadSource: lead?.name ?? "Wire",
    published: Boolean(published),
    publishedSlug: published?.slug,
    sources: sourceViews,
    claims: workspaceClaims,
    brief: {
      confirmed: claims.filter((c) => c.status === "confirmed").map((c) => c.claimText),
      developing: claims.filter((c) => c.status === "unverified" || c.status === "rumor").map((c) => c.claimText),
      contradictions: claims.filter((c) => c.status === "disputed").map((c) => c.claimText),
    },
    timeline: updates.map((u) => ({ at: u.createdAt.toISOString(), text: u.summary })),
    draft: {
      id: draft?.id,
      title: draft?.title ?? cluster.workingTitle,
      dek: draft?.dek ?? cluster.summary ?? "",
      body: draft?.body ?? body,
      status: draft?.status ?? "draft",
    },
    body,
  };
}

export async function attachEntityToStory(storyId: string, entityId: string, salience = 1) {
  const db = await getDb();
  await db
    .insert(storyEntities)
    .values({ storyId, entityId, salience })
    .onConflictDoNothing();
}

export async function getStoryEntities(storyId: string) {
  const db = await getDb();
  const rows = await db
    .select({
      entityId: storyEntities.entityId,
      name: entities.name,
      type: entities.type,
      canonicalKey: entities.canonicalKey,
      salience: storyEntities.salience,
    })
    .from(storyEntities)
    .innerJoin(entities, eq(entities.id, storyEntities.entityId))
    .where(eq(storyEntities.storyId, storyId));
  return rows;
}

export async function addStoryUpdate(storyId: string, updateType: string, summary: string) {
  const db = await getDb();
  const id = crypto.randomUUID();
  await db.insert(storyUpdates).values({
    id,
    storyId,
    updateType,
    summary,
    createdAt: new Date(),
  });
  return id;
}
