import Link from "next/link";
import Image from "next/image";
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
    .slice(0, 4);
  const latest = rest.slice(0, 6);
  const shown = new Set([lead.id, ...latest.map((story) => story.id)]);

  const leadCat = categoryMeta[lead.category] ?? { label: lead.category, href: "/" };

  return (
    <div className="pt-3 pb-16">
      {/* Developing Stories Strip (Horizontally Scrollable on Mobile with Snap) */}
      {developing.length > 0 && (
        <div className="mb-6 border-b border-line pb-2.5">
          <div className="flex items-center gap-2 mb-2 text-[11.5px] font-semibold text-mute">
            <span className="status-dot status-dot-warn" />
            <span>Developing Wire</span>
            <span className="text-faint font-normal">({developing.length})</span>
          </div>

          <div className="flex items-center gap-3 overflow-x-auto scroll-subtle -mx-3 px-3 sm:mx-0 sm:px-0 snap-x">
            {developing.map((story) => (
              <Link
                key={story.id}
                href={`/story/${story.slug}`}
                className="snap-start shrink-0 rounded-md bg-s1/60 hover:bg-s1 px-2.5 py-1 text-[12px] text-mute hover:text-ink transition-colors max-w-[280px] truncate"
              >
                {story.title}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 2-Column Front Page: Dominant Lead (Left) + Latest Stream (Right) */}
      <div className="lg:grid lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-12 items-start border-b border-line pb-12">
        {/* Left: Dominant Lead Story */}
        <article className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-[12px] text-mute mb-2.5">
            <span className="font-semibold text-ink capitalize text-[12px]">{leadCat.label}</span>
            <span className="text-faint">·</span>
            <StatusIndicator status={lead.status} showIcon size="sm" />
            <span className="text-faint">·</span>
            <span className="tabular">{lead.sourceCount} {lead.sourceCount === 1 ? "source" : "sources"}</span>
            <span className="text-faint">·</span>
            <time className="tabular text-faint">{formatDate(new Date(lead.publishedAt))}</time>
          </div>

          {lead.heroImage && (
            <div className="relative aspect-[16/9] w-full overflow-hidden rounded-lg mb-4 bg-s1">
              <Image
                src={lead.heroImage}
                alt={lead.title}
                fill
                sizes="(max-width: 1024px) 100vw, 650px"
                className="object-cover"
                priority
              />
            </div>
          )}

          <h1 className="text-[28px] sm:text-[32px] md:text-[36px] font-semibold leading-[1.12] tracking-[-0.035em] text-ink text-pretty">
            <Link href={`/story/${lead.slug}`} className="hover:opacity-90 transition-opacity">
              {lead.title}
            </Link>
          </h1>

          <p className="mt-3 max-w-[54ch] text-[15.5px] leading-[1.55] text-mute font-normal text-pretty">
            {lead.dek}
          </p>

          <div className="mt-4 pt-3 border-t border-line/60">
            <SourceCluster sources={lead.sources} />
          </div>
        </article>

        {/* Right: Latest Wire Stream */}
        <section className="mt-10 lg:mt-0 min-w-0">
          <div className="flex items-center justify-between pb-2 border-b border-line/60 mb-2">
            <Link
              href="/latest"
              className="text-[12px] font-semibold text-ink hover:text-ink/80 transition-colors"
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
                  className="text-[13px] font-semibold text-ink hover:text-ink/80 transition-colors"
                >
                  {section.label}
                </Link>
                <Link href={section.href} className="text-[11.5px] text-faint hover:text-ink">
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
