import Link from "next/link";
import { AnalysisProgress } from "@/components/analysis/AnalysisProgress";

type Props = { params: Promise<{ id: string }> };

export default async function ProjectPage({ params }: Props) {
  const { id } = await params;
  return (
    <main className="shell workflow-shell">
      <header className="topbar">
        <Link className="brand" href="/">
          Remade
        </Link>
      </header>
      <AnalysisProgress projectId={id} />
    </main>
  );
}
