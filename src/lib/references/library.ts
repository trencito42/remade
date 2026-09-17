/**
 * Visual reference retrieval architecture (Phase 2/7).
 *
 * References are INSPIRATION, not templates.
 * Design Director extracts principles; output must remain original.
 *
 * Storage now: curated JSON seed.
 * Later: embeddings + metadata filters (industry, density, typography, layout…).
 */

export type ReferenceMeta = {
  id: string;
  title: string;
  industry: string[];
  style: string[];
  density: "compact" | "balanced" | "airy" | string;
  typography: string[];
  layout: string[];
  visualPersonality: string[];
  businessModel: string[];
  /** Principles to extract — never copy structure verbatim */
  principles: string[];
  /** Optional public URL for human review; not scraped into templates */
  sourceUrl?: string;
};

export const REFERENCE_SEED: ReferenceMeta[] = [
  {
    id: "editorial-hospitality-01",
    title: "Photography-led hospitality editorial",
    industry: ["hospitality", "restaurant", "hotel"],
    style: ["editorial", "photography-led"],
    density: "airy",
    typography: ["serif display", "quiet sans"],
    layout: ["asymmetric", "full-bleed imagery"],
    visualPersonality: ["premium", "calm"],
    businessModel: ["local-service", "venue"],
    principles: [
      "Hero is one dominant image plane, not a card collage",
      "Typography carries brand before UI chrome",
      "Sparse section rhythm; avoid icon-grid filler",
    ],
  },
  {
    id: "trades-trust-01",
    title: "Trust-first home services",
    industry: ["home services", "plumbing", "electrical"],
    style: ["utilitarian", "direct"],
    density: "balanced",
    typography: ["humanist sans"],
    layout: ["structured", "conversion-forward"],
    visualPersonality: ["approachable", "professional"],
    businessModel: ["local-service"],
    principles: [
      "Primary CTA and phone reachability beat decorative motion",
      "Proof and service clarity over fashion-editorial experiments",
      "No fake stats; real contact paths only",
    ],
  },
  {
    id: "minimal-architecture-01",
    title: "Minimal architectural studio",
    industry: ["architecture", "interior design", "studio"],
    style: ["minimal", "architectural"],
    density: "airy",
    typography: ["geometric sans"],
    layout: ["structured", "large whitespace"],
    visualPersonality: ["restrained", "precise"],
    businessModel: ["studio"],
    principles: [
      "Borders and cards used sparingly",
      "Grid discipline; asymmetric only with intent",
      "Imagery is curated, not stock-collage",
    ],
  },
  {
    id: "dental-calm-01",
    title: "Calm clinical clarity",
    industry: ["dental", "healthcare", "clinic"],
    style: ["clean", "reassuring"],
    density: "balanced",
    typography: ["humanist sans"],
    layout: ["structured"],
    visualPersonality: ["approachable", "professional"],
    businessModel: ["local-service"],
    principles: [
      "Reduce anxiety with clear hierarchy and soft contrast",
      "Booking CTA visible without aggressive sales patterns",
      "Avoid startup-gradient aesthetics",
    ],
  },
  {
    id: "legal-authority-01",
    title: "Quiet legal authority",
    industry: ["legal", "law"],
    style: ["restrained", "editorial"],
    density: "airy",
    typography: ["serif display", "sans body"],
    layout: ["structured", "editorial"],
    visualPersonality: ["professional", "premium"],
    businessModel: ["professional-services"],
    principles: [
      "Authority through typography and whitespace, not stock gavel photos",
      "Practice areas as clear lists, not icon soup",
      "Contact and consultation path must be obvious",
    ],
  },
  {
    id: "fitness-energy-01",
    title: "Direct fitness energy",
    industry: ["fitness", "gym"],
    style: ["bold", "utilitarian"],
    density: "compact",
    typography: ["grotesque"],
    layout: ["expressive", "structured"],
    visualPersonality: ["bold", "approachable"],
    businessModel: ["local-service"],
    principles: [
      "Strong CTA for trial/membership without fake member counts",
      "Use real facility imagery principles, not abstract blobs",
      "Keep schedules factual or omit",
    ],
  },
];

export function retrieveReferences(query: {
  industry?: string | null;
  personality?: string[];
  limit?: number;
}): ReferenceMeta[] {
  const industry = query.industry?.toLowerCase() ?? "";
  const scored = REFERENCE_SEED.map((ref) => {
    let score = 0;
    if (industry && ref.industry.some((i) => industry.includes(i) || i.includes(industry))) {
      score += 5;
    }
    for (const trait of query.personality ?? []) {
      if (ref.visualPersonality.includes(trait)) score += 2;
      if (ref.style.includes(trait)) score += 2;
    }
    return { ref, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, query.limit ?? 5)
    .map((s) => s.ref);
}
