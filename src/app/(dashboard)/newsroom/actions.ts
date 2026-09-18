"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ingestAllFeeds } from "@/features/ingestion/run";
import { getDb } from "@/lib/db/client";
import { sourceFeeds, sources } from "@/lib/db/schema";
import { assertSafeHttpUrl } from "@/lib/security/url";

export async function fetchSourcesAction() {
  const results = await ingestAllFeeds();
  revalidatePath("/newsroom");
  revalidatePath("/newsroom/sources");
  revalidatePath("/");
  return results;
}

const sourceSchema = z.object({
  name: z.string().min(2).max(80),
  domain: z.string().min(3).max(120),
  url: z.string().url(),
  tier: z.coerce.number().int().min(0).max(4),
  category: z.string().optional(),
});

export async function addSourceAction(formData: FormData) {
  const parsed = sourceSchema.parse({
    name: formData.get("name"),
    domain: formData.get("domain"),
    url: formData.get("url"),
    tier: formData.get("tier"),
    category: formData.get("category") || "technology",
  });
  assertSafeHttpUrl(parsed.url);
  const db = await getDb();
  const sourceId = crypto.randomUUID();
  await db.insert(sources).values({
    id: sourceId,
    name: parsed.name,
    domain: parsed.domain.replace(/^https?:\/\//, ""),
    type: "publisher",
    tier: parsed.tier,
    reliabilityWeight: 1,
    category: parsed.category,
    enabled: true,
    isSeed: false,
    createdAt: new Date(),
  });
  await db.insert(sourceFeeds).values({
    id: crypto.randomUUID(),
    sourceId,
    url: parsed.url,
    feedType: "rss",
    enabled: true,
    articlesReceived: 0,
  });
  revalidatePath("/newsroom/sources");
}
