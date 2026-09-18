import { clusteringConfig } from "@/lib/config/env";
import { jaccard, titleTokens } from "@/lib/parsing/title";

export function cosineSimilarity(a: number[] | null | undefined, b: number[] | null | undefined) {
  if (!a?.length || !b?.length || a.length !== b.length) return null;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i += 1) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    dot += av * bv;
    na += av * av;
    nb += bv * bv;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export function temporalScore(articleTime: Date, clusterTime: Date, windowHours = clusteringConfig.recentWindowHours) {
  const hours = Math.abs(articleTime.getTime() - clusterTime.getTime()) / 3_600_000;
  if (hours > windowHours) return 0;
  return 1 - hours / windowHours;
}

export function entityOverlap(a: string[], b: string[]) {
  return jaccard(a, b);
}

export function categoryScore(a: string, b: string) {
  return a === b ? 1 : 0;
}

export function clusterScore(input: {
  embeddingSimilarity: number | null;
  entityOverlap: number;
  temporalScore: number;
  categoryScore: number;
  titleSimilarity: number;
}) {
  const semantic = input.embeddingSimilarity ?? input.titleSimilarity;
  return (
    semantic * clusteringConfig.embeddingWeight +
    input.entityOverlap * clusteringConfig.entityWeight +
    input.temporalScore * clusteringConfig.temporalWeight +
    input.categoryScore * clusteringConfig.categoryWeight
  );
}

export function looksLikeChildUpdate(title: string) {
  const tokens = titleTokens(title);
  return clusteringConfig.childUpdateTitleHints.some((hint) => {
    const stemmedHint = hint.replace(/(ing|ed|es|s)$/, "");
    return tokens.some(
      (token) =>
        token === hint ||
        token === stemmedHint ||
        token.startsWith(stemmedHint) ||
        stemmedHint.startsWith(token)
    );
  });
}

export type MatchDecision = "attach" | "create" | "ambiguous" | "child";

export function decideMatch(score: number, title: string): MatchDecision {
  if (score >= clusteringConfig.attachThreshold) {
    return looksLikeChildUpdate(title) ? "child" : "attach";
  }
  if (score >= clusteringConfig.ambiguousLow && score < clusteringConfig.ambiguousHigh) {
    return "ambiguous";
  }
  return "create";
}

export function titleSimilarity(a: string, b: string) {
  return jaccard(titleTokens(a), titleTokens(b));
}
