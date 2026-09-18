import {
  createBuildJob,
  createDirectionJob,
  createQaJob,
  getBusinessProfile,
  getInterview,
  getProject,
  listStages,
  setJobStatus,
  setStageStatus,
  updateProject,
} from "@/lib/db/repositories";
import {
  createWebsiteVersion,
  getCreativeBrief,
  getCurrentVersion,
  getQaConfig,
  getResearchBrief,
  getSelectedConcept,
  listConcepts,
  replaceConcepts,
  saveCreativeBrief,
  saveDesignSystem,
  saveResearchBrief,
  saveVisualReview,
} from "@/lib/db/artifacts";
import { runResearchAgent } from "@/lib/agents/research";
import { runDesignDirector } from "@/lib/agents/design-director";
import { generateConceptsWithAi } from "@/lib/agents/concepts";
import { buildDesignSystem } from "@/lib/agents/design-system";
import {
  assertContentIntegrity,
  implementWebsiteWithAi,
} from "@/lib/agents/implement";
import { renderSiteHtml } from "@/lib/render/html";
import { critiqueRenderedSite } from "@/lib/agents/visual-critic";
import { detectSlop } from "@/lib/agents/slop-detector";
import { repairSiteDocument } from "@/lib/agents/repair";
import type { UnderstandingSummary } from "@/lib/schemas/interview";
import type { DesignSystem } from "@/lib/schemas/site";
import { canUseFeature } from "@/lib/entitlements/types";

const running = new Set<string>();

async function runStage(
  jobId: string,
  name: string,
  fn: () => Promise<unknown>,
) {
  setJobStatus(jobId, "running", name);
  setStageStatus(jobId, name, "running");
  try {
    const artifact = await fn();
    setStageStatus(jobId, name, "succeeded", { artifact });
    return artifact;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Stage failed";
    setStageStatus(jobId, name, "failed", { error: message });
    setJobStatus(jobId, "failed", name, message);
    throw error;
  }
}

function interviewSummary(projectId: string): UnderstandingSummary | null {
  const interview = getInterview(projectId);
  if (!interview?.summary_json) return null;
  return JSON.parse(interview.summary_json) as UnderstandingSummary;
}

export async function runDirectionJob(jobId: string, projectId: string) {
  if (running.has(jobId)) return;
  running.add(jobId);
  try {
    if (!canUseFeature("concept_preview")) {
      throw new Error("Concept preview not entitled.");
    }
    updateProject(projectId, { status: "research" });
    const profile = getBusinessProfile(projectId)?.profile;
    if (!profile) throw new Error("Business profile missing");
    const interview = interviewSummary(projectId);

    await runStage(jobId, "research", async () => {
      const brief = runResearchAgent({ profile, interview });
      saveResearchBrief(projectId, brief);
      return { category: brief.category, goals: brief.conversionGoals };
    });

    await runStage(jobId, "creative_brief", async () => {
      const research = getResearchBrief(projectId)!;
      const brief = runDesignDirector({ profile, research, interview });
      saveCreativeBrief(projectId, brief);
      return {
        personality: brief.visualPersonality,
        avoids: brief.patternsToAvoid.slice(0, 5),
      };
    });

    await runStage(jobId, "generate_concepts", async () => {
      const brief = getCreativeBrief(projectId)!;
      const concepts = await generateConceptsWithAi({ projectId, profile, brief, interview });
      replaceConcepts(projectId, concepts);
      updateProject(projectId, { status: "concepts" });
      return {
        concepts: concepts.map((c) => ({ letter: c.letter, name: c.name })),
      };
    });

    setJobStatus(jobId, "succeeded", "generate_concepts");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Direction failed";
    updateProject(projectId, { status: "failed" });
    if (!listStages(jobId).some((s) => s.status === "failed")) {
      setJobStatus(jobId, "failed", null, message);
    }
  } finally {
    running.delete(jobId);
  }
}

