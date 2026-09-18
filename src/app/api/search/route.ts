import { searchPublishedArticles } from "@/features/publishing/repository";
import { listStoryFeed } from "@/features/stories/repository";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim().toLowerCase() ?? "";
  const isNewsroom = searchParams.get("newsroom") === "1";
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") ?? 20)));

  if (!q) {
    return Response.json([]);
  }

  const published = await searchPublishedArticles(q, limit);
  const results = published.map((story) => ({
    id: story.id,
    storyId: story.storyId,
    slug: story.slug,
    title: story.title,
    dek: story.dek,
    leadSource: story.leadSource,
    category: story.category,
    published: true,
    sourceCount: story.sourceCount,
  }));

  if (isNewsroom) {
    const publishedIds = new Set(results.map((r) => r.storyId || r.id));
    const allClusters = await listStoryFeed({ limit: 60 });
    const matchingClusters = allClusters
      .filter((c) => !publishedIds.has(c.id))
      .filter(
        (c) =>
          c.workingTitle.toLowerCase().includes(q) ||
          c.category.toLowerCase().includes(q) ||
          (c.leadSourceName?.toLowerCase().includes(q) ?? false),
      )
      .slice(0, limit);

    for (const c of matchingClusters) {
      results.push({
        id: c.id,
        storyId: c.id,
        slug: c.id,
        title: c.workingTitle,
        dek: "",
        leadSource: c.leadSourceName ?? "Wire",
        category: c.category,
        published: false,
        sourceCount: c.sourceCount,
      });
    }
  }

  return Response.json(results.slice(0, limit));
}
