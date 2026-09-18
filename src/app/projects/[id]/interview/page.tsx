import Link from "next/link";
import { GrillMe } from "@/components/interview/GrillMe";

type Props = { params: Promise<{ id: string }> };

export default async function InterviewPage({ params }: Props) {
  const { id } = await params;
  return (
    <main className="shell workflow-shell">
      <header className="topbar">
        <Link className="brand" href="/">
          Remade
        </Link>
      </header>
      <GrillMe projectId={id} />
    </main>
  );
}
