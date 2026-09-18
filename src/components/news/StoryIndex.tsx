import { ArticleList, EmptyState, type PublicArticleItem } from "@/components/news/ArticleList";

const categoryDescriptions: Record<string, string> = {
  Gaming: "Verified reporting across games, studios, and platforms.",
  Hardware: "Silicon benchmarks, architecture breakdowns, and device releases.",
  Technology: "Primary announcements, security research, and industry developments.",
  AI: "Model architectures, compute infrastructure, and research breakthroughs.",
  Latest: "Real-time chronological wire of published verified coverage.",
};

export function StoryIndex({
  title,
  stories,
  description,
}: {
  title: string;
  stories: PublicArticleItem[];
  description?: string;
}) {
  const desc = description ?? categoryDescriptions[title] ?? "Verified coverage and primary source tracking.";

  return (
    <div className="pt-4 pb-16">
      {/* Editorial Section Header */}
      <header className="mb-6 pb-4 border-b border-line">
        <div className="flex items-baseline justify-between gap-4">
          <h1 className="text-[22px] sm:text-[26px] font-semibold tracking-[-0.03em] text-ink">
            {title}
          </h1>
          <span className="text-[12px] text-faint tabular">
            {stories.length} {stories.length === 1 ? "story" : "stories"}
          </span>
        </div>
        <p className="mt-1 text-[13.5px] text-mute max-w-[60ch] leading-relaxed">
          {desc}
        </p>
      </header>

      {stories.length === 0 ? (
        <EmptyState title={`No ${title.toLowerCase()} stories yet`}>
          Coverage will appear here as incoming feeds are verified and published.
        </EmptyState>
      ) : (
        <ArticleList stories={stories} />
      )}
    </div>
  );
}
