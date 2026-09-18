import Link from "next/link";
import { notFound } from "next/navigation";
import { StoryWorkspace } from "@/components/newsroom/StoryWorkspace";
import { getStoryWorkspace } from "@/features/stories/repository";
import { requireAdminOrRedirect } from "@/features/auth/session";

export const dynamic = "force-dynamic";

export default async function StoryDeskPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminOrRedirect();
  const { id } = await params;
  const story = await getStoryWorkspace(id);
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
