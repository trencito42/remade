import { NextResponse } from "next/server";
import { z } from "zod";
import { getProject } from "@/lib/db/repositories";
import {
  createDeployment,
  createShareLink,
  getCurrentVersion,
  getLatestDeployment,
} from "@/lib/db/artifacts";
import {
  canUseFeature,
  entitlementMessage,
} from "@/lib/entitlements/types";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  if (!getProject(id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const deployment = getLatestDeployment(id);
  return NextResponse.json({ deployment });
}

const PostSchema = z.object({
  action: z.enum(["publish_preview", "request_custom_domain", "create_share"]),
  domain: z.string().optional(),
});

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  if (!getProject(id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = PostSchema.parse(await request.json());
  const current = getCurrentVersion(id);
  if (!current) {
    return NextResponse.json({ error: "No website to publish" }, { status: 409 });
  }

  if (body.action === "publish_preview") {
    if (!canUseFeature("publish")) {
      return NextResponse.json(
        { error: entitlementMessage("publish") },
        { status: 402 },
      );
    }
    const previewPath = `/p/${id}`;
    const deploymentId = createDeployment({
      projectId: id,
      versionId: current.id,
      kind: "preview",
      previewPath,
    });
    return NextResponse.json({
      ok: true,
      deploymentId,
      previewPath,
      note: "MVP preview deployment serves the sandboxed HTML preview route.",
    });
  }

  if (body.action === "request_custom_domain") {
    if (!canUseFeature("custom_domain", { hasPaidPlan: false })) {
      return NextResponse.json(
        {
          error: entitlementMessage("custom_domain"),
          architecture:
            "Custom domains require DNS CNAME → edge, SSL provisioning, and deployment binding. Not activated on free plan.",
        },
        { status: 402 },
      );
    }
  }

  if (body.action === "create_share") {
    const token = createShareLink(id);
    return NextResponse.json({
      ok: true,
      path: `/share/${token}`,
    });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
