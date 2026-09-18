import type { BusinessProfile } from "@/lib/schemas/business";
import type { UnderstandingSummary } from "@/lib/schemas/interview";
import {
  ResearchBriefSchema,
  type ResearchBrief,
} from "@/lib/schemas/site";
import { retrieveReferences } from "@/lib/references/library";
import { completeJson, getConfiguredProvider } from "@/lib/ai/provider";

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


export async function runResearchAgentWithAi(input: {
  projectId: string;
  profile: BusinessProfile;
  interview: UnderstandingSummary | null;
}): Promise<ResearchBrief> {
  const fallback = runResearchAgent(input);
  try {
    const result = await completeJson<ResearchBrief>({
      projectId: input.projectId,
      task: "research",
      temperature: 0.25,
      messages: [
        {
          role: "system",
          content: [
            "You are a website strategist researching one specific business.",
            "Return JSON only matching the supplied ResearchBrief example.",
            "Do not force a local-service funnel if the site is ecommerce, editorial, portfolio, hospitality, SaaS, community, event, creator, nonprofit, education, or another model.",
            "Infer the actual visitor jobs, information architecture, conversion goals, content gaps and risks from the supplied facts.",
            "Never invent business facts or social proof.",
          ].join(" "),
        },
        {
          role: "user",
          content: JSON.stringify({ business: input.profile, ownerInterview: input.interview, validExample: fallback }),
        },
      ],
      parseJson: (raw) => {
        const start = raw.indexOf("{");
        const end = raw.lastIndexOf("}");
        const slice = start >= 0 && end > start ? raw.slice(start, end + 1) : raw;
        return ResearchBriefSchema.parse(JSON.parse(slice));
      },
    });
    return result?.data ?? fallback;
  } catch (error) {
    if (getConfiguredProvider()) throw error;
    return fallback;
  }
}
