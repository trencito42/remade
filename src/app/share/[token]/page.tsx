import Link from "next/link";
import { getCurrentVersion, getProjectByShareToken } from "@/lib/db/artifacts";
import { getProject } from "@/lib/db/repositories";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ token: string }> };

export default async function SharePage({ params }: Props) {
  const { token } = await params;
  const projectId = getProjectByShareToken(token);
  if (!projectId) notFound();
  const project = getProject(projectId);
  const version = getCurrentVersion(projectId);
  if (!project || !version) notFound();

  return (
    <main className="shell wide">
      <header className="topbar">
        <Link className="brand" href="/">
          Remade
        </Link>
      </header>
      <p className="eyebrow">Before / after</p>
      <h1>{project.title ?? version.site.meta.title}</h1>
      <p className="lede">
        Shareable comparison of the original site and the rebuild.
      </p>
      <div className="compare-grid">
        <section>
          <h2>Original</h2>
          <iframe
            title="Original"
            className="site-preview"
            src={project.source_url}
            referrerPolicy="no-referrer"
          />
        </section>
        <section>
          <h2>Rebuilt</h2>
          <iframe
            title="Rebuilt"
            className="site-preview"
            src={`/api/projects/${projectId}/preview`}
            sandbox="allow-same-origin"
          />
        </section>
      </div>
    </main>
  );
}
