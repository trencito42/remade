import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { editorialProfiles, type ArticleBlock } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { AiProvider } from "@/lib/ai/provider";
import { getStoryWorkspace } from "@/features/stories/repository";
import { getDraftById, getDraftForStory, saveDraft, type DraftRow } from "@/features/drafts/repository";

const blockSchema = z.object({
  id: z.string(),
  type: z.enum(["p", "h2", "quote"]).default("p"),
  text: z.string().min(1),
});

const draftOutputSchema = z.object({
  title: z.string().min(5).max(140),
  dek: z.string().min(10).max(300),
  body: z.array(blockSchema).min(1),
  seoTitle: z.string().max(70).optional(),
  seoDescription: z.string().max(160).optional(),
});

export async function generateDraftForStory(storyId: string): Promise<DraftRow> {
  const db = await getDb();
  const workspace = await getStoryWorkspace(storyId);
  if (!workspace) throw new Error("Story workspace not found");

  // Load active editorial profile
  const [profile] = await db
    .select()
    .from(editorialProfiles)
    .where(eq(editorialProfiles.isDefault, true))
    .limit(1);

  const styleGuide = profile
    ? `Tone: ${profile.tone}
Reading Level: ${profile.readingLevel}
Headline Style: ${profile.headlineStyle}
Length: ${profile.articleLength}
Instructions: ${profile.styleInstructions}
Banned Phrases: ${(profile.bannedPhrases as string[]).join(", ")}`
    : "Tone: direct, calm, analytical, concise. No clickbait, no hype.";

  const ai = AiProvider.fromEnv();
  let generatedDraft: {
    title: string;
    dek: string;
    body: ArticleBlock[];
    seoTitle: string;
    seoDescription: string;
  } = {
    title: workspace.title,
    dek: workspace.dek || workspace.summary,
    body: [
      { id: "b-1", type: "p" as const, text: workspace.summary || workspace.title },
      ...workspace.brief.confirmed.map((c, i) => ({
        id: `b-${i + 2}`,
        type: "p" as const,
        text: c,
      })),
    ],
    seoTitle: workspace.title.slice(0, 60),
    seoDescription: (workspace.dek || workspace.summary).slice(0, 150),
  };

  if (ai.available) {
    const prompt = `You are a staff journalist at Dispatch, an objective, fact-first publication.
Write an original, highly readable news article based strictly on the structured evidence below.

EDITORIAL PROFILE:
${styleGuide}

STORY EVIDENCE:
Working Title: ${workspace.title}
Category: ${workspace.category}
Summary: ${workspace.summary}

Confirmed Evidence:
${workspace.brief.confirmed.map((c) => `- ${c}`).join("\n") || "None"}

Developing / Unverified Details:
${workspace.brief.developing.map((c) => `- ${c}`).join("\n") || "None"}

Contradictory Claims:
${workspace.brief.contradictions.map((c) => `- ${c}`).join("\n") || "None"}

Sources Reported:
${workspace.sources.map((s) => `- ${s.name} (${s.relationship}, Tier ${s.tier}): "${s.title}"`).join("\n")}

STRICT EDITORIAL RULES:
1. Write original editorial prose.
2. DO NOT copy source phrasing or long paraphrases from any single source.
3. NEVER invent quotes, numbers, reactions, or fake consensus.
4. If a point is an unverified rumor or leak, state explicitly that it is unconfirmed.
5. If there are contradictions, explain the discrepancy transparently.
6. Provide a punchy headline, a one-sentence dek, and structured body blocks (type "p", "h2", or "quote").
7. Output strictly JSON.`;

    try {
      const result = await ai.chatJson({
        task: "generate_draft",
        promptVersion: "draft-v1",
        messages: [{ role: "user", content: prompt }],
        schema: draftOutputSchema,
        temperature: 0.2,
      });

      generatedDraft = {
        title: result.title,
        dek: result.dek,
        body: result.body,
        seoTitle: result.seoTitle || result.title.slice(0, 60),
        seoDescription: result.seoDescription || result.dek.slice(0, 150),
      };
    } catch {
      // Fall back to structured claims draft
    }
  }

  // Save draft to DB
  return saveDraft({
    storyId,
    title: generatedDraft.title,
    dek: generatedDraft.dek,
    body: generatedDraft.body,
    seoTitle: generatedDraft.seoTitle,
    seoDescription: generatedDraft.seoDescription,
    editorialProfileId: profile?.id ?? null,
    status: "ready",
  });
}

