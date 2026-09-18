import { StoryIndex } from "@/components/news/StoryIndex";
import { listPublished } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function TechnologyPage() {
  return <StoryIndex title="Tech" stories={await listPublished("technology")} />;
}
