import { StoryIndex } from "@/components/news/StoryIndex";
import { storiesByCategory } from "@/lib/mock/stories";

export default function TechnologyPage() {
  return <StoryIndex title="Tech" stories={storiesByCategory("technology")} />;
}
