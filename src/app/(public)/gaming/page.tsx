import { StoryIndex } from "@/components/news/StoryIndex";
import { storiesByCategory } from "@/lib/mock/stories";

export default function GamingPage() {
  return <StoryIndex title="Gaming" stories={storiesByCategory("gaming")} />;
}
