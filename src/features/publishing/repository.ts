import "server-only";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import {
  draftArticles,
  publishedArticles,
  rawArticles,
  sources,
  storyClusters,
  storySources,
  type ArticleBlock,
} from "@/lib/db/schema";
import { slugify } from "@/lib/utils";
import { getDraftById } from "@/features/drafts/repository";

export type PublishedArticleRow = typeof publishedArticles.$inferSelect;

export type PublicStoryView = {
  id: string;
  storyId: string;
  slug: string;
  title: string;
  dek: string;
  body: ArticleBlock[];
  category: string;
  publishedAt: string;
  updatedAt: string;
  seoTitle: string | null;
  seoDescription: string | null;
  status: string;
  sourceCount: number;
  leadSource: string;
  heroImage?: string | null;
  sources: Array<{
    id: string;
    name: string;
    tier: number;
    publishedAt: string;
    url: string;
    title: string;
    isPrimary: boolean;
    relationship: string;
  }>;
};

export async function generateUniqueSlug(baseTitle: string, excludeSlug?: string): Promise<string> {
  const db = await getDb();
  let base = slugify(baseTitle);
  if (!base) base = "story";

  const [existing] = await db
    .select({ slug: publishedArticles.slug })
    .from(publishedArticles)
    .where(eq(publishedArticles.slug, base))
    .limit(1);

  if (!existing || existing.slug === excludeSlug) {
    return base;
  }

  // Append short random suffix
  for (let i = 1; i <= 20; i++) {
    const candidate = `${base}-${crypto.randomUUID().slice(0, 4)}`;
    const [match] = await db
      .select({ slug: publishedArticles.slug })
      .from(publishedArticles)
      .where(eq(publishedArticles.slug, candidate))
      .limit(1);
    if (!match) return candidate;
  }

  return `${base}-${Date.now()}`;
}

export async function publishDraft(
  draftId: string,
  options: { customSlug?: string } = {},
): Promise<PublishedArticleRow> {
  const db = await getDb();
  const draft = await getDraftById(draftId);
  if (!draft) throw new Error("Draft not found");

  const [cluster] = await db
    .select()
    .from(storyClusters)
    .where(eq(storyClusters.id, draft.storyId))
    .limit(1);
  if (!cluster) throw new Error("Story cluster not found");

  // Check if article is already published for this story
  const [existingPublished] = await db
    .select()
    .from(publishedArticles)
    .where(eq(publishedArticles.storyId, draft.storyId))
    .limit(1);

  const slug = options.customSlug
    ? slugify(options.customSlug)
    : existingPublished?.slug ?? (await generateUniqueSlug(draft.title));

  const now = new Date();
  const searchText = [
    draft.title,
    draft.dek,
    draft.body.map((b) => b.text).join(" "),
  ].join(" ").toLowerCase();

  let published: PublishedArticleRow;

  if (existingPublished) {
    const [updated] = await db
      .update(publishedArticles)
      .set({
        draftId: draft.id,
        title: draft.title,
        dek: draft.dek,
        body: draft.body,
        updatedAt: now,
        seoTitle: draft.seoTitle || draft.title,
        seoDescription: draft.seoDescription || draft.dek,
        category: cluster.category,
        searchText,
      })
      .where(eq(publishedArticles.id, existingPublished.id))
      .returning();
    if (!updated) throw new Error("Failed to update published article");
    published = updated;
  } else {
    const [created] = await db
      .insert(publishedArticles)
      .values({
        id: `pub-${crypto.randomUUID()}`,
        draftId: draft.id,
        storyId: draft.storyId,
        slug,
        title: draft.title,
        dek: draft.dek,
        body: draft.body,
        heroImage: draft.heroImage,
        publishedAt: now,
        updatedAt: now,
        seoTitle: draft.seoTitle || draft.title,
        seoDescription: draft.seoDescription || draft.dek,
        category: cluster.category,
        searchText,
      })
      .returning();
    if (!created) throw new Error("Failed to create published article");
    published = created;
  }

  // Update story cluster and draft status
  await db
    .update(storyClusters)
    .set({
      status: "published",
      updatedAt: now,
      lastUpdatedAt: now,
    })
    .where(eq(storyClusters.id, draft.storyId));

  await db
    .update(draftArticles)
    .set({ status: "published" })
    .where(eq(draftArticles.id, draft.id));

  return published;
}

