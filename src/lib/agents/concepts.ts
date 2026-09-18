import type { BusinessProfile } from "@/lib/schemas/business";
import type { UnderstandingSummary } from "@/lib/schemas/interview";
import type { CreativeBrief } from "@/lib/schemas/style-dna";
import { z } from "zod";
import { ConceptSchema, type Concept } from "@/lib/schemas/site";
import { completeJson, getConfiguredProvider } from "@/lib/ai/provider";
import type { StyleDNA } from "@/lib/schemas/style-dna";

function basePreview(profile: BusinessProfile, interview: UnderstandingSummary | null) {
  const brand = profile.businessName ?? "Business";
  const cta =
    interview?.primaryConversion ??
    profile.primaryCtas[0] ??
    "Contact us";
  const services = profile.servicesOrProducts.slice(0, 3);
  return {
    nav: {
      brand,
      links: profile.navigation.slice(0, 4).length
        ? profile.navigation.slice(0, 4)
        : ["Services", "About", "Contact"],
      cta,
    },
    hero: {
      eyebrow: profile.businessType,
      headline: brand,
      subhead:
        interview?.whatTheyDo ??
        profile.tagline ??
        profile.summary.slice(0, 160),
      primaryCta: cta,
      secondaryCta: profile.contact.phones[0] ? "Call now" : null,
      mediaLabel: "Primary photograph",
    },
    section: {
      title: services.length ? "What we do" : "Why choose us",
      body: "Clear, factual service overview — no invented claims.",
      items: services.length
        ? services
        : ["Core offering", "How we work", "Get in touch"],
    },
  };
}

function dna(
  name: string,
  partial: Omit<StyleDNA, "version" | "name" | "avoidPatterns"> & {
    avoidPatterns?: string[];
  },
  brief: CreativeBrief,
): StyleDNA {
  return {
    version: 1,
    name,
    avoidPatterns: [
      ...(partial.avoidPatterns ?? []),
      ...brief.patternsToAvoid.slice(0, 8),
    ],
    ...partial,
  };
}

/**
 * Three meaningfully different directions — not recolors of one layout.
 */
export function generateConcepts(input: {
  profile: BusinessProfile;
  brief: CreativeBrief;
  interview: UnderstandingSummary | null;
}): Concept[] {
  const preview = basePreview(input.profile, input.interview);
  const brief = input.brief;
  const type = (input.profile.businessType ?? "").toLowerCase();

  const editorial: Concept = ConceptSchema.parse({
    letter: "A",
    name: type.includes("plumb") || type.includes("home")
      ? "Editorial Trust"
      : "Editorial / photography-led",
    pitch: "Large typography and a dominant visual plane. Sparse sections. Brand-first.",
    differentiation: "Asymmetric hero, serif display, imagery as the stage — not cards.",
    styleDna: dna(
      "Editorial",
      {
        personality: "premium editorial",
        typography: "serif display / quiet sans",
        density: "airy",
        corners: "square",
        borders: "none",
        imagery: "dominant",
        layout: "asymmetric editorial",
        motion: "restrained",
        contrast: "strong",
        colorIntent: "ink on paper with one deep accent",
        navigationStyle: "minimal text links + one CTA",
        ctaHierarchy: "one primary action in hero",
        sectionRhythm: "full-bleed then quiet text band",
      },
      brief,
    ),
    preview: {
      ...preview,
      hero: {
        ...preview.hero,
        headline: preview.hero.headline,
        subhead: preview.hero.subhead,
      },
    },
  });

  const minimal: Concept = ConceptSchema.parse({
    letter: "B",
    name: "Minimal / architectural",
    pitch: "Grid discipline, quiet surfaces, precise type. Trust through clarity.",
    differentiation: "Structured columns, restrained borders, no decorative chrome.",
    styleDna: dna(
      "Minimal",
      {
        personality: "precise professional",
        typography: "geometric sans",
        density: "airy",
        corners: "subtle",
        borders: "restrained",
        imagery: "supporting",
        layout: "structured",
        motion: "none",
        contrast: "balanced",
        colorIntent: "stone neutrals + sharp accent",
        navigationStyle: "left brand / right links",
        ctaHierarchy: "text link secondary, solid primary",
        sectionRhythm: "even modules with breathing room",
      },
      brief,
    ),
    preview,
  });

  const bold: Concept = ConceptSchema.parse({
    letter: "C",
    name: type.includes("funeral")
      ? "Quiet strength"
      : "Bold / expressive",
    pitch: type.includes("funeral")
      ? "Dignified contrast and calm spacing — expressive without spectacle."
      : "High contrast type, assertive CTA, expressive but intentional layout breaks.",
    differentiation: "Strong contrast and denser hero energy without SaaS clichés.",
    styleDna: dna(
      type.includes("funeral") ? "Quiet strength" : "Bold",
      {
        personality: type.includes("funeral") ? "dignified bold" : "bold expressive",
        typography: "utilitarian grotesque",
        density: "compact",
        corners: "square",
        borders: "structural",
        imagery: "minimal",
        layout: "expressive",
        motion: "restrained",
        contrast: "strong",
        colorIntent: "near-black / near-white with one hot accent",
        navigationStyle: "dense utility bar",
        ctaHierarchy: "oversized primary CTA",
        sectionRhythm: "tight stacks punctuated by wide rules",
      },
      brief,
    ),
    preview: {
      ...preview,
      hero: {
        ...preview.hero,
        eyebrow: null,
      },
    },
  });

  return [editorial, minimal, bold];
}


/** Prefer AI art direction when configured; deterministic concepts remain the safe fallback. */
export async function generateConceptsWithAi(input: {
  projectId: string;
  profile: BusinessProfile;
  brief: CreativeBrief;
  interview: UnderstandingSummary | null;
}): Promise<Concept[]> {
  const fallback = generateConcepts(input);
  try {
    const result = await completeJson<Concept[]>({
      projectId: input.projectId,
      task: "concepts",
      temperature: 0.75,
      messages: [
        {
          role: "system",
          content: [
            "You are an elite web design director, not a template generator.",
            "Create exactly 3 genuinely different website directions A, B, C for the specific business.",
            "They must differ in composition, typography, density, imagery treatment and section rhythm, not just colors.",
            "Avoid generic SaaS heroes, gradient blobs, card soup, repetitive icon grids, fake stats and invented claims.",
            "Mobile must feel intentionally designed, not a collapsed desktop.",
            "For each concept, write previewCss that makes its preview composition meaningfully unique. Keep it self-contained CSS, no @import and no url().",
            "Return JSON only. Preserve every field and enum value required by the supplied examples.",
          ].join(" "),
        },
        {
          role: "user",
          content: JSON.stringify({
            business: input.profile,
            ownerInterview: input.interview,
            creativeBrief: input.brief,
            schemaExamples: fallback,
          }),
        },
      ],
      parseJson: (raw) => {
        const start = raw.indexOf("[");
        const end = raw.lastIndexOf("]");
        const slice = start >= 0 && end > start ? raw.slice(start, end + 1) : raw;
        const parsed = z.array(ConceptSchema).length(3).parse(JSON.parse(slice));
        const letters = parsed.map((x) => x.letter).join("");
        if (letters !== "ABC") throw new Error("Concept letters must be A, B, C");
        return parsed;
      },
    });
    return result?.data ?? fallback;
  } catch (error) {
    if (getConfiguredProvider()) throw error;
    return fallback;
  }
}
