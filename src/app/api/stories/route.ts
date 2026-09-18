import { listPublishedArticles } from "@/features/publishing/repository";
import { listStoryFeed } from "@/features/stories/repository";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const publishedOnly = new URL(request.url).searchParams.get("published") === "1";

  if (publishedOnly) {
    const published = await listPublishedArticles(undefined, 50);
    return Response.json(
      published.map((story) => ({
        id: story.id,
        slug: story.slug,
        title: story.title,
        dek: story.dek,
        leadSource: story.leadSource,
        category: story.category,
        published: true,
        sourceCount: story.sourceCount,
      })),
    );
  }

  const clusters = await listStoryFeed({ limit: 50 });
  return Response.json(
    clusters.map((c) => ({
      id: c.id,
      slug: c.id,
      title: c.workingTitle,
      dek: "",
      leadSource: c.leadSourceName ?? "Wire",
      category: c.category,
      published: c.status === "published",
      sourceCount: c.sourceCount,
    })),
  );
}
