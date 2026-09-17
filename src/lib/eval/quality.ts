/**
 * Lightweight quality eval harness (Phase 7).
 * Scores structural critic output for regression checks in CI.
 */
import type { CritiqueResult } from "@/lib/agents/visual-critic";

export function scoreCritique(result: CritiqueResult): {
  score: number;
  blockers: number;
  majors: number;
  minors: number;
} {
  const blockers = result.issues.filter((i) => i.severity === "blocker").length;
  const majors = result.issues.filter((i) => i.severity === "major").length;
  const minors = result.issues.filter((i) => i.severity === "minor").length;
  const score = Math.max(0, 100 - blockers * 40 - majors * 15 - minors * 5);
  return { score, blockers, majors, minors };
}
