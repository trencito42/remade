import Link from "next/link";
import { formatDate, formatTime } from "@/lib/utils";
import { categoryMeta } from "@/lib/config/env";
import { StatusIndicator } from "@/components/ui/StatusIndicator";

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
  heroImage?: string | null;
};

export function ArticleList({
  stories,
  compact = false,
  showTime = false,
}: {
  stories: PublicArticleItem[];
  compact?: boolean;
  showTime?: boolean;
}) {
  return (
    <div className="divide-y divide-line/40">
      {stories.map((story) => (
        <ArticleRow key={story.id} story={story} compact={compact} showTime={showTime} />
      ))}
    </div>
  );
}

export function ArticleRow({
  story,
  compact = false,
  showTime = false,
}: {
  story: PublicArticleItem;
  compact?: boolean;
  showTime?: boolean;
}) {
  const cat = categoryMeta[story.category] ?? { label: story.category, href: "/" };
  const dateRaw = story.publishedAt || story.updatedAt || story.lastUpdatedAt;
  const dateObj = dateRaw ? new Date(dateRaw) : new Date(0);
  const dateStr = showTime ? formatTime(dateObj) : formatDate(dateObj);

  return (
    <Link
      href={`/story/${story.slug}`}
      className="row group flex items-start justify-between gap-4 py-2.5 px-2 rounded-lg transition-colors hover:bg-s1 active:bg-s1/90"
    >
      <div className="min-w-0 flex-1">
        <div className="row-meta flex items-center gap-1.5 text-[11.5px] text-mute mb-1">
          <span className="font-medium text-ink/80 capitalize">{cat.label}</span>
          <span className="text-faint">·</span>
          <time className="tabular text-faint">{dateStr}</time>
        </div>
        <h2 className={`font-medium leading-snug tracking-[-0.02em] text-ink transition-transform duration-150 group-hover:translate-x-[2px] ${
          compact ? "text-[14.5px]" : "text-[16px]"
        }`}>
          {story.title}
        </h2>
        {!compact && story.dek && (
          <p className="mt-1 max-w-[58ch] text-[13px] leading-[1.55] text-mute line-clamp-2">
            {story.dek}
          </p>
        )}
      </div>

      <div className="row-trail hidden sm:flex shrink-0 items-center gap-2 pt-1 text-[11.5px] text-faint">
        <span>{story.sourceCount ?? 1} src</span>
        {story.status && (
          <>
            <span>·</span>
            <StatusIndicator status={story.status} showIcon size="sm" showLabel={false} />
          </>
        )}
      </div>
    </Link>
  );
}

export function EmptyState({
  title = "No stories yet",
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="py-20 text-center max-w-sm mx-auto">
      <p className="text-[14.5px] font-medium text-ink">{title}</p>
      <p className="mt-1.5 text-[13px] text-mute leading-relaxed">{children}</p>
    </div>
  );
}

export function SkeletonArticles() {
  return (
    <div className="space-y-3 pt-3" aria-hidden="true">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="space-y-2 px-2 py-2.5">
          <div className="h-3 w-20 bg-s1 rounded" />
          <div className="h-4 w-4/5 bg-s1 rounded" />
        </div>
      ))}
    </div>
  );
}
