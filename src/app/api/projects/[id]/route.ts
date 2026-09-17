import { NextResponse } from "next/server";
import {
  getBusinessProfile,
  getInterview,
  getLatestJob,
  getProject,
  listStages,
} from "@/lib/db/repositories";
import {
  getCreativeBrief,
  getCurrentVersion,
  getLatestDeployment,
  getResearchBrief,
  getSelectedConcept,
  listConcepts,
  listEditMessages,
  listVisualReviews,
  listWebsiteVersions,
} from "@/lib/db/artifacts";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

function jobPayload(projectId: string, kind: string) {
  const job = getLatestJob(projectId, kind);
  if (!job) return null;
  return {
    id: job.id,
    status: job.status,
    currentStage: job.current_stage,
    error: job.error,
    stages: listStages(job.id).map((stage) => ({
      name: stage.name,
      label: stage.label,
      status: stage.status,
      position: stage.position,
      error: stage.error,
      startedAt: stage.started_at,
      finishedAt: stage.finished_at,
    })),
  };
}

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const project = getProject(id);
  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const profile = getBusinessProfile(id);
  const interview = getInterview(id);
  const current = getCurrentVersion(id);
  const selected = getSelectedConcept(id);

  return NextResponse.json({
    project: {
      id: project.id,
      status: project.status,
      sourceUrl: project.source_url,
      normalizedUrl: project.normalized_url,
      title: project.title,
      createdAt: project.created_at,
      updatedAt: project.updated_at,
    },
    jobs: {
      analysis: jobPayload(id, "analysis"),
      direction: jobPayload(id, "direction"),
      build: jobPayload(id, "build"),
      qa: jobPayload(id, "qa"),
    },
    businessProfile: profile?.profile ?? null,
    extractionMethod: profile?.method ?? null,
    interview: interview
      ? {
          id: interview.id,
          mode: interview.mode,
          status: interview.status,
          summary: interview.summary_json
            ? JSON.parse(interview.summary_json)
            : null,
          confirmedAt: interview.confirmed_at,
        }
      : null,
    research: getResearchBrief(id),
    creativeBrief: getCreativeBrief(id),
    concepts: listConcepts(id),
    selectedConcept: selected,
    currentVersion: current
      ? {
          id: current.id,
          label: current.label,
          source: current.source,
          createdAt: current.created_at,
        }
      : null,
    versions: listWebsiteVersions(id),
    reviews: listVisualReviews(id).map((r) => ({
      id: r.id,
      passNumber: r.pass_number,
      method: r.method,
      passed: Boolean(r.passed),
      createdAt: r.created_at,
    })),
    deployment: getLatestDeployment(id),
    editMessages: listEditMessages(id).map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      createdAt: m.created_at,
    })),
  });
}
