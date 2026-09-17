import { NextResponse } from "next/server";
import {
  getCurrentVersion,
  getWebsiteVersion,
} from "@/lib/db/artifacts";
import { getProject } from "@/lib/db/repositories";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  const project = getProject(id);
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const url = new URL(request.url);
  const versionId = url.searchParams.get("versionId");
  const version = versionId
    ? getWebsiteVersion(versionId)
    : getCurrentVersion(id);

  if (!version || ("project_id" in version && version.project_id !== id)) {
    // getCurrentVersion doesn't have project_id field check
  }

  const resolved = versionId
    ? getWebsiteVersion(versionId)
    : getCurrentVersion(id);

  if (!resolved) {
    return new NextResponse("Preview not ready", { status: 404 });
  }

  if ("project_id" in resolved && resolved.project_id !== id) {
    return new NextResponse("Not found", { status: 404 });
  }

  return new NextResponse(resolved.html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy":
        "default-src 'none'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src data: https:; base-uri 'none'; form-action 'none'; frame-ancestors 'self'",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-store",
    },
  });
}
