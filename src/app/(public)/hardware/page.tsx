import type { Metadata } from "next";
import { StoryIndex } from "@/components/news/StoryIndex";
import { listPublishedArticles } from "@/features/publishing/repository";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Hardware — Dispatch",
  description: "Verified coverage on processors, GPUs, systems, and silicon.",
};

export default async function HardwarePage() {
  const stories = await listPublishedArticles("hardware");
  return <StoryIndex title="Hardware" stories={stories} />;
}
