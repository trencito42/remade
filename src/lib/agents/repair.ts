import type { SiteDocument, VisualIssue } from "@/lib/schemas/site";
import { SiteDocumentSchema } from "@/lib/schemas/site";

/**
 * Surgical repair — changes only what issues require.
 */
export function repairSiteDocument(
  site: SiteDocument,
  issues: VisualIssue[],
): { site: SiteDocument; changelog: string[] } {
  const next = structuredClone(site) as SiteDocument;
  const changelog: string[] = [];

  for (const issue of issues) {
    if (issue.category === "hierarchy" && issue.selectorHint?.includes("h1")) {
      const hero = next.sections.find((s) => s.type === "hero");
      if (hero && hero.type === "hero" && hero.headline.length > 48) {
        const words = hero.headline.split(/\s+/);
        hero.headline = words.slice(0, 6).join(" ");
        changelog.push("Shortened hero headline for mobile viewport fit.");
      }
    }

    if (issue.category === "cta" && issue.observation.includes("missing")) {
      const hero = next.sections.find((s) => s.type === "hero");
      if (hero && hero.type === "hero" && !hero.primaryCta) {
        hero.primaryCta = "Contact";
        changelog.push("Restored primary hero CTA.");
      }
    }

    if (issue.category === "imagery") {
      const hero = next.sections.find((s) => s.type === "hero");
      if (hero && hero.type === "hero" && !hero.mediaLabel) {
        hero.mediaLabel = "Primary photograph";
        changelog.push("Restored hero media plane label.");
      }
    }

    if (issue.category === "content_integrity") {
      for (const section of next.sections) {
        if (section.type === "about") {
          section.body = section.body
            .replace(/lorem ipsum[^.]*/gi, "")
            .replace(/\b\d+\+\s*(customers|clients|reviews)\b/gi, "")
            .trim();
          changelog.push("Stripped suspected invented claims from About.");
        }
      }
      next.contentIntegrity.inventedFacts = [];
    }

    if (issue.category === "rhythm") {
      // Slightly air out services intro to break monotony without full regen
      const services = next.sections.find((s) => s.type === "services");
      if (services && services.type === "services") {
        services.intro = `${services.intro} Selected highlights — not a filler grid.`;
        changelog.push("Adjusted services intro to break repetitive section voice.");
      }
    }

    if (issue.category === "consistency" && issue.observation.includes("rounded")) {
      next.designSystem.radii.control = "2px";
      next.designSystem.radii.media = "0px";
      next.styleDna.corners = "square";
      changelog.push("Aligned radii to square Style DNA.");
    }
  }

  if (!changelog.length) {
    changelog.push("No safe surgical repair applied; issues retained for review.");
  }

  return {
    site: SiteDocumentSchema.parse(next),
    changelog,
  };
}
