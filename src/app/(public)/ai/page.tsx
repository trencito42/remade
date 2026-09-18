import type { Metadata } from "next";
import { StoryIndex } from "@/components/news/StoryIndex";
import { listPublishedArticles } from "@/features/publishing/repository";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AI — Dispatch",
  description: "Independent intelligence on frontier AI models, research, and infrastructure.",
};

export default async function AiPage() {
  const stories = await listPublishedArticles("ai");
  return <StoryIndex title="AI" stories={stories} />;
}
