import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { categoryMeta, getEnv } from "@/lib/config/env";
import { getPublishedArticleBySlug, listPublishedArticles } from "@/features/publishing/repository";
import { formatDate } from "@/lib/utils";
import { ArticleList } from "@/components/news/ArticleList";
import { SourceDetail } from "@/components/ui/SourceDetail";
import { StoryStatus } from "@/components/newsroom/StoryStatus";
import type { StoryStatus as StoryStatusType } from "@/types/domain";

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
    <article className="measure pt-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <p className="lead-kicker">
        {cat.label}
        <span className="mx-1.5 text-faint">·</span>
        <StoryStatus status={story.status as StoryStatusType} />
        <span className="mx-1.5 text-faint">·</span>
        {formatDate(new Date(story.updatedAt || story.publishedAt))}
        <span className="mx-1.5 text-faint">·</span>
        {story.sourceCount} {story.sourceCount === 1 ? "source" : "sources"}
      </p>
      <h1 className="mt-3 text-[32px] leading-[1.16] tracking-[-0.038em] text-pretty md:text-[40px]">{story.title}</h1>
      <p className="mt-5 text-[18px] leading-[1.5] text-mute">{story.dek}</p>
      <div className="mt-9 space-y-6">
        {story.body.map((block) =>
          block.type === "h2" ? (
            <h2 key={block.id} className="text-[22px] tracking-[-0.03em] text-pretty">
              {block.text}
            </h2>
          ) : block.type === "quote" ? (
            <blockquote
              key={block.id}
              className="border-l-2 border-faint pl-4 text-[17px] italic text-mute"
            >
              {block.text}
            </blockquote>
          ) : (
            <p key={block.id} className="text-[17px] leading-[1.7]">
              {block.text}
            </p>
          ),
        )}
      </div>

      <section className="mt-14 border-t border-line pt-6">
        <h2 className="text-[12px] text-faint font-medium">How this was reported</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-mute">
          Dispatch clusters overlapping coverage and attributes independent sources. Repeating the same announcement is not treated as independent verification.
        </p>
        <ul className="mt-3 divide-y divide-line/40">
          {story.sources.map((source) => (
            <li key={source.id}>
              <SourceDetail source={source} />
            </li>
          ))}
        </ul>
      </section>

      {related.length > 0 ? (
        <section className="mt-12 border-t border-line pt-6">
          <h2 className="mb-2 text-[12px] text-faint font-medium">More in {cat.label}</h2>
          <ArticleList stories={related} compact />
        </section>
      ) : null}
    </article>
  );
}
