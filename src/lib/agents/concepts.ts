import type { BusinessProfile } from "@/lib/schemas/business";
import type { UnderstandingSummary } from "@/lib/schemas/interview";
import type { CreativeBrief, StyleDNA } from "@/lib/schemas/style-dna";
import { z } from "zod";
import { ConceptSchema, type Concept } from "@/lib/schemas/site";
import { completeJson, getConfiguredProvider } from "@/lib/ai/provider";

function fallbackDna(brief: CreativeBrief, name: string): StyleDNA {
  return {
    version: 1,
    name,
    personality: brief.visualPersonality,
    typography: brief.typographyDirection,
    density: brief.density,
    corners: "subtle",
    borders: "restrained",
    imagery: brief.imageryTreatment,
    layout: brief.layoutPhilosophy,
    motion: brief.motionPhilosophy,
    contrast: "balanced",
    colorIntent: "derive from the business and its existing brand signals",
    navigationStyle: brief.navigationStyle,
    ctaHierarchy: brief.ctaHierarchy,
    sectionRhythm: brief.sectionRhythm,
    avoidPatterns: brief.patternsToAvoid.slice(0, 10),
  };
}

/**
 * Non-AI installs do not pretend to provide art direction quality.
 * This keeps the product honest instead of silently falling back to presets.
 */
export function generateConcepts(input: {
  profile: BusinessProfile;
  brief: CreativeBrief;
  interview: UnderstandingSummary | null;
}): Concept[] {
  const brand = input.profile.businessName ?? "Business";
  const purpose =
    input.interview?.whatTheyDo ??
    input.profile.tagline ??
    input.profile.summary.slice(0, 180);
  const primary =
    input.interview?.primaryConversion ??
    input.profile.primaryCtas[0] ??
    "Learn more";

  return (["A", "B", "C"] as const).map((letter, index) =>
    ConceptSchema.parse({
      letter,
      name: `${brand} direction ${letter}`,
      pitch: "AI art direction is unavailable in this environment.",
      differentiation: "Configure an AI provider to generate production-quality directions.",
      previewCss: "",
      styleDna: fallbackDna(input.brief, `Direction ${letter}`),
      preview: {
        layout: `unavailable-${index + 1}`,
        blocks: [
          {
            kind: "headline",
            variant: "primary",
            eyebrow: input.profile.businessType,
            title: brand,
            body: purpose,
            items: [],
            meta: null,
            cta: primary,
          },
        ],
      },
    }),
  );
}

function samePositionRatio(a: Concept, b: Concept): number {
  const aa = a.preview.blocks.map((block) => block.kind);
  const bb = b.preview.blocks.map((block) => block.kind);
  const longest = Math.max(aa.length, bb.length, 1);
  let same = 0;
  for (let i = 0; i < longest; i += 1) {
    if (aa[i] && aa[i] === bb[i]) same += 1;
  }
  return same / longest;
}

function assertConceptDiversity(concepts: Concept[]) {
  const names = new Set(concepts.map((concept) => concept.name.trim().toLowerCase()));
  const layouts = new Set(
    concepts.map((concept) => concept.preview.layout.trim().toLowerCase()),
  );
  const signatures = new Set(
    concepts.map((concept) =>
      concept.preview.blocks.map((block) => block.kind).join(">"),
    ),
  );

  if (names.size !== 3) throw new Error("Concept names are not distinct");
  if (layouts.size !== 3) throw new Error("Concept layout philosophies are too similar");
  if (signatures.size !== 3) throw new Error("Concept block structures are too similar");

  for (let i = 0; i < concepts.length; i += 1) {
    if (concepts[i].preview.blocks.length < 3) {
      throw new Error(`Concept ${concepts[i].letter} is under-designed`);
    }
    for (let j = i + 1; j < concepts.length; j += 1) {
      if (samePositionRatio(concepts[i], concepts[j]) >= 0.75) {
        throw new Error(
          `Concepts ${concepts[i].letter} and ${concepts[j].letter} share too much composition`,
        );
      }
    }
  }
}

