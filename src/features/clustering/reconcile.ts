import { desc, eq, gte } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import {
  draftArticles,
  publishedArticles,
  storyClaims,
  storyClusters,
  storyEntities,
  storySources,
  storyUpdates,
} from "@/lib/db/schema";
import { eventAgreement, distinctiveMismatch, scoreBreakdown, titleSimilarity } from "@/features/clustering/score";
import { recountStorySources } from "@/features/stories/repository";

export type DuplicateClusterPair = {
  keepId: string;
  mergeId: string;
  keepTitle: string;
  mergeTitle: string;
  score: number;
  eventAgreement: number;
  recommended: boolean;
};

export async function findLikelyDuplicateClusters(limit = 80): Promise<DuplicateClusterPair[]> {
  const db = await getDb();
  const since = new Date(Date.now() - 14 * 24 * 3_600_000);
  const clusters = await db
    .select()
    .from(storyClusters)
    .where(gte(storyClusters.lastUpdatedAt, since))
    .orderBy(desc(storyClusters.lastUpdatedAt))
    .limit(limit);

  const pairs: DuplicateClusterPair[] = [];
  for (let i = 0; i < clusters.length; i += 1) {
    for (let j = i + 1; j < clusters.length; j += 1) {
      const a = clusters[i]!;
      const b = clusters[j]!;
      const agreement = eventAgreement(a.workingTitle, b.workingTitle);
      const tSim = titleSimilarity(a.workingTitle, b.workingTitle);
      const mismatch = distinctiveMismatch(a.workingTitle, b.workingTitle);
      const breakdown = scoreBreakdown({
        embeddingSimilarity: null,
        titleSimilarity: tSim,
        entityOverlap: 0.5,
        temporalScore: 0.7,
        categoryScore: a.category === b.category ? 1 : 0.45,
        eventAgreement: agreement,
        distinctiveMismatch: mismatch,
      });
      if (breakdown.finalScore < 0.7) continue;
      const keep = a.firstSeenAt <= b.firstSeenAt ? a : b;
      const merge = keep.id === a.id ? b : a;
      pairs.push({
        keepId: keep.id,
        mergeId: merge.id,
        keepTitle: keep.workingTitle,
        mergeTitle: merge.workingTitle,
        score: breakdown.finalScore,
        eventAgreement: agreement,
        recommended: breakdown.finalScore >= 0.78 && agreement > 0 && mismatch === 0 && tSim >= 0.5,
      });
    }
  }
  return pairs.sort((a, b) => b.score - a.score);
}

export async function mergeStoryClusters(keepId: string, mergeId: string) {
  if (keepId === mergeId) return keepId;
  const db = await getDb();
  const links = await db.select().from(storySources).where(eq(storySources.storyId, mergeId));
  for (const link of links) {
    await db
      .insert(storySources)
      .values({ ...link, storyId: keepId })
      .onConflictDoNothing();
  }
  await db.delete(storySources).where(eq(storySources.storyId, mergeId));

  const ents = await db.select().from(storyEntities).where(eq(storyEntities.storyId, mergeId));
  for (const ent of ents) {
    await db
      .insert(storyEntities)
      .values({ ...ent, storyId: keepId })
      .onConflictDoNothing();
  }
  await db.delete(storyEntities).where(eq(storyEntities.storyId, mergeId));

  await db.update(storyClaims).set({ storyId: keepId }).where(eq(storyClaims.storyId, mergeId));
  await db.update(storyUpdates).set({ storyId: keepId }).where(eq(storyUpdates.storyId, mergeId));
  await db.update(draftArticles).set({ storyId: keepId }).where(eq(draftArticles.storyId, mergeId));
  await db.update(publishedArticles).set({ storyId: keepId }).where(eq(publishedArticles.storyId, mergeId));
  await db.delete(storyClusters).where(eq(storyClusters.id, mergeId));
  await recountStorySources(keepId);
  return keepId;
}

export async function reconcileHighConfidenceDuplicates() {
  const pairs = await findLikelyDuplicateClusters();
  const merged: DuplicateClusterPair[] = [];
  const used = new Set<string>();
  for (const pair of pairs) {
    if (!pair.recommended) continue;
    if (used.has(pair.keepId) || used.has(pair.mergeId)) continue;
    await mergeStoryClusters(pair.keepId, pair.mergeId);
    used.add(pair.keepId);
    used.add(pair.mergeId);
    merged.push(pair);
  }
  return { considered: pairs, merged };
}
