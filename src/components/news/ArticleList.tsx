import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { categoryMeta, type MockStory } from "@/lib/mock/stories";

export function ArticleList({ stories }: { stories: MockStory[] }) {
  return (
    <div>
      {stories.map((story) => (
        <ArticleRow key={story.id} story={story} />
      ))}
    </div>
  );
}

export function ArticleRow({ story }: { story: MockStory }) {
  return (
    <article>
      <Link href={`/story/${story.slug}`} className="row block py-5">
        <p className="row-meta text-[12px] text-mute">
          {categoryMeta[story.category].label}
          <span className="mx-2 text-faint">·</span>
          {formatDate(new Date(story.lastUpdatedAt))}
        </p>
        <h2 className="mt-1.5 text-[18px] leading-snug tracking-[-0.025em]">
          <span className="row-title">{story.title}</span>
        </h2>
        <p className="mt-2 max-w-[62ch] text-[14px] leading-[1.65] text-mute">{story.dek}</p>
      </Link>
    </article>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="py-16 text-[14px] text-mute">{children}</p>;
}

export function SkeletonArticles() {
  return (
    <div className="space-y-8 pt-4" aria-hidden="true">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="space-y-2 py-2">
          <div className="h-3 w-28 bg-wash" />
          <div className="h-5 w-4/5 bg-wash" />
          <div className="h-4 w-3/5 bg-wash" />
        </div>
      ))}
    </div>
  );
}
