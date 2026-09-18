import { describe, expect, it } from "vitest";
import {
  categoryScore,
  clusterScore,
  cosineSimilarity,
  decideMatch,
  entityOverlap,
  looksLikeChildUpdate,
  temporalScore,
  titleSimilarity,
} from "@/features/clustering/score";

describe("Clustering Score & Event vs Topic Separation", () => {
  it("calculates cosine similarity correctly", () => {
    expect(cosineSimilarity([1, 0, 0], [1, 0, 0])).toBeCloseTo(1.0);
    expect(cosineSimilarity([1, 0, 0], [0, 1, 0])).toBeCloseTo(0.0);
    expect(cosineSimilarity(null, [1, 0])).toBeNull();
  });

  it("calculates temporal score within window", () => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 3600 * 1000);
    const score = temporalScore(now, oneHourAgo, 72);
    expect(score).toBeGreaterThan(0.95);

    const old = new Date(now.getTime() - 100 * 3600 * 1000);
    expect(temporalScore(now, old, 72)).toBe(0);
  });

  it("produces high score for two articles about the EXACT same event", () => {
    const title1 = "Rockstar delays Grand Theft Auto VI to late 2026";
    const title2 = "GTA 6 delayed to fall 2026 by Rockstar Games";

    const tSim = titleSimilarity(title1, title2);
    const eOverlap = entityOverlap(["rockstar-games", "gta-6"], ["rockstar-games", "gta-6"]);
    const tempScore = 0.98;
    const catScore = 1;

    const score = clusterScore({
      embeddingSimilarity: null,
      titleSimilarity: tSim,
      entityOverlap: eOverlap,
      temporalScore: tempScore,
      categoryScore: catScore,
    });

    expect(score).toBeGreaterThanOrEqual(0.72);
    expect(decideMatch(score, title2)).toBe("attach");
  });

  it("does NOT merge two completely different events about the same game/entity", () => {
    // Both mention GTA 6, but one is about a delay and the other is a PC spec leak
    const title1 = "GTA 6 delayed to fall 2026 by Rockstar";
    const title2 = "GTA 6 PC system requirements and minimum specs leak";

    const tSim = titleSimilarity(title1, title2);
    const eOverlap = entityOverlap(["gta-6"], ["gta-6"]); // 1.0 entity overlap
    const tempScore = 0.95;
    const catScore = 1;

    const score = clusterScore({
      embeddingSimilarity: 0.15, // AI embeddings indicate distinct event semantics
      titleSimilarity: tSim,
      entityOverlap: eOverlap,
      temporalScore: tempScore,
      categoryScore: catScore,
    });

    // Score must NOT cross the attach threshold (0.72)
    expect(score).toBeLessThan(0.72);
  });

  it("detects child update keywords in titles", () => {
    expect(looksLikeChildUpdate("RTX 5090 full specs leaked online")).toBe(true);
    expect(looksLikeChildUpdate("NVIDIA benchmarks reveal huge leap")).toBe(true);
    expect(looksLikeChildUpdate("Take-Two earnings call remarks")).toBe(false);
  });
});
