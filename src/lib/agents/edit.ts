import type { SiteDocument } from "@/lib/schemas/site";
import { SiteDocumentSchema } from "@/lib/schemas/site";

/**
 * Translates conversational edit requests into surgical SiteDocument patches.
 */
export function applyEditRequest(
  site: SiteDocument,
  request: string,
): { site: SiteDocument; summary: string } {
  const next = structuredClone(site) as SiteDocument;
  const text = request.toLowerCase();
  const notes: string[] = [];

  if (/less corporate|more warm|friendlier/.test(text)) {
    next.styleDna.personality = "approachable warm";
    next.designSystem.colors.accent = "#9a4a2a";
    notes.push("Softened personality and accent toward warmer approachability.");
  }

  if (/rounded corners|hate.*round|less round|square corners/.test(text)) {
    next.styleDna.corners = "square";
    next.designSystem.radii.control = "2px";
    next.designSystem.radii.media = "0px";
    notes.push("Squared corners across controls and media.");
  }

  if (/hero shorter|shorter hero|reduce hero/.test(text)) {
    const hero = next.sections.find((s) => s.type === "hero");
    if (hero && hero.type === "hero") {
      hero.subhead = hero.subhead.slice(0, Math.min(110, hero.subhead.length));
      notes.push("Shortened hero supporting copy.");
    }
  }

  if (/whatsapp/.test(text)) {
    const hero = next.sections.find((s) => s.type === "hero");
    const contact = next.sections.find((s) => s.type === "contact");
    const nav = next.sections.find((s) => s.type === "nav");
    if (hero && hero.type === "hero") hero.primaryCta = "WhatsApp us";
    if (contact && contact.type === "contact") contact.cta = "WhatsApp us";
    if (nav && nav.type === "nav") nav.cta = "WhatsApp";
    notes.push("Updated primary CTAs to WhatsApp.");
  }

  if (/remove .*about|delete about/.test(text)) {
    next.sections = next.sections.filter((s) => s.type !== "about");
    notes.push("Removed About section.");
  }

  if (/second photo|use.*photo/.test(text)) {
    const hero = next.sections.find((s) => s.type === "hero");
    if (hero && hero.type === "hero") {
      hero.mediaLabel = "Selected photograph (owner-specified)";
      notes.push("Updated hero media label to owner-selected photo.");
    }
  }

  const ctaMatch = request.match(/change (?:this )?cta to (.+)/i);
  if (ctaMatch) {
    const value = ctaMatch[1].trim().replace(/["']/g, "");
    for (const section of next.sections) {
      if (section.type === "hero") section.primaryCta = value;
      if (section.type === "nav") section.cta = value;
      if (section.type === "contact") section.cta = value;
    }
    notes.push(`Changed CTAs to “${value}”.`);
  }

  if (!notes.length) {
    notes.push(
      "Could not map that request to a surgical edit yet. Try being specific (hero, corners, CTA, remove section).",
    );
  }

  return {
    site: SiteDocumentSchema.parse(next),
    summary: notes.join(" "),
  };
}
