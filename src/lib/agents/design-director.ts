import type { BusinessProfile } from "@/lib/schemas/business";
import type { UnderstandingSummary } from "@/lib/schemas/interview";
import type { ResearchBrief } from "@/lib/schemas/site";
import {
  CreativeBriefSchema,
  type CreativeBrief,
} from "@/lib/schemas/style-dna";
import { retrieveReferences } from "@/lib/references/library";

const UNIVERSAL_AVOIDS = [
  "NO generic SaaS hero with gradient mesh",
  "NO unnecessary gradients / gradient blobs",
  "NO glassmorphism by default",
  "NO endless rounded cards",
  "NO icon-title-description repeated everywhere",
  "NO fake statistics",
  "NO invented testimonials",
  "NO arbitrary badges / excessive pills",
  "NO random dashboard aesthetics for non-software businesses",
  "NO AI-startup visual language unless the business is a startup",
];

function personalityFor(profile: BusinessProfile, interview: UnderstandingSummary | null) {
  const type = (profile.businessType ?? "").toLowerCase();
  const pos = (interview?.positioning ?? "").toLowerCase();
  if (type.includes("funeral")) return "calm, dignified, restrained";
  if (type.includes("restaurant") || type.includes("hospitality")) {
    return pos.includes("premium") || pos.includes("luxury")
      ? "premium editorial hospitality"
      : "warm, appetite-led, local";
  }
  if (type.includes("home services") || type.includes("plumb")) {
    return "trust-first, practical, conversion-clear";
  }
  if (pos.includes("premium") || pos.includes("luxury")) return "premium, precise, sparse";
  if (pos.includes("bold")) return "bold, expressive, high contrast";
  return "approachable, professional, clear";
}

export function runDesignDirector(input: {
  profile: BusinessProfile;
  research: ResearchBrief;
  interview: UnderstandingSummary | null;
}): CreativeBrief {
  const personality = personalityFor(input.profile, input.interview);
  const refs = retrieveReferences({
    industry: input.profile.businessType,
    limit: 3,
  });
  const principles = refs.flatMap((r) => r.principles).slice(0, 6);

  return CreativeBriefSchema.parse({
    version: 1,
    visualPersonality: personality,
    layoutPhilosophy:
      personality.includes("editorial") || personality.includes("premium")
        ? "Photography or typography led; asymmetric where it earns attention; never card collage."
        : "Structured conversion path; clear hierarchy; generous but purposeful spacing.",
    typographyDirection: personality.includes("editorial")
      ? "Serif display + quiet sans body"
      : personality.includes("bold")
        ? "Strong geometric sans, tight tracking on headlines"
        : "Humanist sans for trust and readability",
    density: personality.includes("sparse") || personality.includes("premium")
      ? "airy"
      : "balanced",
    spacingPhilosophy: "Section rhythm should vary; avoid identical padding blocks stacked forever.",
    imageryTreatment: personality.includes("editorial")
      ? "Dominant imagery as full-bleed planes"
      : "Supporting imagery; never decorative blob backgrounds",
    navigationStyle: "Restrained header; one primary CTA maximum in nav",
    ctaHierarchy: `Primary: ${input.research.conversionGoals[0] ?? "Contact"}. Secondary actions quieter.`,
    motionPhilosophy: "Restrained or none — presence over noise",
    sectionRhythm: "Alternate density; avoid repeating the same 3-column pattern",
    contentHierarchy:
      "Business name / offer → proof of relevance → services → contact. No filler sections.",
    patternsToAvoid: [
      ...UNIVERSAL_AVOIDS,
      ...input.research.replace.slice(0, 4),
      ...(input.interview?.mustAvoid ?? []).slice(0, 4),
    ],
    businessFitRationale: [
      `${input.profile.businessName ?? "This business"} is categorized as ${input.research.category}.`,
      `Design must serve: ${input.research.customerIntent}`,
      principles.length
        ? `Drawn principles (not templates): ${principles.join("; ")}`
        : "No matching references — invent carefully from business fit.",
    ].join(" "),
  });
}
