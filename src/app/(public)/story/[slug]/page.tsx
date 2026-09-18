import { notFound } from "next/navigation";
import { categoryMeta } from "@/lib/mock/stories";
import { getStoryBySlug, listPublished } from "@/lib/db/queries";
import { formatDate } from "@/lib/utils";
import { ArticleList } from "@/components/news/ArticleList";
import { SourceDetail } from "@/components/ui/SourceDetail";
import { StoryStatus } from "@/components/newsroom/StoryStatus";

export const dynamic = "force-dynamic";

export default async function StoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const story = await getStoryBySlug(slug);
  if (!story || !story.published) notFound();
  const related = (await listPublished(story.category)).filter((item) => item.id !== story.id).slice(0, 3);

  return (
    <article className="measure pt-6">
      <p className="lead-kicker">
        {categoryMeta[story.category].label}
        <span className="mx-1.5 text-faint">·</span>
        <StoryStatus status={story.status} />
        <span className="mx-1.5 text-faint">·</span>
        {formatDate(new Date(story.lastUpdatedAt))}
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
          ) : (
            <p key={block.id} className="text-[17px] leading-[1.7]">
              {block.text}
            </p>
          ),
        )}
      </div>
      <section className="mt-14">
        <h2 className="text-[12px] text-faint">How this was reported</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-mute">
          Dispatch clusters overlapping coverage. Repeating the same announcement is not independent confirmation.
        </p>
        <ul className="mt-3">
          {story.sources.map((source) => (
            <li key={source.id}>
              <SourceDetail source={source} />
            </li>
          ))}
        </ul>
      </section>
      {related.length > 0 ? (
        <section className="mt-10">
          <h2 className="mb-1 text-[12px] text-faint">More</h2>
          <ArticleList stories={related} compact />
        </section>
      ) : null}
    </article>
  );
}
