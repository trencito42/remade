import { z } from "zod";
import { AiProvider } from "@/lib/ai/provider";

export const clusterJudgeSchema = z.object({
  sameEvent: z.boolean(),
  confidence: z.number().min(0).max(1),
  reason: z.string(),
});

export type ClusterJudgeResult = z.infer<typeof clusterJudgeSchema>;

export async function judgeClusterAmbiguity(input: {
  article: {
    title: string;
    excerpt: string;
    entities: string[];
    publishedAt: string;
  };
  candidateStory: {
    title: string;
    summary: string;
    entities: string[];
    recentSourceTitles: string[];
  };
}): Promise<ClusterJudgeResult> {
  const ai = AiProvider.fromEnv();
  if (!ai.available) {
    // Deterministic fallback: conservative decision
    return {
      sameEvent: false,
      confidence: 0.5,
      reason: "AI provider unavailable; falling back to separate clusters.",
    };
  }

  const prompt = `You are an expert newsroom editor determining whether two reports cover the SAME specific real-world event, or merely share a topic or entity.

CRITICAL RULE:
Do NOT merge articles simply because they share a company, game, or person (e.g. "GTA 6 delayed" and "GTA 6 PC requirements leak" are DIFFERENT events).
Only mark sameEvent = true if both reports are describing the EXACT SAME event, announcement, incident, release, or development.

INCOMING ARTICLE:
- Title: ${input.article.title}
- Excerpt: ${input.article.excerpt}
- Entities: ${input.article.entities.join(", ") || "None"}
- Published: ${input.article.publishedAt}

CANDIDATE STORY CLUSTER:
- Working Title: ${input.candidateStory.title}
- Summary: ${input.candidateStory.summary}
- Entities: ${input.candidateStory.entities.join(", ") || "None"}
- Existing Coverage Titles: ${input.candidateStory.recentSourceTitles.slice(0, 3).join(" | ") || "None"}

Question: Are these reports about the same real-world event?

Output strictly JSON:
{
  "sameEvent": boolean,
  "confidence": number between 0 and 1,
  "reason": "short explanation"
}`;

  try {
    return await ai.chatJson({
      task: "cluster_judge",
      promptVersion: "cluster-judge-v1",
      messages: [{ role: "user", content: prompt }],
      schema: clusterJudgeSchema,
      temperature: 0.1,
    });
  } catch {
    return {
      sameEvent: false,
      confidence: 0.5,
      reason: "Cluster judge evaluation failed; separated by default.",
    };
  }
}
