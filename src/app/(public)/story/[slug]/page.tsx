import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { categoryMeta, getEnv } from "@/lib/config/env";
import { getPublishedArticleBySlug, listPublishedArticles } from "@/features/publishing/repository";
import { formatDate } from "@/lib/utils";
import { ArticleList } from "@/components/news/ArticleList";
import { SourceDetail } from "@/components/ui/SourceDetail";
import { StatusIndicator } from "@/components/ui/StatusIndicator";
import { ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const story = await getPublishedArticleBySlug(slug);
  if (!story) return { title: "Not Found — Dispatch" };

  const env = getEnv();
  const canonical = `${env.siteUrl}/story/${story.slug}`;

  return {
    title: `${story.seoTitle || story.title} — Dispatch`,
    description: story.seoDescription || story.dek,
    alternates: {
      canonical,
    },
    openGraph: {
      title: story.title,
      description: story.dek,
      url: canonical,
      siteName: env.siteName,
      type: "article",
      publishedTime: story.publishedAt,
      modifiedTime: story.updatedAt,
      section: story.category,
    },
    twitter: {
      card: "summary_large_image",
      title: story.title,
      description: story.dek,
    },
  };
}

export default async function StoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const story = await getPublishedArticleBySlug(slug);
  if (!story) notFound();

  const related = (await listPublishedArticles(story.category, 4))
    .filter((item) => item.slug !== story.slug)
    .slice(0, 3);

  const cat = categoryMeta[story.category] ?? { label: story.category, href: `/${story.category}` };
  const env = getEnv();

  const primaryCount = story.sources.filter((s) => s.isPrimary).length;
  const independentCount = story.sources.filter((s) => s.tier <= 1 && !s.isPrimary).length;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: story.title,
    description: story.dek,
    datePublished: story.publishedAt,
    dateModified: story.updatedAt,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${env.siteUrl}/story/${story.slug}`,
    },
    publisher: {
      "@type": "Organization",
      name: env.siteName,
      url: env.siteUrl,
    },
  };

  return (
    <article className="pt-8 pb-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Article Header */}
      <header className="max-w-[780px] border-b border-line pb-8">
        <div className="flex flex-wrap items-center gap-2 text-[12px] text-mute mb-3">
          <span className="font-semibold text-ink uppercase tracking-wider text-[11px]">{cat.label}</span>
          <span className="text-faint">·</span>
          <StatusIndicator status={story.status} showIcon size="sm" />
          <span className="text-faint">·</span>
          <time className="tabular text-faint">{formatDate(new Date(story.updatedAt || story.publishedAt))}</time>
          <span className="text-faint">·</span>
          <span className="tabular">{story.sourceCount} {story.sourceCount === 1 ? "source" : "sources"}</span>
        </div>

        <h1 className="text-[32px] sm:text-[38px] md:text-[42px] font-semibold leading-[1.12] tracking-[-0.038em] text-ink text-pretty">
          {story.title}
        </h1>

        <p className="mt-4 text-[17px] sm:text-[18.5px] leading-[1.5] text-mute font-normal text-pretty">
          {story.dek}
        </p>
      </header>

      {/* Article Body (constrained to readable width 680-700px) */}
      <div className="max-w-[690px] mt-8 space-y-6 text-[17px] leading-[1.75] text-ink/90 font-normal">
        {story.body.map((block) => {
          if (block.type === "h2") {
            return (
              <h2
                key={block.id}
                className="pt-4 text-[22px] md:text-[24px] font-semibold tracking-[-0.025em] text-ink text-pretty"
              >
                {block.text}
              </h2>
            );
          }
          if (block.type === "quote") {
            return (
              <blockquote
                key={block.id}
                className="border-l-2 border-ink/40 pl-4 py-1 text-[18px] italic text-mute leading-relaxed my-4"
              >
                {block.text}
              </blockquote>
            );
          }
          return (
            <p key={block.id} className="text-pretty">
              {block.text}
            </p>
          );
        })}
      </div>

      {/* How this was reported */}
      <section className="max-w-[690px] mt-16 pt-8 border-t border-line">
        <div className="flex items-center gap-2 mb-1.5">
          <ShieldCheck size={16} className="text-ok" />
          <h2 className="text-[13px] font-semibold uppercase tracking-wider text-ink">
            How this was reported
          </h2>
        </div>

        <p className="text-[12px] text-faint tabular mb-3">
          {story.sourceCount} source{story.sourceCount === 1 ? "" : "s"}
          {independentCount > 0 ? ` · ${independentCount} independent confirmation${independentCount === 1 ? "" : "s"}` : ""}
          {primaryCount > 0 ? ` · ${primaryCount} primary source` : ""}
        </p>

        <p className="text-[13px] leading-relaxed text-mute mb-4">
          Dispatch clusters overlapping reporting and attributes original evidence. Secondary repetition of the same press release or announcement is not treated as independent confirmation.
        </p>

        <ul className="divide-y divide-line/40 border-t border-line/60">
          {story.sources.map((source) => (
            <li key={source.id} className="py-1">
              <SourceDetail source={source} />
            </li>
          ))}
        </ul>
      </section>

      {/* Related Stories */}
      {related.length > 0 ? (
        <section className="max-w-[690px] mt-14 pt-8 border-t border-line">
          <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-faint">
            More in {cat.label}
          </h2>
          <ArticleList stories={related} compact />
        </section>
      ) : null}
    </article>
  );
}
