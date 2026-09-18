import Link from "next/link";
import { DirectionsStudio } from "@/components/directions/DirectionsStudio";

type Props = { params: Promise<{ id: string }> };

export default async function DirectionsPage({ params }: Props) {
  const { id } = await params;
  return (
    <main className="shell wide workflow-shell">
      <header className="topbar">
        <Link className="brand" href="/">
          Remade
        </Link>
      </header>
      <DirectionsStudio projectId={id} />
    </main>
  );
}
