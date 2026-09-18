"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { assertAdmin, loginAdmin, logoutAdmin } from "@/features/auth/session";
import { ingestAllEnabledFeeds } from "@/features/ingestion/service";
import {
  addFeedToSource,
  createSource,
  deleteSource,
  toggleFeedEnabled,
  toggleSourceEnabled,
  updateSource,
} from "@/features/sources/repository";
import { assertSafeHttpUrl } from "@/lib/security/url";
import { editDraftSegment, generateDraftForStory, verifyDraftClaim } from "@/features/drafts/service";
import { extractClaimsForStory } from "@/features/claims/service";
import { generateStoryBrief } from "@/features/stories/brief";
import { publishDraft } from "@/features/publishing/repository";
import { saveDraft } from "@/features/drafts/repository";
import { getStoryWorkspace } from "@/features/stories/repository";
import type { ArticleBlock } from "@/lib/db/schema";

export async function getStoryWorkspaceAction(storyId: string) {
  await assertAdmin();
  return getStoryWorkspace(storyId);
}

// Auth Actions
export async function loginAction(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const result = await loginAdmin(password);
  if (!result.success) {
    console.error("[Auth] Login failed:", result.error);
    redirect("/newsroom/login?error=invalid");
  }
  redirect("/newsroom");
}

export async function logoutAction() {
  await logoutAdmin();
  redirect("/newsroom/login");
}

// Ingestion Action
export async function fetchSourcesAction() {
  await assertAdmin();
  const results = await ingestAllEnabledFeeds();
  revalidatePath("/newsroom");
  revalidatePath("/newsroom/sources");
  revalidatePath("/");
  revalidatePath("/latest");
  return results;
}

// Source Management Actions
const sourceSchema = z.object({
  name: z.string().min(2).max(80),
  domain: z.string().min(3).max(120),
  url: z.string().url(),
  tier: z.coerce.number().int().min(0).max(4),
  category: z.string().default("technology"),
  feedType: z.string().default("rss"),
});

export async function addSourceAction(formData: FormData) {
  await assertAdmin();
  const parsed = sourceSchema.parse({
    name: formData.get("name"),
    domain: formData.get("domain"),
    url: formData.get("url"),
    tier: formData.get("tier"),
    category: formData.get("category") || "technology",
    feedType: formData.get("feedType") || "rss",
  });

  assertSafeHttpUrl(parsed.url);

  await createSource({
    name: parsed.name,
    domain: parsed.domain,
    tier: parsed.tier,
    category: parsed.category,
    feedUrl: parsed.url,
    feedType: parsed.feedType,
  });

  revalidatePath("/newsroom/sources");
}

export async function updateSourceAction(formData: FormData) {
  await assertAdmin();
  const id = String(formData.get("id"));
  const name = String(formData.get("name"));
  const domain = String(formData.get("domain"));
  const tier = Number(formData.get("tier"));
  const category = String(formData.get("category"));

  await updateSource(id, { name, domain, tier, category });
  revalidatePath("/newsroom/sources");
}

export async function toggleSourceAction(sourceId: string, enabled: boolean) {
  await assertAdmin();
  await toggleSourceEnabled(sourceId, enabled);
  revalidatePath("/newsroom/sources");
}

export async function toggleFeedAction(feedId: string, enabled: boolean) {
  await assertAdmin();
  await toggleFeedEnabled(feedId, enabled);
  revalidatePath("/newsroom/sources");
}

export async function deleteSourceAction(sourceId: string) {
  await assertAdmin();
  await deleteSource(sourceId);
  revalidatePath("/newsroom/sources");
}

export async function addFeedAction(formData: FormData) {
  await assertAdmin();
  const sourceId = String(formData.get("sourceId"));
  const url = String(formData.get("url"));
  const feedType = String(formData.get("feedType") || "rss");

  assertSafeHttpUrl(url);
  await addFeedToSource({ sourceId, url, feedType });
  revalidatePath("/newsroom/sources");
}

// Story Desk Actions
export async function extractClaimsAction(storyId: string) {
  await assertAdmin();
  const claims = await extractClaimsForStory(storyId);
  revalidatePath(`/newsroom/${storyId}`);
  return claims;
}

export async function generateBriefAction(storyId: string) {
  await assertAdmin();
  const brief = await generateStoryBrief(storyId);
  revalidatePath(`/newsroom/${storyId}`);
  revalidatePath("/newsroom");
  return brief;
}

export async function generateDraftAction(storyId: string) {
  await assertAdmin();
  const draft = await generateDraftForStory(storyId);
  revalidatePath(`/newsroom/${storyId}`);
  return draft;
}

export async function saveDraftAction(input: {
  storyId: string;
  draftId?: string;
  title: string;
  dek: string;
  body: ArticleBlock[];
  editorNotes?: string;
}) {
  await assertAdmin();
  const saved = await saveDraft({
    id: input.draftId,
    storyId: input.storyId,
    title: input.title,
    dek: input.dek,
    body: input.body,
    editorNotes: input.editorNotes,
  });
  revalidatePath(`/newsroom/${input.storyId}`);
  return saved;
}

export async function editSegmentAction(draftId: string, blockId: string, action: "shorten" | "make_clearer" | "add_context") {
  await assertAdmin();
  return editDraftSegment(draftId, blockId, action);
}

export async function verifyClaimAction(draftId: string, blockId: string) {
  await assertAdmin();
  return verifyDraftClaim(draftId, blockId);
}

export async function publishStoryAction(draftId: string) {
  await assertAdmin();
  const published = await publishDraft(draftId);
  revalidatePath("/");
  revalidatePath("/latest");
  revalidatePath(`/${published.category}`);
  revalidatePath(`/story/${published.slug}`);
  revalidatePath("/newsroom");
  revalidatePath(`/newsroom/${published.storyId}`);
  return published;
}
