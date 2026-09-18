"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { formatTime } from "@/lib/utils";
import { categoryMeta } from "@/lib/config/env";
import { StoryStatus } from "@/components/newsroom/StoryStatus";
import type { StoryFeedItem } from "@/types/domain";
import { cn } from "@/lib/utils";

export function NewsFeed({
  stories,
  hrefFor,
}: {
  stories: StoryFeedItem[];
  hrefFor?: (story: StoryFeedItem) => string;
}) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const pathname = usePathname();

  const filtered = useMemo(() => {
    return stories.filter((story) => {
      if (selectedCategory !== "all" && story.category !== selectedCategory) return false;
      if (selectedStatus !== "all" && story.status !== selectedStatus) return false;
      return true;
    });
  }, [stories, selectedCategory, selectedStatus]);

  return (
    <div>
      {/* Subtle Filters */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-2.5 text-[12px]">
        <div className="flex items-center gap-1">
          <span className="mr-1 text-faint">Category:</span>
          {["all", "technology", "gaming", "hardware", "ai"].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                "nav-item h-6 px-2 text-[11px] capitalize",
                selectedCategory === cat && "is-active",
              )}
            >
              {cat === "all" ? "All" : categoryMeta[cat]?.label ?? cat}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <span className="mr-1 text-faint">Status:</span>
          {["all", "developing", "confirmed", "disputed"].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setSelectedStatus(st)}
              className={cn(
                "nav-item h-6 px-2 text-[11px] capitalize",
                selectedStatus === st && "is-active",
              )}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="py-8 text-[13px] text-mute">
          No stories match the active filters.
        </p>
      ) : (
        <div>
          {filtered.map((story) => {
            const href = hrefFor ? hrefFor(story) : `/newsroom/${story.id}`;
            return (
              <NewsFeedItem
                key={story.id}
                story={story}
                href={href}
                selected={pathname === href}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export function NewsFeedItem({
  story,
  href,
  selected = false,
}: {
  story: StoryFeedItem;
  href: string;
  selected?: boolean;
}) {
  const time = formatTime(new Date(story.lastUpdatedAt));
  const cat = categoryMeta[story.category] ?? { label: story.category, href: "/" };

  return (
    <Link
      href={href}
      className={cn("row group flex items-start gap-4 py-2.5", selected && "is-active")}
    >
      <time className="tabular w-9 shrink-0 pt-0.5 text-[12px] text-mute">{time}</time>
      <div className="min-w-0 flex-1">
        <p className="row-title text-[14px] leading-snug">{story.workingTitle}</p>
        <p className="row-meta mt-1">
          {story.leadSourceName ?? "Wire"}
          <span className="mx-1.5 text-faint">·</span>
          {cat.label}
        </p>
      </div>
      <p className="row-trail hidden shrink-0 pt-0.5 text-[12px] text-mute sm:block">
        {story.sourceCount} src
        <span className="mx-1.5 text-faint">·</span>
        <StoryStatus status={story.status} />
      </p>
    </Link>
  );
}

export function SkeletonFeed() {
  return (
    <div className="space-y-3 py-3" aria-hidden="true">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="flex gap-4 px-2 py-2">
          <div className="mt-1 h-3 w-9 bg-s1" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-4/5 bg-s1" />
            <div className="h-3 w-28 bg-s1" />
          </div>
        </div>
      ))}
    </div>
  );
}
