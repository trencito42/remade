import { z } from "zod";

export const ProjectStatusSchema = z.enum([
  "intake",
  "analyzing",
  "interview",
  "interview_complete",
  "research",
  "concepts",
  "building",
  "qa",
  "ready",
  "failed",
]);

export type ProjectStatus = z.infer<typeof ProjectStatusSchema>;

export const CreateProjectInputSchema = z.object({
  url: z.string().min(1),
});

export const JobStatusSchema = z.enum([
  "queued",
  "running",
  "succeeded",
  "failed",
]);

export const StageStatusSchema = z.enum([
  "pending",
  "running",
  "succeeded",
  "failed",
  "skipped",
]);

export const AnalysisStageNameSchema = z.enum([
  "validate_url",
  "crawl",
  "extract_business",
  "inspect_brand",
  "analyze_content",
  "prepare_interview",
]);

export const DirectionStageNameSchema = z.enum([
  "research",
  "creative_brief",
  "generate_concepts",
]);

export const BuildStageNameSchema = z.enum([
  "design_system",
  "implement",
  "content_integrity",
]);

export const QaStageNameSchema = z.enum([
  "render_review",
  "slop_detect",
  "critique",
  "repair",
]);

export type AnalysisStageName = z.infer<typeof AnalysisStageNameSchema>;
export type DirectionStageName = z.infer<typeof DirectionStageNameSchema>;
export type BuildStageName = z.infer<typeof BuildStageNameSchema>;
export type QaStageName = z.infer<typeof QaStageNameSchema>;
export type JobStatus = z.infer<typeof JobStatusSchema>;
export type StageStatus = z.infer<typeof StageStatusSchema>;

export const ANALYSIS_STAGE_LABELS: Record<AnalysisStageName, string> = {
  validate_url: "Validating your website",
  crawl: "Reading your website",
  extract_business: "Understanding your business",
  inspect_brand: "Inspecting your brand",
  analyze_content: "Analyzing your content",
  prepare_interview: "Preparing questions",
};

export const DIRECTION_STAGE_LABELS: Record<DirectionStageName, string> = {
  research: "Researching the business",
  creative_brief: "Writing the creative brief",
  generate_concepts: "Developing three directions",
};

export const BUILD_STAGE_LABELS: Record<BuildStageName, string> = {
  design_system: "Building the design system",
  implement: "Implementing the website",
  content_integrity: "Checking content integrity",
};

export const QA_STAGE_LABELS: Record<QaStageName, string> = {
  render_review: "Inspecting the rendered result",
  slop_detect: "Scanning for AI design slop",
  critique: "Critiquing visual quality",
  repair: "Repairing issues",
};
