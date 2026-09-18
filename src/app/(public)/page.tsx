import Link from "next/link";
import { ArticleList, EmptyState } from "@/components/news/ArticleList";
import { categoryMeta } from "@/lib/config/env";
import { listPublishedArticles } from "@/features/publishing/repository";
import { formatDate } from "@/lib/utils";
import { SourceCluster } from "@/components/ui/SourceDetail";
import { StoryStatus } from "@/components/newsroom/StoryStatus";
import type { StoryStatus as StoryStatusType } from "@/types/domain";

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
      <EmptyState>
        No published stories yet. Articles will appear here once published from the newsroom.
      </EmptyState>
    );
  }

  const developing = published
    .filter((story) => story.status === "developing" && story.id !== lead.id)
    .slice(0, 3);
  const latest = rest.slice(0, 5);
  const shown = new Set([lead.id, ...latest.map((story) => story.id)]);

  const leadCat = categoryMeta[lead.category] ?? { label: lead.category, href: "/" };

  return (
    <div className="pt-5">
      {developing.length > 0 ? (
        <p className="mb-8 flex min-w-0 items-baseline gap-3 overflow-hidden text-[12px]">
          <span className="shrink-0 text-faint">Developing</span>
          <span className="min-w-0 truncate text-mute">
            {developing.map((story, index) => (
              <span key={story.id}>
                {index > 0 ? <span className="text-faint"> · </span> : null}
                <Link href={`/story/${story.slug}`} className="hover:text-ink">
                  {story.title}
                </Link>
              </span>
            ))}
          </span>
        </p>
      ) : null}

      <article className="pb-10">
        <p className="lead-kicker">
          {leadCat.label}
          <span className="mx-1.5 text-faint">·</span>
          <StoryStatus status={lead.status as StoryStatusType} />
          <span className="mx-1.5 text-faint">·</span>
          {lead.sourceCount} {lead.sourceCount === 1 ? "source" : "sources"}
          <span className="mx-1.5 text-faint">·</span>
          {formatDate(new Date(lead.publishedAt))}
        </p>
        <h1 className="mt-2 max-w-[40rem] text-[30px] leading-[1.12] tracking-[-0.04em] text-pretty md:text-[36px]">
          <Link href={`/story/${lead.slug}`} className="row-title">
            {lead.title}
          </Link>
        </h1>
        <p className="mt-3 max-w-[42rem] text-[16px] leading-[1.5] text-mute">{lead.dek}</p>
        <div className="mt-3">
          <SourceCluster sources={lead.sources} />
        </div>
      </article>

      <section>
        <SectionLabel href="/latest">Latest</SectionLabel>
        <ArticleList stories={latest} compact />
      </section>

      <div className="mt-14 grid gap-x-16 gap-y-10 md:grid-cols-2">
        {sections.map((section) => {
          const stories = published
            .filter((story) => story.category === section.category && !shown.has(story.id))
            .slice(0, 3);
          if (stories.length === 0) return null;
          return (
            <section key={section.href}>
              <SectionLabel href={section.href}>{section.label}</SectionLabel>
              <ArticleList stories={stories} compact />
            </section>
          );
        })}
      </div>
    </div>
  );
}

function SectionLabel({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <p className="mb-1">
      <Link
        href={href}
        className="text-[12px] text-faint transition-colors duration-[160ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] hover:text-ink"
      >
        {children}
      </Link>
    </p>
  );
}