const CONTRACT = {
  concept: {
    letter: "A | B | C",
    name: "short memorable direction name",
    pitch: "one sentence explaining the product/design idea",
    differentiation: "what makes this composition structurally unlike the other two",
    previewCss: "self-contained CSS targeting the generated block classes",
    styleDna: {
      version: 1,
      name: "direction name",
      personality: "string",
      typography: "string",
      density: "string",
      corners: "string",
      borders: "string",
      imagery: "string",
      layout: "string",
      motion: "string",
      contrast: "string",
      colorIntent: "string",
      navigationStyle: "string",
      ctaHierarchy: "string",
      sectionRhythm: "string",
      avoidPatterns: ["strings"],
    },
    preview: {
      layout: "unique composition philosophy",
      blocks: [
        {
          kind:
            "nav | headline | text | media | list | ticker | data | feature | quote | cta | split",
          variant: "freeform semantic variant",
          eyebrow: "string or null",
          title: "string or null",
          body: "string or null",
          items: ["short factual strings"],
          meta: "string or null",
          cta: "string or null",
        },
      ],
    },
  },
};

export async function generateConceptsWithAi(input: {
  projectId: string;
  profile: BusinessProfile;
  brief: CreativeBrief;
  interview: UnderstandingSummary | null;
}): Promise<Concept[]> {
  const provider = getConfiguredProvider();
  if (!provider) return generateConcepts(input);

  let lastError: unknown = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const result = await completeJson<Concept[]>({
        projectId: input.projectId,
        task: "concepts",
        temperature: attempt === 0 ? 0.82 : 0.92,
        messages: [
          {
            role: "system",
            content: [
              "You are the senior product designer and frontend art director for an elite generative website builder.",
              "Your quality bar is a polished, contemporary, production-worthy concept, not a wireframe and not a themed template.",
              "Create exactly three directions A, B and C for this specific website.",
              "Each direction must propose a different PRODUCT COMPOSITION, not merely a different visual style.",
              "The old website is evidence about facts, content and identity. Its existing layout is NOT an art-direction constraint.",
              "One direction may reinterpret useful qualities of the old site, but the three directions must not all inherit its visual language.",
              "Choose the opening experience based on the visitor's actual job. A homepage does not need a conventional hero.",
              "Use data-first, editorial, utility, media-first, catalogue, narrative, transactional, dashboard-like, index-like or other compositions only when the business warrants them.",
              "Mobile is a first-class canvas. The preview should communicate the direction within roughly one mobile screen plus a small continuation, not a long mini website.",
              "Use concise factual copy. Do not dump source text into giant headlines.",
              "Do not invent testimonials, metrics, awards, customers, prices, dates or claims.",
              "Avoid card soup, generic SaaS composition, repetitive three-column features, decorative gradients and arbitrary glass unless specifically earned by the concept.",
              "previewCss must provide real art direction: typography hierarchy, spacing, grid, surfaces, contrast and responsive behavior.",
              "No @import and no url() in previewCss.",
              "The three preview.layout values must all be different.",
              "The sequence of block kinds must materially differ across A, B and C.",
              "Return JSON only matching the supplied field contract.",
            ].join(" "),
          },
          {
            role: "user",
            content: JSON.stringify({
              businessFacts: input.profile,
              ownerInterview: input.interview,
              creativeBrief: input.brief,
              fieldContract: CONTRACT,
              rejectionFromPreviousAttempt:
                attempt === 0
                  ? null
                  : String(
                      lastError instanceof Error
                        ? lastError.message
                        : "Previous concepts were not distinct or polished enough",
                    ),
            }),
          },
        ],
        parseJson: (raw) => {
          const start = raw.indexOf("[");
          const end = raw.lastIndexOf("]");
          const slice =
            start >= 0 && end > start ? raw.slice(start, end + 1) : raw;
          const parsed = z.array(ConceptSchema).length(3).parse(JSON.parse(slice));
          const letters = parsed.map((concept) => concept.letter).join("");
          if (letters !== "ABC") {
            throw new Error("Concept letters must be A, B, C");
          }
          assertConceptDiversity(parsed);
          return parsed;
        },
      });

      if (!result?.data) throw new Error("AI returned no concepts");
      return result.data;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Could not generate sufficiently distinct concepts");
}
