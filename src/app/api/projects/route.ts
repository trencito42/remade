import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { CreateProjectInputSchema } from "@/lib/schemas/jobs";
import { normalizeInputUrl, UnsafeUrlError } from "@/lib/security/url";
import {
  createAnalysisJob,
  createProject,
} from "@/lib/db/repositories";
import { kickOffAnalysisJob } from "@/lib/jobs/runner";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = CreateProjectInputSchema.parse(await request.json());
    const url = normalizeInputUrl(body.url);
    const project = createProject({
      sourceUrl: body.url.trim(),
      normalizedUrl: url.toString(),
    });
    const job = createAnalysisJob(project.id);
    kickOffAnalysisJob(job.id, project.id);

    return NextResponse.json({
      projectId: project.id,
      jobId: job.id,
      status: project.status,
    });
  } catch (error) {
    if (error instanceof UnsafeUrlError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Could not create project." }, { status: 500 });
  }
}
