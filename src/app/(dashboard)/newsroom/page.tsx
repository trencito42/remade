import { listClusters } from "@/lib/db/queries";
import { NewsFeed } from "@/components/newsroom/NewsFeed";
import { FetchSourcesButton } from "@/components/newsroom/FetchSourcesButton";
import { EmptyState } from "@/components/news/ArticleList";

export const dynamic = "force-dynamic";

export default async function NewsroomPage() {
  const stories = await listClusters();

  return (
    <div className="pt-2">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[12px] text-faint">
          Live
          <span className="mx-1.5">·</span>
          {stories.length} clusters
        </p>
        <FetchSourcesButton />
      </div>
      {stories.length === 0 ? (
        <EmptyState>No clusters yet. Add an RSS source and fetch.</EmptyState>
      ) : (
        <NewsFeed stories={stories} />
      )}
    </div>
  );
}
