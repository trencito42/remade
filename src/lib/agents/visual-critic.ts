import type { CreativeBrief, StyleDNA } from "@/lib/schemas/style-dna";
import type { SiteDocument, VisualIssue } from "@/lib/schemas/site";
import { detectSlop } from "@/lib/agents/slop-detector";

export type CritiqueResult = {
  method: "structural";
  passed: boolean;
  issues: VisualIssue[];
  summary: {
    hierarchyNotes: string[];
    mobileNotes: string[];
    consistencyNotes: string[];
  };
};

/**
 * Visual Critic — Phase 4 MVP judges the rendered HTML artifact against brief/DNA.
 * Concrete observations only. Playwright screenshots can augment later (method would become "visual").
 */
export function critiqueRenderedSite(input: {
  site: SiteDocument;
  html: string;
  brief: CreativeBrief | null;
  styleDna: StyleDNA;
}): CritiqueResult {
  const issues: VisualIssue[] = [];
  const { html, site, styleDna } = input;

  const heroMatch = html.match(/<section class="hero"[\s\S]*?<\/section>/);
  if (heroMatch) {
    const hero = heroMatch[0];
    const h1 = hero.match(/<h1>([\s\S]*?)<\/h1>/)?.[1] ?? "";
    if (h1.length > 48) {
      issues.push({
        severity: "major",
        category: "hierarchy",
        viewport: "390",
        observation:
          "The hero headline is very long and will occupy excessive vertical space at 390px, risking the primary CTA falling below the initial viewport.",
        recommendation:
          "Shorten the headline to roughly 3–7 words or split into headline + supporting line.",
        selectorHint: ".hero h1",
      });
    }
    if (!hero.includes('class="btn"')) {
      issues.push({
        severity: "blocker",
        category: "cta",
        viewport: "1440",
        observation: "Hero is missing a primary CTA button in the rendered markup.",
        recommendation: "Restore a single prominent primary CTA in the hero.",
        selectorHint: ".hero .cta-row",
      });
    }
  }

  if (!html.includes('id="contact"') && !html.includes('data-section="contact"')) {
    issues.push({
      severity: "major",
      category: "conversion",
      viewport: null,
      observation: "No contact section anchor was found in the rendered page.",
      recommendation: "Ensure the conversion destination is present and linked from the hero CTA.",
      selectorHint: "#contact",
    });
  }

  if (styleDna.imagery.toLowerCase().includes("dominant") && !html.includes("hero-media")) {
    issues.push({
      severity: "major",
      category: "imagery",
      viewport: "1440",
      observation:
        "Style DNA calls for dominant imagery but the hero media plane is missing.",
      recommendation: "Restore a full-bleed or large hero media plane.",
      selectorHint: ".hero-media",
    });
  }

  const about = site.sections.find((s) => s.type === "about");
  if (about && about.type === "about" && about.body.length < 40) {
    issues.push({
      severity: "minor",
      category: "content_density",
      viewport: null,
      observation: "About section body is extremely short and may feel unfinished.",
      recommendation: "Use confirmed interview copy or omit the section until content exists.",
      selectorHint: '[data-section="about"]',
    });
  }

  issues.push(...detectSlop(site, html));

  // Deduplicate by observation
  const seen = new Set<string>();
  const unique = issues.filter((i) => {
    if (seen.has(i.observation)) return false;
    seen.add(i.observation);
    return true;
  });

  const blockers = unique.filter((i) => i.severity === "blocker").length;
  const majors = unique.filter((i) => i.severity === "major").length;
  const passed = blockers === 0 && majors <= 1;

  return {
    method: "structural",
    passed,
    issues: unique,
    summary: {
      hierarchyNotes: unique
        .filter((i) => i.category === "hierarchy" || i.category === "cta")
        .map((i) => i.observation),
      mobileNotes: unique
        .filter((i) => i.viewport === "390")
        .map((i) => i.observation),
      consistencyNotes: unique
        .filter((i) => ["consistency", "rhythm", "ai_slop"].includes(i.category))
        .map((i) => i.observation),
    },
  };
}
