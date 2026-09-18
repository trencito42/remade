import { NextResponse } from "next/server";
import { z } from "zod";
import { getProject } from "@/lib/db/repositories";
import {
  addEditMessage,
  createWebsiteVersion,
  getCurrentVersion,
  listEditMessages,
  listWebsiteVersions,
  setCurrentVersion,
} from "@/lib/db/artifacts";
import { applyEditRequestWithAi } from "@/lib/agents/edit";
import { renderSiteHtml } from "@/lib/render/html";
import { canUseFeature, entitlementMessage } from "@/lib/entitlements/types";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  if (!getProject(id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({
    messages: listEditMessages(id).map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      metadata: m.metadata_json ? JSON.parse(m.metadata_json) : null,
      createdAt: m.created_at,
    })),
    versions: listWebsiteVersions(id),
  });
}

const PostSchema = z.object({
  action: z.enum(["edit", "undo", "redo", "restore"]),
  content: z.string().optional(),
  versionId: z.string().optional(),
});

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  if (!getProject(id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = PostSchema.parse(await request.json());
  const editsUsed = listEditMessages(id).filter((m) => m.role === "user").length;

  if (body.action === "edit") {
    if (!canUseFeature("ai_edits", { aiEditsUsed: editsUsed })) {
      return NextResponse.json(
        { error: entitlementMessage("ai_edits") },
        { status: 402 },
      );
    }
    const content = (body.content ?? "").trim();
    if (!content) {
      return NextResponse.json({ error: "content required" }, { status: 400 });
    }
    const current = getCurrentVersion(id);
    if (!current) {
      return NextResponse.json({ error: "No website yet" }, { status: 409 });
    }

    addEditMessage({ projectId: id, role: "user", content });
    const result = await applyEditRequestWithAi({ projectId: id, site: current.site, request: content });
    const html = renderSiteHtml(result.site);
    const versionId = createWebsiteVersion({
      projectId: id,
      label: `Edit: ${content.slice(0, 40)}`,
      source: "edit",
      site: result.site,
      html,
      parentVersionId: current.id,
    });
    addEditMessage({
      projectId: id,
      role: "assistant",
      content: result.summary,
      metadata: { versionId },
    });
    return NextResponse.json({ ok: true, summary: result.summary, versionId });
  }

  if (body.action === "undo") {
    const current = getCurrentVersion(id);
    if (!current?.parent_version_id) {
      return NextResponse.json({ error: "Nothing to undo" }, { status: 400 });
    }
    setCurrentVersion(id, current.parent_version_id);
    addEditMessage({
      projectId: id,
      role: "system",
      content: "Undid to previous version.",
      metadata: { versionId: current.parent_version_id },
    });
    return NextResponse.json({ ok: true, versionId: current.parent_version_id });
  }

  if (body.action === "redo" || body.action === "restore") {
    if (!body.versionId) {
      return NextResponse.json({ error: "versionId required" }, { status: 400 });
    }
    setCurrentVersion(id, body.versionId);
    addEditMessage({
      projectId: id,
      role: "system",
      content: `Restored version ${body.versionId}`,
      metadata: { versionId: body.versionId },
    });
    return NextResponse.json({ ok: true, versionId: body.versionId });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
