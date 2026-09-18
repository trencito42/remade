import { StoryIndex } from "@/components/news/StoryIndex";
import { storiesByCategory } from "@/lib/mock/stories";

export default function AiPage() {
  return <StoryIndex title="AI" stories={storiesByCategory("ai")} />;
}
