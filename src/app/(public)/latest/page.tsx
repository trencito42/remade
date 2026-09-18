import { StoryIndex } from "@/components/news/StoryIndex";
import { listPublishedArticles } from "@/features/publishing/repository";

export const dynamic = "force-dynamic";

export default async function LatestPage() {
  const stories = await listPublishedArticles(undefined, 50);
  return <StoryIndex title="Latest" stories={stories} />;
}
