import { getCurrentVersion } from "@/lib/db/artifacts";
import { getProject } from "@/lib/db/repositories";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ id: string }> };

export default async function PublicPreviewPage({ params }: Props) {
  const { id } = await params;
  const project = getProject(id);
  const version = getCurrentVersion(id);
  if (!project || !version) notFound();

  return (
    <iframe
      title="Published preview"
      src={`/api/projects/${id}/preview`}
      style={{ border: 0, width: "100vw", height: "100vh" }}
      sandbox="allow-same-origin"
    />
  );
}
