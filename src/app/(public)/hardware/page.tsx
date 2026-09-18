import { StoryIndex } from "@/components/news/StoryIndex";
import { storiesByCategory } from "@/lib/mock/stories";

export default function HardwarePage() {
  return <StoryIndex title="Hardware" stories={storiesByCategory("hardware")} />;
}
