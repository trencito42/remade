import { clusteringConfig } from "@/lib/config/env";
import { charNgrams, dice, jaccard, titleTokens } from "@/lib/parsing/title";

export const EVENT_FAMILIES: Record<string, string[]> = {
  delay: ["delay", "delayed", "postpone", "postponed", "pushed", "slip"],
  announce: ["announce", "announc", "unveil", "reveal", "launch", "release", "introduc"],
  acquire: ["acquir", "acquisition", "buy", "bought", "merger", "purchase", "takeover"],
  price: ["price", "msrp", "priced", "costing"],
  leak: ["leak", "leaked", "rumor", "rumour"],
  lawsuit: ["lawsuit", "sue", "sued", "settlement", "litigation"],
  layoff: ["layoff", "layoffs", "workforce", "jobs"],
  update: ["update", "patch", "hotfix", "changelog"],
  shutdown: ["shutdown", "shutter", "discontinu"],
  partnership: ["partner", "partnership", "alliance"],
  ban: ["ban", "banned"],
  breach: ["breach", "hacked", "cyberattack", "ransomware"],
  funding: ["funding", "raises", "raised", "investment"],
};

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
  if (a === b) return 1;
  return 0.45;
}

export function eventFamilies(title: string): string[] {
  const tokens = titleTokens(title);
  const matched: string[] = [];
  for (const [family, words] of Object.entries(EVENT_FAMILIES)) {
    const forms = new Set(words.flatMap((word) => [word, ...titleTokens(word)]));
    if (tokens.some((token) => forms.has(token) || [...forms].some((form) => form.length >= 4 && (token.startsWith(form) || form.startsWith(token))))) {
      matched.push(family);
    }
  }
  return matched;
}

export function eventAgreement(titleA: string, titleB: string): number {
  const a = eventFamilies(titleA);
  const b = eventFamilies(titleB);
  if (a.length === 0 || b.length === 0) return 0;
  const shared = a.filter((family) => b.includes(family));
  if (shared.length > 0) return 1;
  return -1;
}

export function titleSimilarity(a: string, b: string) {
  const ta = titleTokens(a);
  const tb = titleTokens(b);
  const token = Math.max(jaccard(ta, tb), dice(ta, tb));
  const ngram = jaccard(charNgrams(a), charNgrams(b));
  const rareA = ta.filter((token) => token.length >= 4 || /\d/.test(token));
  const rareB = tb.filter((token) => token.length >= 4 || /\d/.test(token));
  const rare = rareA.length && rareB.length ? dice(rareA, rareB) : 0;
  const numericA = ta.filter((token) => /\d/.test(token));
  const numericB = tb.filter((token) => /\d/.test(token));
  const numeric = numericA.length && numericB.length ? dice(numericA, numericB) : 0;
  let score = clamp(0.5 * token + 0.15 * ngram + 0.2 * rare + 0.15 * numeric);
  const longShared = rareA.filter((item) => rareB.includes(item) && item.length >= 8).length;
  if (longShared >= 1 && rare >= 0.45) {
    score = Math.max(score, 0.62);
  }
  if (token >= 0.72) {
    score = Math.max(score, 0.78);
  }
  if (numericA.length && numericB.length && numeric === 0) {
    score = Math.min(score, 0.34);
  }
  return score;
}

export function distinctiveMismatch(titleA: string, titleB: string) {
  const eventWords = new Set(Object.values(EVENT_FAMILIES).flatMap((words) => words.flatMap((word) => titleTokens(word))));
  const generic = new Set(["today", "official", "report", "says", "year", "week"]);
  const tokensA = titleTokens(titleA);
  const tokensB = titleTokens(titleB);
  const sharedBrand = tokensA[0] && tokensA[0] === tokensB[0] ? tokensA[0] : null;
  const filter = (tokens: string[]) =>
    tokens.filter(
      (token) =>
        token.length >= 3 &&
        token !== sharedBrand &&
        !eventWords.has(token) &&
        !generic.has(token),
    );
  const a = filter(tokensA);
  const b = filter(tokensB);
  if (!a.length || !b.length) return 0;
  const shared = a.filter((token) => b.includes(token));
  if (shared.length > 0) return 0;
  return 1;
}

export type ScoreInput = {
  embeddingSimilarity: number | null;
  entityOverlap: number;
  temporalScore: number;
  categoryScore: number;
  titleSimilarity: number;
  eventAgreement?: number;
  distinctiveMismatch?: number;
};

export type ScoreBreakdown = {
  embeddingAvailable: boolean;
  embeddingSimilarity: number | null;
  titleSimilarity: number;
  entityOverlap: number;
  temporalScore: number;
  categoryScore: number;
  eventAgreement: number;
  finalScore: number;
  weights: Record<string, number>;
};

function weightsFor(embeddingAvailable: boolean) {
  if (embeddingAvailable) return clusteringConfig.weightsWithEmbeddings;
  return clusteringConfig.weightsWithoutEmbeddings;
}

export function scoreBreakdown(input: ScoreInput): ScoreBreakdown {
  const embeddingAvailable = input.embeddingSimilarity != null;
  const weights = weightsFor(embeddingAvailable);
  const event = input.eventAgreement ?? 0;
  const eventScore = event > 0 ? 1 : event < 0 ? 0 : 0.35;
  let final =
    (embeddingAvailable && "semantic" in weights ? (input.embeddingSimilarity ?? 0) * (weights.semantic ?? 0) : 0) +
    input.titleSimilarity * weights.title +
    input.entityOverlap * weights.entity +
    input.temporalScore * weights.time +
    input.categoryScore * weights.category +
    eventScore * weights.event;

  if (input.entityOverlap >= 0.35 && event > 0 && input.titleSimilarity >= 0.18) {
    final += 0.06;
  }
  if (event > 0 && input.entityOverlap >= 0.5) {
    final += 0.05;
  }
  if (event === 0 && input.titleSimilarity >= 0.48 && input.entityOverlap >= 0.5) {
    final += 0.09;
  }
  if ((input.distinctiveMismatch ?? 0) > 0 && event > 0) {
    final = Math.min(final, 0.62);
  }

  if (event < 0) {
    final = Math.min(final, clusteringConfig.conflictScoreCap);
  }

  return {
    embeddingAvailable,
    embeddingSimilarity: input.embeddingSimilarity,
    titleSimilarity: input.titleSimilarity,
    entityOverlap: input.entityOverlap,
    temporalScore: input.temporalScore,
    categoryScore: input.categoryScore,
    eventAgreement: event,
    finalScore: clamp(final),
    weights,
  };
}

export function clusterScore(input: ScoreInput) {
  return scoreBreakdown(input).finalScore;
}

export function looksLikeChildUpdate(title: string) {
  const tokens = titleTokens(title);
  return clusteringConfig.childUpdateTitleHints.some((hint) => {
    const stemmedHint = hint.replace(/(ing|ed|es|s)$/, "");
    return tokens.some(
      (token) => token === hint || token === stemmedHint || token.startsWith(stemmedHint) || stemmedHint.startsWith(token),
    );
  });
}

export type MatchDecision = "attach" | "create" | "ambiguous" | "child";

export function decideMatch(score: number, title: string): MatchDecision {
  if (score >= clusteringConfig.attachThreshold) {
    return looksLikeChildUpdate(title) ? "child" : "attach";
  }
  if (score >= clusteringConfig.ambiguousLow && score < clusteringConfig.attachThreshold) {
    return "ambiguous";
  }
  return "create";
}

function clamp(value: number) {
  return Math.max(0, Math.min(1, value));
}
