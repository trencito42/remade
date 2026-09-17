/**
 * Entitlement architecture (Phase 6).
 * Pricing amounts are intentionally NOT hardwired.
 *
 * Free: analysis, interview, concept preview, one rebuild + preview publish, limited AI edits.
 * Paid: custom domain, unlimited edits, extra pages, maintenance.
 */
export type EntitlementFeature =
  | "analysis"
  | "interview"
  | "concept_preview"
  | "full_build"
  | "publish"
  | "custom_domain"
  | "ai_edits"
  | "extra_pages"
  | "maintenance";

export const FREE_FEATURES: EntitlementFeature[] = [
  "analysis",
  "interview",
  "concept_preview",
  "full_build",
  "publish",
  "ai_edits",
];

export const PAID_FEATURES: EntitlementFeature[] = [
  "custom_domain",
  "extra_pages",
  "maintenance",
];

export function canUseFeature(
  feature: EntitlementFeature,
  opts?: { hasPaidPlan?: boolean; aiEditsUsed?: number; aiEditLimit?: number },
): boolean {
  if (feature === "ai_edits") {
    const limit = opts?.aiEditLimit ?? 25;
    const used = opts?.aiEditsUsed ?? 0;
    if (opts?.hasPaidPlan) return true;
    return used < limit;
  }
  if (FREE_FEATURES.includes(feature)) return true;
  return Boolean(opts?.hasPaidPlan);
}

export function entitlementMessage(feature: EntitlementFeature): string {
  return `“${feature}” requires a paid plan. Pricing is configured per deployment — not hardwired in code.`;
}
