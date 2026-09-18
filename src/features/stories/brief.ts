import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { storyClaims, storyClusters, storySources, storyUpdates } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { AiProvider } from "@/lib/ai/provider";
import { getStoryWorkspace, updateStoryCluster } from "@/features/stories/repository";
import type { StoryStatus } from "@/types/domain";

const briefSchema = z.object({
  summary: z.string().min(10).max(600),
  confirmedFacts: z.array(z.string()).default([]),
  developingFacts: z.array(z.string()).default([]),
  contradictions: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1).default(0.7),
  status: z.enum(["developing", "confirmed", "disputed"]).default("developing"),
});

export async function generateStoryBrief(storyId: string): Promise<{
  summary: string;
  confirmed: string[];
  developing: string[];
  contradictions: string[];
  confidence: number;
  status: StoryStatus;
}> {
  const db = await getDb();
  const workspace = await getStoryWorkspace(storyId);
  if (!workspace) throw new Error("Story not found");

  const claims = workspace.claims;
  const sources = workspace.sources;

  const confirmedClaims = claims.filter((c) => c.status === "confirmed").map((c) => c.text);
  const developingClaims = claims
    .filter((c) => c.status === "unverified" || c.status === "rumor")
    .map((c) => c.text);
  const disputedClaims = claims.filter((c) => c.status === "disputed").map((c) => c.text);

  let briefResult = {
    summary: workspace.summary || workspace.title,
    confirmedFacts: confirmedClaims,
    developingFacts: developingClaims,
    contradictions: disputedClaims,
    confidence: workspace.confidence || 0.6,
    status: (disputedClaims.length > 0
      ? "disputed"
      : confirmedClaims.length > 0
        ? "confirmed"
        : "developing") as "developing" | "confirmed" | "disputed",
  };

  const ai = AiProvider.fromEnv();
  if (ai.available && claims.length > 0) {
    const prompt = `Synthesize a grounded Story Brief based strictly on the verified evidence below.
Do NOT invent quotes, numbers, or events.

Story Title: "${workspace.title}"
Category: ${workspace.category}

Sources:
${sources.map((s) => `- ${s.name} (Tier ${s.tier}, ${s.relationship}): "${s.title}"`).join("\n")}

Extracted Claims:
Confirmed Facts:
${confirmedClaims.map((c) => `- ${c}`).join("\n") || "None yet"}

Developing / Unverified:
${developingClaims.map((c) => `- ${c}`).join("\n") || "None"}

Contradictions:
${disputedClaims.map((c) => `- ${c}`).join("\n") || "None"}

Instructions:
1. Write a 2-3 sentence grounded summary of the event.
2. Filter the most important confirmed points, developing points, and contradictions.
3. Determine overall story status: "confirmed" if verified by primary/multiple sources; "disputed" if major conflicting claims exist; "developing" otherwise.
4. Output strictly JSON.`;

    try {
      const generated = await ai.chatJson({
        task: "generate_brief",
        promptVersion: "brief-v1",
        messages: [{ role: "user", content: prompt }],
        schema: briefSchema,
        temperature: 0.1,
      });

      briefResult = {
        summary: generated.summary,
        confirmedFacts: generated.confirmedFacts.length > 0 ? generated.confirmedFacts : confirmedClaims,
        developingFacts: generated.developingFacts.length > 0 ? generated.developingFacts : developingClaims,
        contradictions: generated.contradictions.length > 0 ? generated.contradictions : disputedClaims,
        confidence: generated.confidence,
        status: generated.status,
      };
    } catch {
      // Keep deterministic fallback
    }
  }

  // Update story cluster summary and status in DB
  await updateStoryCluster(storyId, {
    summary: briefResult.summary,
    confidence: briefResult.confidence,
    status: briefResult.status,
  });

  // Record story update in timeline
  await db.insert(storyUpdates).values({
    id: crypto.randomUUID(),
    storyId,
    updateType: "brief_updated",
    summary: `Story brief updated: ${briefResult.status} status (${Math.round(briefResult.confidence * 100)}% confidence).`,
    createdAt: new Date(),
  });

  return {
    summary: briefResult.summary,
    confirmed: briefResult.confirmedFacts,
    developing: briefResult.developingFacts,
    contradictions: briefResult.contradictions,
    confidence: briefResult.confidence,
    status: briefResult.status,
  };
}
