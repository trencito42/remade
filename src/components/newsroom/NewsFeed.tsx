import Link from "next/link";
import { formatTime } from "@/lib/utils";
import { categoryMeta, type MockStory } from "@/lib/mock/stories";
import { StoryStatus } from "@/components/newsroom/StoryStatus";

export function NewsFeed({ stories }: { stories: MockStory[] }) {
  return (
    <div>
      {stories.map((story) => (
        <NewsFeedItem key={story.id} story={story} />
      ))}
    </div>
  );
}

export function NewsFeedItem({ story }: { story: MockStory }) {
  const time = formatTime(new Date(story.lastUpdatedAt));
  const category = categoryMeta[story.category].label;

  return (
    <Link href={`/newsroom/${story.id}`} className="row group block py-3.5">
      <div className="flex items-start gap-5">
        <time className="tabular row-meta w-10 shrink-0 pt-0.5 text-[12px] text-mute">{time}</time>
        <div className="min-w-0 flex-1">
          <p className="row-meta text-[13px] text-mute">
            {story.leadSource} / {story.sourceCount} {story.sourceCount === 1 ? "source" : "sources"}
          </p>
          <p className="row-title mt-1 text-[16px] leading-snug tracking-[-0.02em]">{story.title}</p>
          <p className="mt-1.5 text-[12px] text-mute">
            {category}
            <span className="mx-2 text-faint">·</span>
            <StoryStatus status={story.status} />
          </p>
        </div>
      </div>
    </Link>
  );
}

export function SkeletonFeed() {
  return (
    <div className="space-y-7 py-4" aria-hidden="true">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="flex gap-5">
          <div className="mt-1 h-3 w-10 bg-wash" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-32 bg-wash" />
            <div className="h-4 w-4/5 bg-wash" />
            <div className="h-3 w-24 bg-wash" />
          </div>
        </div>
      ))}
    </div>
  );
}
