import Link from "next/link";
import { notFound } from "next/navigation";
import { StoryWorkspace } from "@/components/newsroom/StoryWorkspace";
import { storyById } from "@/lib/mock/stories";

export default async function StoryDeskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const story = storyById(id);
  if (!story) notFound();

  return (
    <div className="pt-2">
      <p className="mb-8">
        <Link href="/newsroom" className="nav-link text-[13px]">
          Live
        </Link>
      </p>
      <StoryWorkspace story={story} />
    </div>
  );
}
