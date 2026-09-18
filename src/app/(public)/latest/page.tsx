import { StoryIndex } from "@/components/news/StoryIndex";
import { publishedStories } from "@/lib/mock/stories";

export default function LatestPage() {
  return <StoryIndex title="Latest" stories={publishedStories()} />;
}
