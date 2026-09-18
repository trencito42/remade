import { NewsFeed } from "@/components/newsroom/NewsFeed";
import { stories } from "@/lib/mock/stories";

export default function NewsroomPage() {
  const ordered = [...stories].sort(
    (a, b) => new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime(),
  );

  return (
    <div className="pt-2">
      <NewsFeed stories={ordered} />
    </div>
  );
}
