import Link from "next/link";
import { notFound } from "next/navigation";
import { StoryWorkspace } from "@/components/newsroom/StoryWorkspace";
import { getStoryById } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function StoryDeskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const story = await getStoryById(id);
  if (!story) notFound();

  return (
    <div className="pt-2">
      <p className="mb-8">
        <Link href="/newsroom" className="nav-item">
          Live
        </Link>
      </p>
      <StoryWorkspace story={story} />
    </div>
  );
}
