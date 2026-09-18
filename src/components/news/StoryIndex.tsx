import { ArticleList, EmptyState, type PublicArticleItem } from "@/components/news/ArticleList";

export function StoryIndex({ title, stories }: { title: string; stories: PublicArticleItem[] }) {
  return (
    <div className="pt-3">
      <h1 className="text-[12px] font-medium tracking-[-0.01em] text-faint">{title}</h1>
      {stories.length === 0 ? <EmptyState>No stories in this section yet.</EmptyState> : <ArticleList stories={stories} />}
    </div>
  );
}
