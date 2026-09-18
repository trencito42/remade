import Link from "next/link";
import { notFound } from "next/navigation";
import { StoryWorkspace } from "@/components/newsroom/StoryWorkspace";
import { getStoryWorkspace } from "@/features/stories/repository";
import { requireAdminOrRedirect } from "@/features/auth/session";

import { NewsroomBackButton } from "@/components/newsroom/NewsroomBackButton";

export const dynamic = "force-dynamic";

export default async function StoryDeskPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminOrRedirect();
  const { id } = await params;
  const story = await getStoryWorkspace(id);
  if (!story) notFound();

  return (
    <div className="pt-2 pb-16">
      <div className="mb-4 pb-2 border-b border-line">
        <NewsroomBackButton />
      </div>
      <StoryWorkspace story={story} />
    </div>
  );
}
