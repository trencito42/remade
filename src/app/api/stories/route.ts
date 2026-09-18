import { listClusters, listPublished } from "@/lib/db/queries";

export async function GET(request: Request) {
  const publishedOnly = new URL(request.url).searchParams.get("published") === "1";
  const stories = publishedOnly ? await listPublished() : await listClusters();
  return Response.json(
    stories.map((story) => ({
      id: story.id,
      slug: story.slug,
      title: story.title,
      dek: story.dek,
      leadSource: story.leadSource,
      category: story.category,
      published: story.published,
      sourceCount: story.sourceCount,
    })),
  );
}
