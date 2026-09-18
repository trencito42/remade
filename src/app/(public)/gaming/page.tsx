import type { Metadata } from "next";
import { StoryIndex } from "@/components/news/StoryIndex";
import { listPublishedArticles } from "@/features/publishing/repository";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Gaming — Dispatch",
  description: "Clustered news and verified reports on games, studios, and platforms.",
};

export default async function GamingPage() {
  const stories = await listPublishedArticles("gaming");
  return <StoryIndex title="Gaming" stories={stories} />;
}
