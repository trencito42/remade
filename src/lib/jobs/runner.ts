import {
  createInterview,
  getBusinessProfile,
  getLatestCrawl,
  getProject,
  listStages,
  saveBusinessProfile,
  saveCrawl,
  setJobStatus,
  setStageStatus,
  updateProject,
  addInterviewMessage,
  type CrawlPage,
} from "@/lib/db/repositories";
import { crawlWebsite } from "@/lib/crawl/crawler";
import { extractBusinessProfile } from "@/lib/agents/extract-business";
import {
  openingInterviewMessage,
  selectNextQuestions,
} from "@/lib/agents/interview";
import {
  assertUrlSafeToFetch,
  normalizeInputUrl,
} from "@/lib/security/url";
import type { AnalysisStageName } from "@/lib/schemas/jobs";

const runningJobs = new Set<string>();

async function runStage(
  jobId: string,
  name: AnalysisStageName,
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

export async function runAnalysisJob(jobId: string, projectId: string) {
  if (runningJobs.has(jobId)) return;
  runningJobs.add(jobId);

  try {
    const project = getProject(projectId);
    if (!project) throw new Error("Project not found");

    updateProject(projectId, { status: "analyzing" });
    setJobStatus(jobId, "running", "validate_url");

    const normalized = await runStage(jobId, "validate_url", async () => {
      const url = normalizeInputUrl(project.source_url);
      await assertUrlSafeToFetch(url);
      updateProject(projectId, { normalized_url: url.toString() });
      return { url: url.toString() };
    });

    const crawl = await runStage(jobId, "crawl", async () => {
      const result = await crawlWebsite(
        (normalized as { url: string }).url ?? project.source_url,
      );
      saveCrawl(projectId, result.pages, "succeeded");
      if (result.pages[0]?.title) {
        updateProject(projectId, { title: result.pages[0].title });
      }
      return {
        pageCount: result.pages.length,
        warnings: result.warnings,
        titles: result.pages.map((p) => p.title),
      };
    });

    void crawl;

    const crawlRow = getLatestCrawl(projectId);
    const pages: CrawlPage[] = crawlRow?.pages ?? [];

    const extracted = await runStage(jobId, "extract_business", async () => {
      const result = await extractBusinessProfile({ projectId, pages });
      saveBusinessProfile(projectId, result.profile, result.method);
      return {
        method: result.method,
        businessName: result.profile.businessName,
        businessType: result.profile.businessType,
      };
    });

    await runStage(jobId, "inspect_brand", async () => {
      const profile = getBusinessProfile(projectId)?.profile;
      return {
        logoCount: profile?.brand.logoUrls.length ?? 0,
        colors: profile?.brand.colors ?? [],
        tone: profile?.brand.toneOfVoice ?? null,
      };
    });

    await runStage(jobId, "analyze_content", async () => {
      const profile = getBusinessProfile(projectId)?.profile;
      return {
        preserve: profile?.preserveVsReplace.preserve.slice(0, 8) ?? [],
        replace: profile?.preserveVsReplace.replace ?? [],
        gaps: profile?.contentGaps ?? [],
        contradictions: profile?.contradictions ?? [],
      };
    });

    await runStage(jobId, "prepare_interview", async () => {
      const profile = getBusinessProfile(projectId)?.profile;
      if (!profile) throw new Error("Business profile missing");
      const interview = createInterview(projectId, "undecided");
      const opener = openingInterviewMessage(profile);
      addInterviewMessage({
        interviewId: interview.id,
        role: "assistant",
        content: opener,
      });
      const first = selectNextQuestions({
        profile,
        answeredIds: [],
        priorAnswers: [],
        limit: 1,
      });
      return {
        interviewId: interview.id,
        firstQuestionIds: first.map((q) => q.id),
        extraction: extracted,
      };
    });

    updateProject(projectId, { status: "interview" });
    setJobStatus(jobId, "succeeded", "prepare_interview");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Analysis failed";
    updateProject(projectId, { status: "failed" });
    // Job status already set on stage failure; ensure terminal state
    const stages = listStages(jobId);
    const failed = stages.find((s) => s.status === "failed");
    if (!failed) {
      setJobStatus(jobId, "failed", null, message);
    }
  } finally {
    runningJobs.delete(jobId);
  }
}

export function kickOffAnalysisJob(jobId: string, projectId: string) {
  // Fire-and-forget; progress is polled from persisted stages.
  void runAnalysisJob(jobId, projectId);
}
