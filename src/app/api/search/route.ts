import { searchPublishedArticles } from "@/features/publishing/repository";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") ?? 20)));

  const results = await searchPublishedArticles(q, limit);

  return Response.json(
    results.map((story) => ({
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
