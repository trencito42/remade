import { ArticleList } from "@/components/news/ArticleList";
import { categoryMeta, publishedStories } from "@/lib/mock/stories";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

export default function HomePage() {
  const [lead, ...rest] = publishedStories();
  if (!lead) return null;

  return (
    <div>
      <article className="max-w-[720px] pt-4 pb-10">
        <p className="text-[12px] text-mute">
          {categoryMeta[lead.category].label}
          <span className="mx-2 text-faint">·</span>
          {formatDate(new Date(lead.lastUpdatedAt))}
        </p>
        <h1 className="mt-3 text-[34px] leading-[1.12] tracking-[-0.038em] text-pretty md:text-[42px]">
          <Link href={`/story/${lead.slug}`} className="row-title">
            {lead.title}
          </Link>
        </h1>
        <p className="mt-5 max-w-[58ch] text-[17px] leading-relaxed text-mute">{lead.dek}</p>
      </article>
      <ArticleList stories={rest} />
    </div>
  );
}
