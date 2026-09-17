import { describe, expect, it, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { resetDbForTests, getDb } from "../src/lib/db/client";
import {
  createProject,
  saveBusinessProfile,
  createInterview,
  updateInterview,
} from "../src/lib/db/repositories";
import { extractBusinessProfileHeuristic } from "../src/lib/agents/extract-business";
import { runResearchAgent } from "../src/lib/agents/research";
import { runDesignDirector } from "../src/lib/agents/design-director";
import { generateConcepts } from "../src/lib/agents/concepts";
import { buildDesignSystem } from "../src/lib/agents/design-system";
import {
  assertContentIntegrity,
  implementWebsite,
} from "../src/lib/agents/implement";
import { renderSiteHtml } from "../src/lib/render/html";
import { critiqueRenderedSite } from "../src/lib/agents/visual-critic";
import { repairSiteDocument } from "../src/lib/agents/repair";
import { applyEditRequest } from "../src/lib/agents/edit";
import { detectSlop } from "../src/lib/agents/slop-detector";
import { scoreCritique } from "../src/lib/eval/quality";
import { buildAssumptionsSummary } from "../src/lib/agents/interview";
import type { CrawlPage } from "../src/lib/db/repositories";
import {
  createWebsiteVersion,
  getCurrentVersion,
  replaceConcepts,
  selectConcept,
  listConcepts,
} from "../src/lib/db/artifacts";

const pages: CrawlPage[] = [
  {
    url: "https://example-plumber.test/",
    finalUrl: "https://example-plumber.test/",
    statusCode: 200,
    title: "Bright Pipe Plumbing | Local Pros",
    text: "Bright Pipe Plumbing. Call 555-010-2000. Drain cleaning, water heaters. Email hello@brightpipe.test",
    htmlExcerpt: "<html><body><img alt='logo' src='/logo.png'/></body></html>",
    links: ["https://example-plumber.test/services"],
    metaDescription: "Trusted local plumbing.",
    headings: ["Bright Pipe Plumbing", "Services", "Drain cleaning"],
    images: [{ src: "https://example-plumber.test/logo.png", alt: "logo" }],
    fetchedAt: new Date().toISOString(),
  },
];

describe("phases 2–5 pipeline pieces", () => {
  const dbPath = path.join(process.cwd(), "data", `vitest-full-${process.pid}.sqlite`);

  afterEach(() => {
    resetDbForTests();
    for (const suffix of ["", "-wal", "-shm"]) {
      const file = `${dbPath}${suffix}`;
      if (fs.existsSync(file)) fs.unlinkSync(file);
    }
  });

  it("produces three differentiated concepts and freezes DNA on select", () => {
    process.env.REMADE_DB_PATH = dbPath;
    resetDbForTests();
    getDb();

    const profile = extractBusinessProfileHeuristic(pages);
    const interview = buildAssumptionsSummary(profile);
    const research = runResearchAgent({ profile, interview });
    const brief = runDesignDirector({ profile, research, interview });
    const concepts = generateConcepts({ profile, brief, interview });

    expect(concepts).toHaveLength(3);
    expect(new Set(concepts.map((c) => c.letter)).size).toBe(3);
    expect(concepts[0].styleDna.layout).not.toBe(concepts[1].styleDna.layout);

    const project = createProject({
      sourceUrl: "https://example-plumber.test",
      normalizedUrl: "https://example-plumber.test/",
    });
    saveBusinessProfile(project.id, profile, "heuristic");
    createInterview(project.id, "assumptions");
    updateInterview(project.id, {
      status: "confirmed",
      summary: interview,
      confirmed: true,
    });
    replaceConcepts(project.id, concepts);
    const listed = listConcepts(project.id);
    const dna = selectConcept(project.id, listed[1].id);
    expect(dna.name).toBe(listed[1].styleDna.name);
  });

  it("implements, renders, critiques, repairs, and edits surgically", () => {
    process.env.REMADE_DB_PATH = dbPath;
    resetDbForTests();
    getDb();

    const profile = extractBusinessProfileHeuristic(pages);
    const interview = buildAssumptionsSummary(profile);
    const research = runResearchAgent({ profile, interview });
    const brief = runDesignDirector({ profile, research, interview });
    const concepts = generateConcepts({ profile, brief, interview });
    const dna = concepts[0].styleDna;
    const system = buildDesignSystem(dna);
    const site = implementWebsite({
      profile,
      interview,
      styleDna: dna,
      designSystem: system,
      sourceUrl: "https://example-plumber.test/",
    });

    expect(assertContentIntegrity(site).ok).toBe(true);
    const html = renderSiteHtml(site);
    expect(html).toContain("Bright Pipe");
    expect(html).not.toMatch(/lorem ipsum/i);

    const critique = critiqueRenderedSite({
      site,
      html,
      brief,
      styleDna: dna,
    });
    expect(critique.method).toBe("structural");
    expect(scoreCritique(critique).score).toBeGreaterThan(0);

    const slop = detectSlop(site, html);
    expect(Array.isArray(slop)).toBe(true);

    const repaired = repairSiteDocument(site, critique.issues);
    expect(repaired.changelog.length).toBeGreaterThan(0);

    const edited = applyEditRequest(repaired.site, "Change CTA to WhatsApp");
    expect(edited.summary.toLowerCase()).toContain("whatsapp");
    const hero = edited.site.sections.find((s) => s.type === "hero");
    expect(hero && hero.type === "hero" && hero.primaryCta).toMatch(/WhatsApp/i);

    const project = createProject({
      sourceUrl: "https://example-plumber.test",
      normalizedUrl: "https://example-plumber.test/",
    });
    const v1 = createWebsiteVersion({
      projectId: project.id,
      label: "v1",
      source: "implement",
      site: repaired.site,
      html: renderSiteHtml(repaired.site),
    });
    createWebsiteVersion({
      projectId: project.id,
      label: "v2",
      source: "edit",
      site: edited.site,
      html: renderSiteHtml(edited.site),
      parentVersionId: v1,
    });
    const current = getCurrentVersion(project.id);
    expect(current?.label).toBe("v2");
  });
});
