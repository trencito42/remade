import { StoryIndex } from "@/components/news/StoryIndex";
import { listPublished } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function AiPage() {
  return <StoryIndex title="AI" stories={await listPublished("ai")} />;
}
