import { StoryIndex } from "@/components/news/StoryIndex";
import { listPublished } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function LatestPage() {
  return <StoryIndex title="Latest" stories={await listPublished()} />;
}