export async function runBuildJob(jobId: string, projectId: string) {
  if (running.has(jobId)) return;
  running.add(jobId);
  try {
    if (!canUseFeature("full_build")) {
      throw new Error("Full build not entitled on this plan.");
    }
    updateProject(projectId, { status: "building" });
    const profile = getBusinessProfile(projectId)?.profile;
    const selected = getSelectedConcept(projectId);
    const project = getProject(projectId);
    if (!profile || !selected || !project) {
      throw new Error("Missing profile or selected concept");
    }
    const interview = interviewSummary(projectId);

    let designSystem: DesignSystem | null = null;

    await runStage(jobId, "design_system", async () => {
      designSystem = buildDesignSystem(selected.styleDna);
      saveDesignSystem(projectId, designSystem);
      return { fonts: designSystem.fonts, colors: designSystem.colors };
    });

    await runStage(jobId, "implement", async () => {
      if (!designSystem) throw new Error("Design system missing");
      const site = await implementWebsiteWithAi({
        projectId,
        profile,
        interview,
        styleDna: selected.styleDna,
        designSystem,
        sourceUrl: project.normalized_url,
      });
      const html = renderSiteHtml(site);
      const versionId = createWebsiteVersion({
        projectId,
        label: "Initial build",
        source: "implement",
        site,
        html,
      });
      return { versionId, sectionCount: site.sections.length };
    });

    await runStage(jobId, "content_integrity", async () => {
      const current = getCurrentVersion(projectId);
      if (!current) throw new Error("No website version");
      const check = assertContentIntegrity(current.site);
      if (!check.ok) throw new Error(check.problems.join("; "));
      return { ok: true, versionId: current.id };
    });

    setJobStatus(jobId, "succeeded", "content_integrity");
    const qaJob = createQaJob(projectId);
    kickOffQaJob(qaJob.id, projectId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Build failed";
    updateProject(projectId, { status: "failed" });
    if (!listStages(jobId).some((s) => s.status === "failed")) {
      setJobStatus(jobId, "failed", null, message);
    }
  } finally {
    running.delete(jobId);
  }
}

export async function runQaJob(jobId: string, projectId: string) {
  if (running.has(jobId)) return;
  running.add(jobId);
  try {
    updateProject(projectId, { status: "qa" });
    const config = getQaConfig(projectId);
    const brief = getCreativeBrief(projectId);

    const loop = await runStage(jobId, "render_review", async () => {
      const passes: unknown[] = [];
      let pass = 0;
      let finalPassed = false;
      let lastChangelog: string[] = [];

      while (pass < config.max_passes) {
        pass += 1;
        const current = getCurrentVersion(projectId);
        if (!current) throw new Error("No website version to review");

        const result = critiqueRenderedSite({
          site: current.site,
          html: current.html,
          brief,
          styleDna: current.site.styleDna,
        });

        saveVisualReview({
          projectId,
          versionId: current.id,
          passNumber: pass,
          method: result.method,
          summary: result.summary,
          passed: result.passed,
          issues: result.issues,
        });

        passes.push({
          pass,
          versionId: current.id,
          passed: result.passed,
          issueCount: result.issues.length,
        });

        if (result.passed && pass >= config.min_passes) {
          finalPassed = true;
          break;
        }

        if (pass >= config.max_passes) break;

        const repaired = repairSiteDocument(current.site, result.issues);
        lastChangelog = repaired.changelog;
        const html = renderSiteHtml(repaired.site);
        createWebsiteVersion({
          projectId,
          label: `Repair pass ${pass}`,
          source: "repair",
          site: repaired.site,
          html,
          parentVersionId: current.id,
        });
      }

      return {
        viewports: [1440, 768, 390],
        passes,
        finalPassed,
        lastChangelog,
        min: config.min_passes,
        max: config.max_passes,
      };
    });

    const current = getCurrentVersion(projectId)!;

    await runStage(jobId, "slop_detect", async () => {
      const findings = detectSlop(current.site, current.html);
      return {
        findings: findings.map((f) => ({
          severity: f.severity,
          category: f.category,
          observation: f.observation,
        })),
      };
    });

    await runStage(jobId, "critique", async () => {
      const result = critiqueRenderedSite({
        site: current.site,
        html: current.html,
        brief,
        styleDna: current.site.styleDna,
      });
      return {
        passed: result.passed,
        summary: result.summary,
        issueCount: result.issues.length,
      };
    });

    const loopResult = loop as {
      finalPassed: boolean;
      lastChangelog: string[];
    };

    if (loopResult.finalPassed) {
      setStageStatus(jobId, "repair", "skipped", {
        artifact: { reason: "Quality criteria passed" },
      });
    } else {
      await runStage(jobId, "repair", async () => ({
        changelog: loopResult.lastChangelog,
        note: "Repairs already applied during review loop; final state persisted as versions.",
      }));
    }

    updateProject(projectId, { status: "ready" });
    setJobStatus(jobId, "succeeded", loopResult.finalPassed ? "critique" : "repair");
  } catch (error) {
    const message = error instanceof Error ? error.message : "QA failed";
    updateProject(projectId, { status: "failed" });
    if (!listStages(jobId).some((s) => s.status === "failed")) {
      setJobStatus(jobId, "failed", null, message);
    }
  } finally {
    running.delete(jobId);
  }
}

export function kickOffDirectionJob(jobId: string, projectId: string) {
  void runDirectionJob(jobId, projectId);
}

export function kickOffBuildJob(jobId: string, projectId: string) {
  void runBuildJob(jobId, projectId);
}

export function kickOffQaJob(jobId: string, projectId: string) {
  void runQaJob(jobId, projectId);
}

export function startDirectionPipeline(projectId: string) {
  if (listConcepts(projectId).length === 3) {
    updateProject(projectId, { status: "concepts" });
    return null;
  }
  const job = createDirectionJob(projectId);
  kickOffDirectionJob(job.id, projectId);
  return job;
}

export function startBuildPipeline(projectId: string) {
  const job = createBuildJob(projectId);
  kickOffBuildJob(job.id, projectId);
  return job;
}
