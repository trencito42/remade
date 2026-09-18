"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { formatTime } from "@/lib/utils";
import { categoryMeta, type MockStory } from "@/lib/mock/stories";
import { StoryStatus } from "@/components/newsroom/StoryStatus";
import { cn } from "@/lib/utils";

export function NewsFeed({
  stories,
  hrefFor,
}: {
  stories: MockStory[];
  hrefFor?: (story: MockStory) => string;
}) {
  const pathname = usePathname();

  return (
    <div>
      {stories.map((story) => {
        const href = hrefFor ? hrefFor(story) : `/newsroom/${story.id}`;
        return <NewsFeedItem key={story.id} story={story} href={href} selected={pathname === href} />;
      })}
    </div>
  );
}

export function NewsFeedItem({
  story,
  href,
  selected = false,
}: {
  story: MockStory;
  href: string;
  selected?: boolean;
}) {
  const time = formatTime(new Date(story.lastUpdatedAt));

  return (
    <Link href={href} className={cn("row group flex items-start gap-4 py-2.5", selected && "is-active")}>
      <time className="tabular w-9 shrink-0 pt-0.5 text-[12px] text-mute">{time}</time>
      <div className="min-w-0 flex-1">
        <p className="row-title text-[14px] leading-snug">{story.title}</p>
        <p className="row-meta mt-1">
          {story.leadSource}
          <span className="mx-1.5 text-faint">·</span>
          {categoryMeta[story.category].label}
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
