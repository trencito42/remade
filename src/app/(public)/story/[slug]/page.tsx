import { notFound } from "next/navigation";
import { categoryMeta, publishedStories, storyBySlug } from "@/lib/mock/stories";
import { formatDate } from "@/lib/utils";
import { SourceBadge } from "@/components/source/SourceBadge";
import { ArticleList } from "@/components/news/ArticleList";

export default async function StoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const story = storyBySlug(slug);
  if (!story || !story.published) notFound();
  const related = publishedStories().filter((item) => item.id !== story.id).slice(0, 3);

  return (
    <article className="measure mx-auto pt-4">
      <p className="text-[12px] text-mute">
        {categoryMeta[story.category].label}
        <span className="mx-2 text-faint">·</span>
        {formatDate(new Date(story.lastUpdatedAt))}
      </p>
      <h1 className="mt-3 text-[32px] leading-[1.14] tracking-[-0.038em] text-pretty md:text-[40px]">{story.title}</h1>
      <p className="mt-5 text-[18px] leading-[1.55] text-mute">{story.dek}</p>
      <div className="mt-10 space-y-6">
        {story.body.map((block) =>
          block.type === "h2" ? (
            <h2 key={block.id} className="text-[22px] tracking-[-0.03em] text-pretty">
              {block.text}
            </h2>
          ) : (
            <p key={block.id} className="text-[17px] leading-[1.7]">
              {block.text}
            </p>
          ),
        )}
      </div>
      <section className="mt-16">
        <h2 className="text-[12px] text-faint">Sources</h2>
        <ul className="mt-3">
          {story.sources.map((source) => (
            <li key={source.id}>
              <details className="group py-3">
                <summary className="row cursor-pointer list-none">
                  <span className="row-title text-[14px]">{source.name}</span>
                  <span className="row-meta mt-1 block text-[12px] text-mute">
                    {source.isPrimary ? "primary" : <SourceBadge tier={source.tier} />}
                  </span>
                </summary>
                <p className="mt-2 pl-2 text-[13px] leading-relaxed text-mute">
                  {source.title}
                  <span className="mx-2 text-faint">·</span>
                  <a href={source.url} target="_blank" rel="noreferrer" className="nav-link">
                    Open source
                  </a>
                </p>
              </details>
            </li>
          ))}
        </ul>
      </section>
      {related.length > 0 ? (
        <section className="mt-16">
          <h2 className="text-[12px] text-faint">More</h2>
          <ArticleList stories={related} />
        </section>
      ) : null}
    </article>
  );
}
