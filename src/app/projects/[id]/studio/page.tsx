import Link from "next/link";
import { RebuildStudio } from "@/components/studio/RebuildStudio";

type Props = { params: Promise<{ id: string }> };

export default async function StudioPage({ params }: Props) {
  const { id } = await params;
  return (
    <main className="shell wide workflow-shell">
      <header className="topbar">
        <Link className="brand" href="/">
          Remade
        </Link>
      </header>
      <RebuildStudio projectId={id} />
    </main>
  );
}
