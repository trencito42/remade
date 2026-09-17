import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getBusinessProfile,
  getInterview,
  getProject,
  updateProject,
} from "@/lib/db/repositories";
import {
  getCreativeBrief,
  getSelectedConcept,
  listConcepts,
  replaceConcepts,
  selectConcept,
} from "@/lib/db/artifacts";
import { startBuildPipeline, startDirectionPipeline } from "@/lib/jobs/pipeline";
import { generateConcepts } from "@/lib/agents/concepts";
import type { UnderstandingSummary } from "@/lib/schemas/interview";
import { renderConceptPreviewHtml } from "@/lib/render/html";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const project = getProject(id);
  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const concepts = listConcepts(id).map((concept) => ({
    ...concept,
    previewHtml: {
      desktop: renderConceptPreviewHtml(concept, "desktop"),
      mobile: renderConceptPreviewHtml(concept, "mobile"),
    },
  }));

  return NextResponse.json({
    status: project.status,
    concepts,
    selected: getSelectedConcept(id),
  });
}

const PostSchema = z.object({
  action: z.enum(["start", "select", "reject_all", "regenerate"]),
  conceptId: z.string().optional(),
  feedback: z.string().optional(),
});

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const project = getProject(id);
  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const body = PostSchema.parse(await request.json());

  if (body.action === "start") {
    const job = startDirectionPipeline(id);
    return NextResponse.json({ ok: true, jobId: job?.id ?? null });
  }

  if (body.action === "select") {
    if (!body.conceptId) {
      return NextResponse.json({ error: "conceptId required" }, { status: 400 });
    }
    const styleDna = selectConcept(id, body.conceptId);
    updateProject(id, { status: "building" });
    const job = startBuildPipeline(id);
    return NextResponse.json({ ok: true, styleDna, buildJobId: job.id });
  }

  if (body.action === "reject_all" || body.action === "regenerate") {
    const profile = getBusinessProfile(id)?.profile;
    const brief = getCreativeBrief(id);
    if (!profile || !brief) {
      return NextResponse.json(
        { error: "Research/brief missing — start direction job first." },
        { status: 409 },
      );
    }
    const interview = getInterview(id);
    const summary = interview?.summary_json
      ? (JSON.parse(interview.summary_json) as UnderstandingSummary)
      : null;

    if (body.feedback) {
      brief.patternsToAvoid = [
        `Owner rejected prior directions: ${body.feedback}`,
        ...brief.patternsToAvoid,
      ];
    }

    const concepts = generateConcepts({ profile, brief, interview: summary });
    concepts.forEach((c) => {
      c.name = `${c.name} · rev`;
      if (body.feedback) {
        c.pitch = `${c.pitch} Adjusted after feedback: ${body.feedback}`;
      }
    });
    replaceConcepts(id, concepts);
    updateProject(id, { status: "concepts" });
    return NextResponse.json({ ok: true, concepts: listConcepts(id) });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
