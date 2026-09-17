import { NextResponse } from "next/server";
import { getCurrentVersion, getProjectByShareToken } from "@/lib/db/artifacts";
import { getProject } from "@/lib/db/repositories";

export const runtime = "nodejs";

type Params = { params: Promise<{ token: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { token } = await params;
  const projectId = getProjectByShareToken(token);
  if (!projectId) {
    return NextResponse.json({ error: "Share link not found" }, { status: 404 });
  }
  const project = getProject(projectId);
  const current = getCurrentVersion(projectId);
  if (!project || !current) {
    return NextResponse.json({ error: "Not ready" }, { status: 404 });
  }

  return NextResponse.json({
    projectId,
    sourceUrl: project.source_url,
    title: project.title ?? current.site.meta.title,
    rebuiltPreviewPath: `/api/projects/${projectId}/preview`,
  });
}
