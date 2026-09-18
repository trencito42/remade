import Link from "next/link";
import { ArticleList, EmptyState } from "@/components/news/ArticleList";
import { categoryMeta } from "@/lib/config/env";
import { listPublishedArticles } from "@/features/publishing/repository";
import { formatDate } from "@/lib/utils";
import { SourceCluster } from "@/components/ui/SourceDetail";
import { StatusIndicator } from "@/components/ui/StatusIndicator";

export const dynamic = "force-dynamic";

const sections = [
  { href: "/gaming", category: "gaming", label: "Gaming" },
  { href: "/hardware", category: "hardware", label: "Hardware" },
  { href: "/technology", category: "technology", label: "Tech" },
  { href: "/ai", category: "ai", label: "AI" },
];

export default async function HomePage() {
  const published = await listPublishedArticles(undefined, 30);

  const [lead, ...rest] = published;
  if (!lead) {
    return (
      <EmptyState title="No published stories yet">
        Articles published from the newsroom will automatically appear here on the front page wire.
      </EmptyState>
    );
  }

  const developing = published
    .filter((story) => story.status === "developing" && story.id !== lead.id)
    .slice(0, 3);
  const latest = rest.slice(0, 6);
  const shown = new Set([lead.id, ...latest.map((story) => story.id)]);

  const leadCat = categoryMeta[lead.category] ?? { label: lead.category, href: "/" };

  return (
    <div className="pt-4">
      {/* Optional Developing Ticker */}
      {developing.length > 0 && (
        <div className="mb-6 flex items-center gap-3 overflow-hidden text-[12px] border-b border-line pb-2.5">
          <span className="shrink-0 font-medium text-mute flex items-center gap-1.5">
            <span className="status-dot status-dot-warn" />
            <span>Developing</span>
          </span>
          <span className="text-faint">·</span>
          <div className="min-w-0 truncate text-mute space-x-3">
            {developing.map((story, index) => (
              <span key={story.id}>
                {index > 0 ? <span className="text-faint mr-3">·</span> : null}
                <Link href={`/story/${story.slug}`} className="hover:text-ink transition-colors font-normal">
                  {story.title}
                </Link>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Desktop 2-Column Hero: Lead Story (Left) + Latest Stream (Right) */}
      <div className="lg:grid lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-12 items-start border-b border-line pb-12">
        {/* Left: Lead Story */}
        <article className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-[12px] text-mute mb-2">
            <span className="font-semibold text-ink uppercase tracking-wider text-[11px]">{leadCat.label}</span>
            <span className="text-faint">·</span>
            <StatusIndicator status={lead.status} showIcon size="sm" />
            <span className="text-faint">·</span>
            <span className="tabular">{lead.sourceCount} {lead.sourceCount === 1 ? "source" : "sources"}</span>
            <span className="text-faint">·</span>
            <time className="tabular text-faint">{formatDate(new Date(lead.publishedAt))}</time>
          </div>

          <h1 className="text-[28px] md:text-[34px] font-semibold leading-[1.12] tracking-[-0.035em] text-ink text-pretty">
            <Link href={`/story/${lead.slug}`} className="hover:opacity-90 transition-opacity">
              {lead.title}
            </Link>
          </h1>

          <p className="mt-3 max-w-[54ch] text-[15.5px] leading-[1.55] text-mute font-normal">
            {lead.dek}
          </p>

          <div className="mt-4 pt-3 border-t border-line/60">
            <SourceCluster sources={lead.sources} />
          </div>
        </article>

        {/* Right: Latest Stream */}
        <section className="mt-10 lg:mt-0 min-w-0">
          <div className="flex items-center justify-between pb-2 border-b border-line/60 mb-2">
            <Link
              href="/latest"
              className="text-[11.5px] font-semibold uppercase tracking-wider text-faint hover:text-ink transition-colors"
            >
              Latest Wire
            </Link>
            <span className="text-[11px] text-faint tabular">Updated live</span>
          </div>
          <ArticleList stories={latest} compact showTime />
        </section>
      </div>

      {/* Category Sections Below */}
      <div className="mt-12 grid gap-x-14 gap-y-10 sm:grid-cols-2">
        {sections.map((section) => {
          const stories = published
            .filter((story) => story.category === section.category && !shown.has(story.id))
            .slice(0, 3);
          if (stories.length === 0) return null;
          return (
            <section key={section.href}>
              <div className="flex items-center justify-between pb-2 border-b border-line/60 mb-1.5">
                <Link
                  href={section.href}
                  className="text-[12px] font-semibold uppercase tracking-wider text-faint hover:text-ink transition-colors"
                >
                  {section.label}
                </Link>
                <Link href={section.href} className="text-[11px] text-faint hover:text-ink">
                  View all →
                </Link>
              </div>
              <ArticleList stories={stories} compact />
            </section>
          );
        })}
      </div>
    </div>
  );
}
