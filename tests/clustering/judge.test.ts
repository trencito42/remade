import { describe, expect, it } from "vitest";
import { clusterJudgeSchema } from "@/features/clustering/judge";

describe("AI Cluster Judge Schema", () => {
  it("validates well-formed cluster judge outputs", () => {
    const valid = {
      sameEvent: true,
      confidence: 0.92,
      reason: "Both articles discuss the official delay of GTA 6 announced by Take-Two.",
    };
    const parsed = clusterJudgeSchema.parse(valid);
    expect(parsed.sameEvent).toBe(true);
    expect(parsed.confidence).toBe(0.92);
  });

  it("rejects invalid confidence ranges", () => {
    const invalid = {
      sameEvent: false,
      confidence: 1.5, // out of range
      reason: "Invalid",
    };
    expect(() => clusterJudgeSchema.parse(invalid)).toThrow();
  });
});
