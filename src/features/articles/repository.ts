import "server-only";
import { and, desc, eq, or } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { rawArticles, sources } from "@/lib/db/schema";

export type RawArticleRow = typeof rawArticles.$inferSelect;
export type InsertRawArticleInput = typeof rawArticles.$inferInsert;

export async function findDuplicateArticle(params: {
  canonicalUrl: string;
  sourceId: string;
  externalId?: string | null;
  contentHash?: string | null;
}): Promise<RawArticleRow | null> {
  const db = await getDb();
  // Check canonical URL match
  const [byCanonical] = await db
    .select()
    .from(rawArticles)
    .where(eq(rawArticles.canonicalUrl, params.canonicalUrl))
    .limit(1);
  if (byCanonical) return byCanonical;

  // Check sourceId + externalId
  if (params.externalId) {
    const [byExternal] = await db
      .select()
      .from(rawArticles)
      .where(
        and(
          eq(rawArticles.sourceId, params.sourceId),
          eq(rawArticles.externalId, params.externalId),
        ),
      )
      .limit(1);
    if (byExternal) return byExternal;
  }

  // Check contentHash
  if (params.contentHash) {
    const [byHash] = await db
      .select()
      .from(rawArticles)
      .where(eq(rawArticles.contentHash, params.contentHash))
      .limit(1);
    if (byHash) return byHash;
  }

  return null;
}

export async function insertRawArticle(data: InsertRawArticleInput): Promise<RawArticleRow> {
  const db = await getDb();
  const [created] = await db.insert(rawArticles).values(data).returning();
  if (!created) throw new Error("Failed to insert raw article");
  return created;
}

export async function getRawArticle(id: string): Promise<(RawArticleRow & { source: typeof sources.$inferSelect }) | null> {
  const db = await getDb();
  const [article] = await db.select().from(rawArticles).where(eq(rawArticles.id, id)).limit(1);
  if (!article) return null;
  const [source] = await db.select().from(sources).where(eq(sources.id, article.sourceId)).limit(1);
  if (!source) return null;
  return { ...article, source };
}

export async function listUnclusteredArticles(limit = 50): Promise<RawArticleRow[]> {
  const db = await getDb();
  return db
    .select()
    .from(rawArticles)
    .where(eq(rawArticles.ingestionStatus, "stored"))
    .orderBy(rawArticles.fetchedAt)
    .limit(limit);
}

export async function markArticleClustered(id: string) {
  const db = await getDb();
  await db
    .update(rawArticles)
    .set({ ingestionStatus: "clustered" })
    .where(eq(rawArticles.id, id));
}

export async function markArticleFailed(id: string) {
  const db = await getDb();
  await db
    .update(rawArticles)
    .set({ ingestionStatus: "failed" })
    .where(eq(rawArticles.id, id));
}

export async function updateRawArticleFullContent(
  id: string,
  data: {
    bodyText?: string;
    author?: string | null;
    imageUrl?: string | null;
    publishedAt?: Date | null;
    canonicalUrl?: string;
    citedSourceUrl?: string | null;
  },
) {
  const db = await getDb();
  await db.update(rawArticles).set(data).where(eq(rawArticles.id, id));
}

export async function updateArticleEmbedding(id: string, embedding: number[]) {
  const db = await getDb();
  await db.update(rawArticles).set({ embedding }).where(eq(rawArticles.id, id));
}
