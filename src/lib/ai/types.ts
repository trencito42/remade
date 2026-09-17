export type AiTask =
  | "extraction"
  | "interview"
  | "research"
  | "design_direction"
  | "coding"
  | "visual_critique"
  | "repair";

export type AiMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type AiUsage = {
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheTokens: number;
  costUsd: number | null;
  latencyMs: number;
  generationId: string | null;
};

export type AiCompleteResult<T> = {
  data: T;
  usage: AiUsage;
  method: "llm" | "heuristic";
};

export type AiCompleteRequest<T> = {
  task: AiTask;
  messages: AiMessage[];
  /**
   * Optional structured parse. When provided, providers should return JSON
   * matching the shape; callers still validate with Zod.
   */
  parseJson?: (raw: string) => T;
  modelOverride?: string;
  temperature?: number;
};