export async function listPublishedArticles(
  categoryOrOptions?: string | { category?: string; limit?: number },
  limit = 40,
): Promise<PublicStoryView[]> {
  const db = await getDb();
  let category: string | undefined;
  let maxLimit = limit;

  if (typeof categoryOrOptions === "object" && categoryOrOptions !== null) {
    category = categoryOrOptions.category;
    maxLimit = categoryOrOptions.limit ?? limit;
  } else {
    category = categoryOrOptions;
  }

  const query = db
    .select()
    .from(publishedArticles)
    .orderBy(desc(publishedArticles.publishedAt))
    .limit(maxLimit);

  const rows = category
    ? await query.where(eq(publishedArticles.category, category))
    : await query;

  if (rows.length === 0) return [];

  const storyIds = rows.map((r) => r.storyId);
  const clusters = await db
    .select()
    .from(storyClusters)
    .where(or(...storyIds.map((id) => eq(storyClusters.id, id))));
  const clusterMap = new Map(clusters.map((c) => [c.id, c]));

  const links = await db
    .select()
    .from(storySources)
    .where(or(...storyIds.map((id) => eq(storySources.storyId, id))));

  const articleIds = Array.from(new Set(links.map((l) => l.rawArticleId)));
  const articles = articleIds.length
    ? await db.select().from(rawArticles).where(or(...articleIds.map((id) => eq(rawArticles.id, id))))
    : [];
  const articleMap = new Map(articles.map((a) => [a.id, a]));

  const sourceIds = Array.from(new Set(articles.map((a) => a.sourceId)));
  const sourceRows = sourceIds.length
    ? await db.select().from(sources).where(or(...sourceIds.map((id) => eq(sources.id, id))))
    : [];
  const sourceMap = new Map(sourceRows.map((s) => [s.id, s]));

  return rows.map((row) => {
    const cluster = clusterMap.get(row.storyId);
    const storyLinks = links.filter((l) => l.storyId === row.storyId);

    const sourcesList = storyLinks
      .map((link) => {
        const art = articleMap.get(link.rawArticleId);
        const src = art ? sourceMap.get(art.sourceId) : null;
        return {
          id: art?.id ?? link.rawArticleId,
          name: src?.name ?? "Source",
          tier: src?.tier ?? 3,
          publishedAt: (art?.publishedAt ?? art?.fetchedAt ?? new Date()).toISOString(),
          url: art?.url ?? "#",
          title: art?.title ?? "Article",
          isPrimary: link.isPrimarySource,
          relationship: link.relationship,
        };
      })
      .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));

    const lead = sourcesList.find((s) => s.isPrimary) ?? sourcesList[0];

    return {
      id: row.id,
      storyId: row.storyId,
      slug: row.slug,
      title: row.title,
      dek: row.dek,
      body: row.body,
      category: row.category,
      publishedAt: row.publishedAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      seoTitle: row.seoTitle,
      seoDescription: row.seoDescription,
      status: cluster?.status ?? "published",
      sourceCount: cluster?.sourceCount || sourcesList.length,
      leadSource: lead?.name ?? "Wire",
      heroImage: row.heroImage?.url ?? null,
      sources: sourcesList,
    };
  });
}

export async function getPublishedArticleBySlug(slug: string): Promise<PublicStoryView | null> {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(publishedArticles)
    .where(eq(publishedArticles.slug, slug))
    .limit(1);
  if (!row) return null;

  const [cluster] = await db
    .select()
    .from(storyClusters)
    .where(eq(storyClusters.id, row.storyId))
    .limit(1);

  const links = await db
    .select()
    .from(storySources)
    .where(eq(storySources.storyId, row.storyId));

  const articleIds = links.map((l) => l.rawArticleId);
  const articles = articleIds.length
    ? await db.select().from(rawArticles).where(or(...articleIds.map((id) => eq(rawArticles.id, id))))
    : [];
  const articleMap = new Map(articles.map((a) => [a.id, a]));

  const sourceIds = Array.from(new Set(articles.map((a) => a.sourceId)));
  const sourceRows = sourceIds.length
    ? await db.select().from(sources).where(or(...sourceIds.map((id) => eq(sources.id, id))))
    : [];
  const sourceMap = new Map(sourceRows.map((s) => [s.id, s]));

  const sourcesList = links
    .map((link) => {
      const art = articleMap.get(link.rawArticleId);
      const src = art ? sourceMap.get(art.sourceId) : null;
      return {
        id: art?.id ?? link.rawArticleId,
        name: src?.name ?? "Source",
        tier: src?.tier ?? 3,
        publishedAt: (art?.publishedAt ?? art?.fetchedAt ?? new Date()).toISOString(),
        url: art?.url ?? "#",
        title: art?.title ?? "Article",
        isPrimary: link.isPrimarySource,
        relationship: link.relationship,
      };
    })
    .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));

  const lead = sourcesList.find((s) => s.isPrimary) ?? sourcesList[0];

  return {
    id: row.id,
    storyId: row.storyId,
    slug: row.slug,
    title: row.title,
    dek: row.dek,
    body: row.body,
    category: row.category,
    publishedAt: row.publishedAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    status: cluster?.status ?? "published",
    sourceCount: cluster?.sourceCount || sourcesList.length,
    leadSource: lead?.name ?? "Wire",
    heroImage: row.heroImage?.url ?? null,
    sources: sourcesList,
  };
}

export async function searchPublishedArticles(query: string, limit = 20): Promise<PublicStoryView[]> {
  const needle = query.trim().toLowerCase();
  if (!needle) return listPublishedArticles(undefined, limit);

  const db = await getDb();
  const pattern = `%${needle}%`;
  const rows = await db
    .select()
    .from(publishedArticles)
    .where(
      or(
        ilike(publishedArticles.title, pattern),
        ilike(publishedArticles.dek, pattern),
        ilike(publishedArticles.searchText, pattern),
      ),
    )
    .orderBy(desc(publishedArticles.publishedAt))
    .limit(limit);

  if (rows.length === 0) return [];
  return listPublishedArticles(undefined, limit).then((all) => {
    const rowIds = new Set(rows.map((r) => r.id));
    return all.filter((item) => rowIds.has(item.id));
  });
}
