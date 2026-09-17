import type { BusinessProfile } from "@/lib/schemas/business";
import type { UnderstandingSummary } from "@/lib/schemas/interview";
import {
  ResearchBriefSchema,
  type ResearchBrief,
} from "@/lib/schemas/site";
import { retrieveReferences } from "@/lib/references/library";

export function runResearchAgent(input: {
  profile: BusinessProfile;
  interview: UnderstandingSummary | null;
}): ResearchBrief {
  const profile = input.profile;
  const interview = input.interview;
  const refs = retrieveReferences({
    industry: profile.businessType,
    personality: ["professional", "premium", "approachable"],
    limit: 3,
  });

  const brief = ResearchBriefSchema.parse({
    version: 1,
    category: profile.businessType ?? "local business",
    customerIntent:
      interview?.whoTheyServe ??
      profile.targetCustomers ??
      "Visitors need clarity on services, trust signals, and a low-friction way to contact or book.",
    conversionGoals: [
      interview?.primaryConversion ??
        profile.primaryCtas[0] ??
        "Contact / inquiry",
      ...profile.primaryCtas.slice(1, 3),
    ].filter(Boolean),
    iaProblems: profile.iaProblems,
    contentGaps: profile.contentGaps,
    contradictions: profile.contradictions,
    interviewInsights: interview
      ? [
          `Positioning: ${interview.positioning}`,
          `Conversion: ${interview.primaryConversion}`,
          `Visual: ${interview.visualDirectionHints}`,
          ...interview.mustAvoid.slice(0, 3).map((x) => `Avoid: ${x}`),
          ...interview.corrections.map((c) => `Correction: ${c}`),
        ]
      : ["Interview summary unavailable — rely on crawl only."],
    preserve: [
      ...profile.preserveVsReplace.preserve.slice(0, 8),
      ...(interview?.mustPreserve.slice(0, 4) ?? []),
    ],
    replace: [
      ...profile.preserveVsReplace.replace,
      ...(interview?.mustAvoid.slice(0, 4) ?? []),
    ],
    risks: [
      "Do not invent testimonials, awards, years in business, or statistics.",
      "Do not copy reference sites as templates.",
      ...refs.map((r) => `Reference principle set available: ${r.title}`),
      ...(profile.needsConfirmation.slice(0, 3).map((n) => `Confirm: ${n}`)),
    ],
  });

  return brief;
}
