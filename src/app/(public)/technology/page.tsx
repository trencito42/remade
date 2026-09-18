import type { Metadata } from "next";
import { StoryIndex } from "@/components/news/StoryIndex";
import { listPublishedArticles } from "@/features/publishing/repository";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Technology — Dispatch",
  description: "Objective reporting on the tech industry, major companies, and products.",
};

export default async function TechnologyPage() {
  const stories = await listPublishedArticles("technology");
  return <StoryIndex title="Technology" stories={stories} />;
}
