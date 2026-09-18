import { requireAdminOrRedirect } from "@/features/auth/session";
import { listStoryFeed } from "@/features/stories/repository";
import { NewsFeed } from "@/components/newsroom/NewsFeed";
import { FetchSourcesButton } from "@/components/newsroom/FetchSourcesButton";
import { EmptyState } from "@/components/news/ArticleList";

export const dynamic = "force-dynamic";

export default async function NewsroomPage() {
  await requireAdminOrRedirect();
  const stories = await listStoryFeed();

  return (
    <div className="pt-2">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[12px] text-faint">
          Live
          <span className="mx-1.5">·</span>
          {stories.length} {stories.length === 1 ? "cluster" : "clusters"}
        </p>
        <FetchSourcesButton />
      </div>
      {stories.length === 0 ? (
        <EmptyState>No clusters yet. Add an RSS source in Sources and fetch.</EmptyState>
      ) : (
        <NewsFeed stories={stories} />
      )}
    </div>
  );
}
