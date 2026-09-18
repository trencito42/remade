import type { SiteDocument, VisualIssue } from "@/lib/schemas/site";
import { SiteDocumentSchema } from "@/lib/schemas/site";
import { completeJson } from "@/lib/ai/provider";

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


export async function repairSiteDocumentWithAi(input: {
  projectId: string;
  site: SiteDocument;
  issues: VisualIssue[];
}): Promise<{ site: SiteDocument; changelog: string[] }> {
  const fallback = repairSiteDocument(input.site, input.issues);
  try {
    const result = await completeJson<{ site: SiteDocument; changelog: string[] }>({
      projectId: input.projectId,
      task: "repair",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: [
            "Repair a generated website surgically from the supplied QA issues.",
            "Return JSON only with {site, changelog}.",
            "Preserve unrelated content, structure and design decisions.",
            "You may adjust flexible sections and customCss to fix composition and responsive problems.",
            "Prioritize 390px mobile correctness, then desktop.",
            "Do not invent business facts or social proof.",
            "If an issue is not safely repairable from available facts, leave the content intact and fix presentation only.",
          ].join(" "),
        },
        {
          role: "user",
          content: JSON.stringify({
            currentSite: input.site,
            issues: input.issues,
            fallbackExample: fallback,
          }),
        },
      ],
      parseJson: (raw) => {
        const start = raw.indexOf("{");
        const end = raw.lastIndexOf("}");
        const slice = start >= 0 && end > start ? raw.slice(start, end + 1) : raw;
        const parsed = JSON.parse(slice) as { site: unknown; changelog?: unknown };
        return {
          site: SiteDocumentSchema.parse(parsed.site),
          changelog: Array.isArray(parsed.changelog)
            ? parsed.changelog.filter((x): x is string => typeof x === "string").slice(0, 20)
            : ["Applied AI repair."],
        };
      },
    });
    return result?.data ?? fallback;
  } catch {
    return fallback;
  }
}
