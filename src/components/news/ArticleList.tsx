import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { categoryMeta } from "@/lib/config/env";
import { StoryStatus } from "@/components/newsroom/StoryStatus";
import type { StoryStatus as StoryStatusType } from "@/types/domain";

export type PublicArticleItem = {
  id: string;
  slug: string;
  title: string;
  dek: string;
  category: string;
  publishedAt: string;
  updatedAt?: string;
  lastUpdatedAt?: string;
  sourceCount?: number;
  status?: string;
};

export function ArticleList({
  stories,
  compact = false,
}: {
  stories: PublicArticleItem[];
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

export function ArticleRow({
  story,
  compact = false,
}: {
  story: PublicArticleItem;
  compact?: boolean;
}) {
  const cat = categoryMeta[story.category] ?? { label: story.category, href: "/" };
  const dateStr = story.publishedAt || story.updatedAt || story.lastUpdatedAt || new Date().toISOString();

  return (
    <Link
      href={`/story/${story.slug}`}
      className="row group flex items-start justify-between gap-4 py-2.5"
    >
      <div className="min-w-0">
        <p className="row-meta">
          {cat.label}
          <span className="mx-1.5 text-faint">·</span>
          {formatDate(new Date(dateStr))}
        </p>
        <h2 className={`mt-1 leading-snug ${compact ? "text-[15px]" : "text-[16px]"}`}>
          <span className="row-title">{story.title}</span>
        </h2>
        {compact ? null : (
          <p className="mt-1.5 max-w-[58ch] text-[13px] leading-[1.55] text-mute">{story.dek}</p>
        )}
      </div>
      <p className="row-trail hidden shrink-0 pt-4 text-[12px] text-mute sm:block">
        {story.sourceCount ?? 1} sources
        <span className="mx-1.5 text-faint">·</span>
        <StoryStatus status={(story.status as StoryStatusType) ?? "published"} />
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
