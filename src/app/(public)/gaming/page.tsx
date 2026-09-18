import { StoryIndex } from "@/components/news/StoryIndex";
import { listPublished } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function GamingPage() {
  return <StoryIndex title="Gaming" stories={await listPublished("gaming")} />;
}