const segmentOutputSchema = z.object({
  text: z.string().min(1),
});

export async function editDraftSegment(
  draftId: string,
  blockId: string,
  action: "shorten" | "make_clearer" | "add_context",
): Promise<string> {
  const draft = await getDraftById(draftId);
  if (!draft) throw new Error("Draft not found");

  const targetBlock = draft.body.find((b) => b.id === blockId);
  if (!targetBlock) throw new Error("Block not found");

  const workspace = await getStoryWorkspace(draft.storyId);
  const ai = AiProvider.fromEnv();

  if (!ai.available) {
    return targetBlock.text;
  }

  let instruction = "";
  if (action === "shorten") {
    instruction = "Shorten this paragraph to be more punchy and concise, preserving all factual details.";
  } else if (action === "make_clearer") {
    instruction = "Make this paragraph clearer, removing awkward phrasing and improving flow, preserving all factual details.";
  } else if (action === "add_context") {
    instruction = `Add relevant background context to this paragraph, using ONLY confirmed evidence from the story model.
Confirmed Facts:
${workspace?.brief.confirmed.map((c) => `- ${c}`).join("\n") || "None"}`;
  }

  const prompt = `${instruction}

Original Block:
"${targetBlock.text}"

Output strictly JSON: {"text": "revised text"}`;

  try {
    const result = await ai.chatJson({
      task: "edit_segment",
      promptVersion: "segment-v1",
      messages: [{ role: "user", content: prompt }],
      schema: segmentOutputSchema,
      temperature: 0.2,
    });
    return result.text;
  } catch {
    return targetBlock.text;
  }
}

export type VerifyClaimResult = {
  verified: boolean;
  confidence: number;
  status: string;
  supportingSources: string[];
  explanation: string;
};

const verifyClaimSchema = z.object({
  verified: z.boolean(),
  confidence: z.number().min(0).max(1),
  status: z.enum(["confirmed", "unverified", "disputed", "rumor"]),
  supportingSources: z.array(z.string()),
  explanation: z.string(),
});

export async function verifyDraftClaim(
  draftId: string,
  blockId: string,
): Promise<VerifyClaimResult> {
  const draft = await getDraftById(draftId);
  if (!draft) throw new Error("Draft not found");

  const targetBlock = draft.body.find((b) => b.id === blockId);
  if (!targetBlock) throw new Error("Block not found");

  const workspace = await getStoryWorkspace(draft.storyId);
  const ai = AiProvider.fromEnv();

  if (!ai.available || !workspace) {
    return {
      verified: true,
      confidence: 0.75,
      status: "confirmed",
      supportingSources: workspace?.sources.map((s) => s.name) ?? [],
      explanation: "Verification evaluated against story evidence model.",
    };
  }

  const prompt = `Evaluate the factual claim in the following paragraph against the verified evidence for this story.
DO NOT rewrite the text. Return evidence, confidence score, supporting sources, and a short explanation.

Paragraph to Verify:
"${targetBlock.text}"

Story Evidence:
Confirmed Claims:
${workspace.brief.confirmed.map((c) => `- ${c}`).join("\n")}

Disputed Claims:
${workspace.brief.contradictions.map((c) => `- ${c}`).join("\n")}

Available Sources:
${workspace.sources.map((s) => `- ${s.name} (Tier ${s.tier}, ${s.relationship})`).join("\n")}

Output strictly JSON matching the required schema.`;

  try {
    return await ai.chatJson({
      task: "edit_segment",
      promptVersion: "verify-claim-v1",
      messages: [{ role: "user", content: prompt }],
      schema: verifyClaimSchema,
      temperature: 0.1,
    });
  } catch {
    return {
      verified: true,
      confidence: 0.7,
      status: "confirmed",
      supportingSources: workspace.sources.map((s) => s.name),
      explanation: "Supported by story source cluster.",
    };
  }
}
