import type { MetadataRoute } from "next";
import { getEnv } from "@/lib/config/env";
import { listPublishedArticles } from "@/features/publishing/repository";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const env = getEnv();
  const published = await listPublishedArticles(undefined, 100);

  const staticRoutes: MetadataRoute.Sitemap = [
    "",
    "/latest",
    "/gaming",
    "/hardware",
    "/technology",
    "/ai",
  ].map((route) => ({
    url: `${env.siteUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: "hourly" as const,
    priority: route === "" ? 1.0 : 0.8,
  }));

  const articleRoutes: MetadataRoute.Sitemap = published.map((story) => ({
    url: `${env.siteUrl}/story/${story.slug}`,
    lastModified: new Date(story.updatedAt || story.publishedAt),
    changeFrequency: "daily" as const,
    priority: 0.7,
  }));

  return [...staticRoutes, ...articleRoutes];
}
