import { describe, expect, it } from "vitest";
import {
  categoryScore,
  clusterScore,
  cosineSimilarity,
  decideMatch,
  distinctiveMismatch,
  entityOverlap,
  eventAgreement,
  looksLikeChildUpdate,
  temporalScore,
  titleSimilarity,
} from "@/features/clustering/score";

function scorePair(
  title1: string,
  title2: string,
  extra: { entityOverlap?: number; embedding?: number | null } = {},
) {
  return clusterScore({
    embeddingSimilarity: extra.embedding === undefined ? null : extra.embedding,
    titleSimilarity: titleSimilarity(title1, title2),
    entityOverlap: extra.entityOverlap ?? entityOverlap(["gta-6", "rockstar-games"], ["gta-6", "rockstar-games"]),
    temporalScore: 0.95,
    categoryScore: categoryScore("gaming", "gaming"),
    eventAgreement: eventAgreement(title1, title2),
    distinctiveMismatch: distinctiveMismatch(title1, title2),
  });
}

describe("degraded-mode clustering (no embeddings)", () => {
  it("returns null cosine when embeddings are missing", () => {
    expect(cosineSimilarity(null, [1, 0])).toBeNull();
  });

  it("attaches paraphrases of the same delay event", () => {
    const a = "Rockstar delays GTA VI to November 2027";
    const b = "GTA 6 release pushed back, Rockstar confirms new date";
    const c = "Grand Theft Auto VI delayed again";
    expect(scorePair(a, b)).toBeGreaterThanOrEqual(0.72);
    expect(decideMatch(scorePair(a, b), b)).toBe("attach");
    expect(scorePair(a, c)).toBeGreaterThanOrEqual(0.72);
  });

  it("does not attach same-entity different events", () => {
    const delay = "GTA VI delayed to 2027";
    const trailer = "GTA VI trailer breaks YouTube record";
    const leak = "GTA VI PC requirements leak";
    const pricing = "Take-Two discusses GTA VI pricing";
    expect(scorePair(delay, trailer)).toBeLessThan(0.72);
    expect(scorePair(delay, leak)).toBeLessThan(0.72);
    expect(scorePair(delay, pricing)).toBeLessThan(0.72);
    expect(decideMatch(scorePair(delay, leak), leak)).not.toBe("attach");
  });

  it("matches NVIDIA / GeForce 5090 price announcements", () => {
    const a = "NVIDIA unveils RTX 5090 at $1999";
    const b = "GeForce RTX 5090 officially announced for $1,999";
    const score = clusterScore({
      embeddingSimilarity: null,
      titleSimilarity: titleSimilarity(a, b),
      entityOverlap: 1,
      temporalScore: 0.9,
      categoryScore: categoryScore("hardware", "technology"),
      eventAgreement: eventAgreement(a, b),
    });
    expect(score).toBeGreaterThanOrEqual(0.72);
  });

  it("matches acquisition paraphrases", () => {
    const a = "Microsoft buys Foo Studios";
    const b = "Foo Studios acquired by Microsoft";
    const score = clusterScore({
      embeddingSimilarity: null,
      titleSimilarity: titleSimilarity(a, b),
      entityOverlap: 1,
      temporalScore: 0.9,
      categoryScore: 1,
      eventAgreement: eventAgreement(a, b),
    });
    expect(score).toBeGreaterThanOrEqual(0.72);
  });

  it("does not let category mismatch block an otherwise strong match", () => {
    const a = "NVIDIA unveils RTX 5090 at $1999";
    const b = "GeForce RTX 5090 officially announced for $1,999";
    const same = clusterScore({
      embeddingSimilarity: null,
      titleSimilarity: titleSimilarity(a, b),
      entityOverlap: 1,
      temporalScore: 0.9,
      categoryScore: 1,
      eventAgreement: eventAgreement(a, b),
    });
    const mixed = clusterScore({
      embeddingSimilarity: null,
      titleSimilarity: titleSimilarity(a, b),
      entityOverlap: 1,
      temporalScore: 0.9,
      categoryScore: categoryScore("hardware", "technology"),
      eventAgreement: eventAgreement(a, b),
    });
    expect(mixed).toBeGreaterThan(0.65);
    expect(same - mixed).toBeLessThan(0.1);
  });

  it("keeps embeddings as a separate signal when present", () => {
    const delay = "GTA 6 delayed to fall 2026 by Rockstar";
    const leak = "GTA 6 PC system requirements and minimum specs leak";
    const withEmb = clusterScore({
      embeddingSimilarity: 0.15,
      titleSimilarity: titleSimilarity(delay, leak),
      entityOverlap: 1,
      temporalScore: 0.95,
      categoryScore: 1,
      eventAgreement: eventAgreement(delay, leak),
    });
    expect(withEmb).toBeLessThan(0.72);
  });

  it("detects child update keywords", () => {
    expect(looksLikeChildUpdate("RTX 5090 full specs leaked online")).toBe(true);
    expect(looksLikeChildUpdate("Take-Two earnings call remarks")).toBe(false);
  });

  it("gives recent follow-up coverage a non-zero time score", () => {
    const now = new Date();
    const later = new Date(now.getTime() + 26 * 3600 * 1000);
    expect(temporalScore(now, later)).toBeGreaterThan(0.8);
  });

  it("attaches entity-overlapping paraphrases without an event-family verb", () => {
    const a = "Waymo says Singapore will be its next robotaxi city";
    const b = "Waymo names Singapore as next international robotaxi market";
    expect(
      clusterScore({
        embeddingSimilarity: null,
        titleSimilarity: titleSimilarity(a, b),
        entityOverlap: 0.7,
        temporalScore: 0.9,
        categoryScore: 1,
        eventAgreement: eventAgreement(a, b),
      }),
    ).toBeGreaterThanOrEqual(0.72);
  });
});
