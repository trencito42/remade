import { ArticleList, EmptyState } from "@/components/news/ArticleList";
import type { MockStory } from "@/lib/mock/stories";

export function StoryIndex({ title, stories }: { title: string; stories: MockStory[] }) {
  return (
    <div className="pt-2">
      <h1 className="text-[12px] text-faint">{title}</h1>
      {stories.length === 0 ? <EmptyState>No stories in this section yet.</EmptyState> : <ArticleList stories={stories} />}
    </div>
  );
}
