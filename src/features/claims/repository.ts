import "server-only";
import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { storyClaimSources, storyClaims } from "@/lib/db/schema";
import type { ClaimStatus, ClaimSupport } from "@/types/domain";

export type ClaimInput = {
  text: string;
  type: string;
  confidence: number;
  status: ClaimStatus;
  excerpt?: string | null;
  sourceArticleIds?: string[];
  supportType?: ClaimSupport;
};

export async function replaceStoryClaims(storyId: string, claims: ClaimInput[]) {
  const db = await getDb();

  // Delete existing claim links and claims for story
  const existingClaims = await db
    .select({ id: storyClaims.id })
    .from(storyClaims)
    .where(eq(storyClaims.storyId, storyId));

  if (existingClaims.length > 0) {
    const ids = existingClaims.map((c) => c.id);
    await db.delete(storyClaimSources).where(inArray(storyClaimSources.claimId, ids));
    await db.delete(storyClaims).where(eq(storyClaims.storyId, storyId));
  }

  const now = new Date();
  for (const claim of claims) {
    const claimId = crypto.randomUUID();
    await db.insert(storyClaims).values({
      id: claimId,
      storyId,
      claimText: claim.text,
      claimType: claim.type,
      confidence: claim.confidence,
      status: claim.status,
      firstSeenAt: now,
      excerpt: claim.excerpt ?? null,
    });

    if (claim.sourceArticleIds && claim.sourceArticleIds.length > 0) {
      for (const articleId of claim.sourceArticleIds) {
        await db
          .insert(storyClaimSources)
          .values({
            claimId,
            rawArticleId: articleId,
            supportType: claim.supportType ?? (claim.status === "disputed" ? "contradicts" : "supports"),
          })
          .onConflictDoNothing();
      }
    }
  }
}

export async function getStoryClaims(storyId: string) {
  const db = await getDb();
  const claims = await db
    .select()
    .from(storyClaims)
    .where(eq(storyClaims.storyId, storyId));

  const claimIds = claims.map((c) => c.id);
  const sources = claimIds.length
    ? await db.select().from(storyClaimSources).where(inArray(storyClaimSources.claimId, claimIds))
    : [];

  return claims.map((claim) => ({
    ...claim,
    sources: sources.filter((s) => s.claimId === claim.id),
  }));
}

export async function updateClaimStatus(claimId: string, status: ClaimStatus) {
  const db = await getDb();
  await db.update(storyClaims).set({ status }).where(eq(storyClaims.id, claimId));
}
