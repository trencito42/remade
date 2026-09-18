import type { SiteDocument, VisualIssue } from "@/lib/schemas/site";

/**
 * Context-aware slop detector — patterns are findings only when inappropriate/repetitive.
 */
export function detectSlop(site: SiteDocument, html: string): VisualIssue[] {
  const issues: VisualIssue[] = [];
  const dna = site.styleDna;
  const type = dna.personality.toLowerCase();
  const lower = html.toLowerCase();

  const serviceCount = (html.match(/class="service-item"/g) ?? []).length;
  if (serviceCount >= 3 && /icon-title|feature-grid/.test(lower)) {
    issues.push({
      severity: "major",
      category: "repetition",
      viewport: null,
      observation:
        "Services appear packaged as a repetitive icon-title-description grid.",
      recommendation:
        "Use a quieter list or editorial stack unless the business is software.",
      selectorHint: ".service-list",
    });
  }

  if (/lorem ipsum|500\+|award-winning|#1 rated|testimonial/.test(lower)) {
    issues.push({
      severity: "blocker",
      category: "content_integrity",
      viewport: null,
      observation: "Invented social proof or filler copy appears in the rendered HTML.",
      recommendation: "Delete fabricated claims; ask the owner or omit.",
      selectorHint: "body",
    });
  }

  if (
    !type.includes("software") &&
    !type.includes("saas") &&
    /dashboard|analytics|kpi|metrics/.test(lower)
  ) {
    issues.push({
      severity: "major",
      category: "business_fit",
      viewport: null,
      observation: "Dashboard/SaaS aesthetics applied to a non-software business.",
      recommendation: "Replace with business-appropriate hierarchy and imagery.",
      selectorHint: "body",
    });
  }

  const sectionPads = (html.match(/padding: var\(--section-y\)/g) ?? []).length;
  if (sectionPads >= 4 && dna.sectionRhythm.toLowerCase().includes("vary") === false) {
    // soft signal only
    issues.push({
      severity: "minor",
      category: "rhythm",
      viewport: null,
      observation:
        "Multiple consecutive sections share identical vertical padding tokens.",
      recommendation:
        "Vary section rhythm (full-bleed vs compact) so the page does not feel cloned.",
      selectorHint: "section",
    });
  }

  const cardish =
    (html.match(/border-radius:\s*1[2-9]px/g) ?? []).length +
    (html.match(/border-radius:\s*[2-9]0px/g) ?? []).length;
  if (cardish >= 6 && dna.corners.toLowerCase().includes("square")) {
    issues.push({
      severity: "major",
      category: "consistency",
      viewport: null,
      observation:
        "Many large rounded corners conflict with Style DNA corners=square.",
      recommendation: "Reduce radii to match Style DNA.",
      selectorHint: ":root",
    });
  }

  const repeatedCards =
    (html.match(/class="content-item"/g) ?? []).length +
    (html.match(/class="service-item"/g) ?? []).length;
  const visualEffects =
    (lower.match(/gradient/g) ?? []).length +
    (lower.match(/backdrop-filter/g) ?? []).length +
    (lower.match(/filter:/g) ?? []).length;
  if (repeatedCards >= 8 && visualEffects >= 4) {
    issues.push({
      severity: "major",
      category: "ai_slop",
      viewport: null,
      observation:
        "Many repeated content containers are combined with several decorative effects, creating a template-like rhythm.",
      recommendation:
        "Reduce repeated container treatment and vary composition while keeping effects only where they carry hierarchy.",
      selectorHint: "section",
    });
  }

  return issues;
}
