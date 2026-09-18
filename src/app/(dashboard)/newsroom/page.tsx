import { requireAdminOrRedirect } from "@/features/auth/session";
import { getStoryWorkspace, listStoryFeed } from "@/features/stories/repository";
import { NewsroomMasterDetail } from "@/components/newsroom/NewsroomMasterDetail";

export const dynamic = "force-dynamic";

export default async function NewsroomPage({
  searchParams,
}: {
  searchParams?: Promise<{ story?: string }>;
}) {
  await requireAdminOrRedirect();
  const stories = await listStoryFeed();
  const params = await searchParams;

  const targetId = params?.story ?? (stories[0]?.id || null);
  const initialActiveStory = targetId ? await getStoryWorkspace(targetId) : null;

  return <NewsroomMasterDetail stories={stories} initialActiveStory={initialActiveStory} />;
}
