import { z } from "zod";

export const InterviewModeSchema = z.enum([
  "grill",
  "assumptions",
  "undecided",
]);

export const InterviewStatusSchema = z.enum([
  "active",
  "awaiting_summary",
  "confirmed",
]);

export const InterviewQuestionSchema = z.object({
  id: z.string(),
  prompt: z.string(),
  topic: z.enum([
    "goals",
    "audience",
    "positioning",
    "conversion",
    "perception",
    "visual",
    "dislikes",
    "competitors",
    "content_accuracy",
    "functionality",
  ]),
  whyItMatters: z.string(),
  skippable: z.boolean().default(true),
});

export const UnderstandingSummarySchema = z.object({
  businessName: z.string().nullable(),
  whatTheyDo: z.string(),
  whoTheyServe: z.string(),
  positioning: z.string(),
  primaryConversion: z.string(),
  visualDirectionHints: z.string(),
  mustPreserve: z.array(z.string()),
  mustAvoid: z.array(z.string()),
  openQuestions: z.array(z.string()),
  corrections: z.array(z.string()).default([]),
});

export type InterviewQuestion = z.infer<typeof InterviewQuestionSchema>;
export type UnderstandingSummary = z.infer<typeof UnderstandingSummarySchema>;
export type InterviewMode = z.infer<typeof InterviewModeSchema>;
export type InterviewStatus = z.infer<typeof InterviewStatusSchema>;
