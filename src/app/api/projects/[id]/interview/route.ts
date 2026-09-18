import { NextResponse } from "next/server";
import { z } from "zod";
import {
  addInterviewMessage,
  getBusinessProfile,
  getInterview,
  getProject,
  listInterviewMessages,
  updateInterview,
  updateProject,
} from "@/lib/db/repositories";
import {
  buildAssumptionsSummary,
  buildUnderstandingSummary,
  maybeEnrichSummaryWithLlm,
  selectNextQuestionsWithAi,
} from "@/lib/agents/interview";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const project = getProject(id);
  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }
  const interview = getInterview(id);
  if (!interview) {
    return NextResponse.json({ error: "Interview not ready." }, { status: 409 });
  }
  const messages = listInterviewMessages(interview.id).map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    metadata: m.metadata_json ? JSON.parse(m.metadata_json) : null,
    createdAt: m.created_at,
  }));

  return NextResponse.json({
    interview: {
      id: interview.id,
      mode: interview.mode,
      status: interview.status,
      summary: interview.summary_json
        ? JSON.parse(interview.summary_json)
        : null,
      confirmedAt: interview.confirmed_at,
    },
    messages,
  });
}

const PostSchema = z.object({
  action: z.enum([
    "set_mode",
    "answer",
    "skip",
    "request_summary",
    "correct_summary",
    "confirm_summary",
  ]),
  mode: z.enum(["grill", "assumptions"]).optional(),
  content: z.string().optional(),
  questionId: z.string().optional(),
  corrections: z.array(z.string()).optional(),
});

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const project = getProject(id);
  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const profileRow = getBusinessProfile(id);
  if (!profileRow) {
    return NextResponse.json(
      { error: "Business profile not ready." },
      { status: 409 },
    );
  }

  const interview = getInterview(id);
  if (!interview) {
    return NextResponse.json({ error: "Interview not ready." }, { status: 409 });
  }

  const body = PostSchema.parse(await request.json());
  const profile = profileRow.profile;

  if (body.action === "set_mode") {
    if (!body.mode) {
      return NextResponse.json({ error: "Mode required." }, { status: 400 });
    }
    updateInterview(id, { mode: body.mode, status: "active" });

    if (body.mode === "assumptions") {
      const summary = await maybeEnrichSummaryWithLlm({
        projectId: id,
        profile,
        summary: buildAssumptionsSummary(profile),
        transcript: "User chose smart assumptions.",
      });
      updateInterview(id, {
        status: "awaiting_summary",
        summary,
      });
      addInterviewMessage({
        interviewId: interview.id,
        role: "assistant",
        content:
          "Understood — I’ll proceed with careful assumptions from the site. Please review the summary and correct anything wrong.",
        metadata: { type: "assumptions" },
      });
      return NextResponse.json({ ok: true, summary });
    }

    const next = (await selectNextQuestionsWithAi({
      projectId: id,
      profile,
      answeredIds: [],
      priorAnswers: [],
      limit: 1,
    }))[0];

    if (next) {
      addInterviewMessage({
        interviewId: interview.id,
        role: "assistant",
        content: next.prompt,
        metadata: { type: "question", question: next },
      });
    }

    return NextResponse.json({ ok: true, question: next ?? null });
  }

  if (body.action === "answer" || body.action === "skip") {
    const content =
      body.action === "skip"
        ? "(skipped)"
        : (body.content ?? "").trim();
    if (body.action === "answer" && !content) {
      return NextResponse.json({ error: "Answer required." }, { status: 400 });
    }

    addInterviewMessage({
      interviewId: interview.id,
      role: "user",
      content,
      metadata: {
        type: body.action,
        questionId: body.questionId ?? null,
      },
    });

    const history = listInterviewMessages(interview.id);
    const answeredIds = history
      .filter((m) => m.role === "user")
      .map((m) => {
        try {
          return m.metadata_json
            ? (JSON.parse(m.metadata_json).questionId as string | null)
            : null;
        } catch {
          return null;
        }
      })
      .filter((v): v is string => Boolean(v));

    const priorAnswers = history
      .filter((m) => m.role === "user")
      .map((m) => m.content);

    const next = (await selectNextQuestionsWithAi({
      projectId: id,
      profile,
      answeredIds,
      priorAnswers,
      limit: 1,
    }))[0];

    // After ~5 answered/skipped substantive turns, offer summary
    const userTurns = priorAnswers.length;
    if (!next || userTurns >= 5) {
      const answers = history
        .filter((m) => m.role === "user")
        .map((m) => ({
          questionId: m.metadata_json
            ? (JSON.parse(m.metadata_json).questionId as string | undefined)
            : undefined,
          content: m.content,
        }));
      const summary = await maybeEnrichSummaryWithLlm({
        projectId: id,
        profile,
        summary: buildUnderstandingSummary({ profile, answers }),
        transcript: history.map((m) => `${m.role}: ${m.content}`).join("\n"),
      });
      updateInterview(id, { status: "awaiting_summary", summary });
      addInterviewMessage({
        interviewId: interview.id,
        role: "assistant",
        content:
          "That’s enough to brief the design team. Here’s what I understood — correct anything before we continue.",
        metadata: { type: "summary_ready" },
      });
      return NextResponse.json({ ok: true, done: true, summary });
    }

    addInterviewMessage({
      interviewId: interview.id,
      role: "assistant",
      content: next.prompt,
      metadata: { type: "question", question: next },
    });

    return NextResponse.json({ ok: true, done: false, question: next });
  }

  if (body.action === "request_summary") {
    const history = listInterviewMessages(interview.id);
    const answers = history
      .filter((m) => m.role === "user")
      .map((m) => ({ content: m.content }));
    const summary = buildUnderstandingSummary({ profile, answers });
    updateInterview(id, { status: "awaiting_summary", summary });
    return NextResponse.json({ ok: true, summary });
  }

  if (body.action === "correct_summary") {
    const current = interview.summary_json
      ? JSON.parse(interview.summary_json)
      : buildAssumptionsSummary(profile);
    const corrections = body.corrections ?? (body.content ? [body.content] : []);
    const summary = {
      ...current,
      corrections: [...(current.corrections ?? []), ...corrections],
    };
    if (body.content) {
      addInterviewMessage({
        interviewId: interview.id,
        role: "user",
        content: body.content,
        metadata: { type: "correction" },
      });
      addInterviewMessage({
        interviewId: interview.id,
        role: "assistant",
        content: "Noted — I’ve attached your correction to the brief.",
        metadata: { type: "correction_ack" },
      });
    }
    updateInterview(id, { summary, status: "awaiting_summary" });
    return NextResponse.json({ ok: true, summary });
  }

  if (body.action === "confirm_summary") {
    updateInterview(id, { status: "confirmed", confirmed: true });
    updateProject(id, { status: "interview_complete" });
    const { startDirectionPipeline } = await import("@/lib/jobs/pipeline");
    const job = startDirectionPipeline(id);
    addInterviewMessage({
      interviewId: interview.id,
      role: "assistant",
      content:
        "Brief confirmed. I’m developing three creative directions next.",
      metadata: { type: "phase_advance", nextPhase: 2, jobId: job?.id ?? null },
    });
    return NextResponse.json({
      ok: true,
      next: `/projects/${id}/directions`,
      jobId: job?.id ?? null,
    });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
