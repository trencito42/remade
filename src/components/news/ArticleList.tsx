import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { categoryMeta, type MockStory } from "@/lib/mock/stories";
import { StoryStatus } from "@/components/newsroom/StoryStatus";

export function ArticleList({
  stories,
  compact = false,
}: {
  stories: MockStory[];
  compact?: boolean;
}) {
  return (
    <div>
      {stories.map((story) => (
        <ArticleRow key={story.id} story={story} compact={compact} />
      ))}
    </div>
  );
}

export function ArticleRow({ story, compact = false }: { story: MockStory; compact?: boolean }) {
  return (
    <Link href={`/story/${story.slug}`} className="row group flex items-start justify-between gap-4 py-2.5">
      <div className="min-w-0">
        <p className="row-meta">
          {categoryMeta[story.category].label}
          <span className="mx-1.5 text-faint">·</span>
          {formatDate(new Date(story.lastUpdatedAt))}
        </p>
        <h2 className={`mt-1 leading-snug ${compact ? "text-[15px]" : "text-[16px]"}`}>
          <span className="row-title">{story.title}</span>
        </h2>
        {compact ? null : (
          <p className="mt-1.5 max-w-[58ch] text-[13px] leading-[1.55] text-mute">{story.dek}</p>
        )}
      </div>
      <p className="row-trail hidden shrink-0 pt-4 text-[12px] text-mute sm:block">
        {story.sourceCount} sources
        <span className="mx-1.5 text-faint">·</span>
        <StoryStatus status={story.status} />
      </p>
    </Link>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="py-16 text-[13px] text-mute">{children}</p>;
}

export function SkeletonArticles() {
  return (
    <div className="space-y-3 pt-3" aria-hidden="true">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="space-y-2 px-2 py-2">
          <div className="h-3 w-24 bg-s1" />
          <div className="h-4 w-4/5 bg-s1" />
        </div>
      ))}
    </div>
  );
}
