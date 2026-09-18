import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { draftArticles, type ArticleBlock } from "@/lib/db/schema";

export type DraftRow = typeof draftArticles.$inferSelect;

export async function getDraftForStory(storyId: string): Promise<DraftRow | null> {
  const db = await getDb();
  const [draft] = await db.select().from(draftArticles).where(eq(draftArticles.storyId, storyId)).limit(1);
  return draft ?? null;
}

export async function getDraftById(id: string): Promise<DraftRow | null> {
  const db = await getDb();
  const [draft] = await db.select().from(draftArticles).where(eq(draftArticles.id, id)).limit(1);
  return draft ?? null;
}

export async function saveDraft(input: {
  id?: string;
  storyId: string;
  title: string;
  dek: string;
  body: ArticleBlock[];
  editorNotes?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  editorialProfileId?: string | null;
  status?: string;
}): Promise<DraftRow> {
  const db = await getDb();
  const existing = input.id
    ? await getDraftById(input.id)
    : await getDraftForStory(input.storyId);

  const now = new Date();

  if (existing) {
    const [updated] = await db
      .update(draftArticles)
      .set({
        title: input.title,
        dek: input.dek,
        body: input.body,
        editorNotes: input.editorNotes !== undefined ? input.editorNotes : existing.editorNotes,
        seoTitle: input.seoTitle !== undefined ? input.seoTitle : existing.seoTitle,
        seoDescription: input.seoDescription !== undefined ? input.seoDescription : existing.seoDescription,
        editorialProfileId: input.editorialProfileId !== undefined ? input.editorialProfileId : existing.editorialProfileId,
        status: input.status ?? existing.status,
        reviewedAt: now,
      })
      .where(eq(draftArticles.id, existing.id))
      .returning();
    if (!updated) throw new Error("Failed to update draft article");
    return updated;
  }

  const id = input.id || `draft-${crypto.randomUUID()}`;
  const [created] = await db
    .insert(draftArticles)
    .values({
      id,
      storyId: input.storyId,
      title: input.title,
      dek: input.dek,
      body: input.body,
      status: input.status || "draft",
      generatedAt: now,
      reviewedAt: now,
      editorNotes: input.editorNotes || null,
      seoTitle: input.seoTitle || null,
      seoDescription: input.seoDescription || null,
      editorialProfileId: input.editorialProfileId || null,
    })
    .returning();
  if (!created) throw new Error("Failed to create draft article");
  return created;
}

export async function updateDraftBlock(draftId: string, blockId: string, text: string): Promise<DraftRow | null> {
  const db = await getDb();
  const draft = await getDraftById(draftId);
  if (!draft) return null;

  const newBody = draft.body.map((block) =>
    block.id === blockId ? { ...block, text } : block,
  );

  const [updated] = await db
    .update(draftArticles)
    .set({ body: newBody, reviewedAt: new Date() })
    .where(eq(draftArticles.id, draftId))
    .returning();
  return updated ?? null;
}
