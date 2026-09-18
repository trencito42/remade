import { z } from "zod";
import { getEnv } from "@/lib/config/env";
import { getDb } from "@/lib/db/client";
import { aiRuns } from "@/lib/db/schema";

export type AiTask =
  | "cluster_judge"
  | "extract_claims"
  | "generate_brief"
  | "generate_draft"
  | "edit_segment"
  | "embed_text";

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

const usageSchema = z
  .object({
    prompt_tokens: z.number().optional(),
    completion_tokens: z.number().optional(),
    total_tokens: z.number().optional(),
  })
  .optional();

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export class AiProvider {
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
    private readonly chatModel: string,
    private readonly embeddingModel: string,
  ) {}

  static fromEnv() {
    const env = getEnv();
    return new AiProvider(env.aiBaseUrl.replace(/\/$/, ""), env.aiApiKey, env.aiModel, env.aiEmbeddingModel);
  }

  get available() {
    return Boolean(this.baseUrl && this.apiKey);
  }

  async chatJson<T>(input: {
    task: AiTask;
    promptVersion: string;
    messages: ChatMessage[];
    schema: z.ZodType<T>;
    temperature?: number;
  }): Promise<T> {
    const raw = await this.request({
      task: input.task,
      promptVersion: input.promptVersion,
      path: "/chat/completions",
      body: {
        ...(this.chatModel ? { model: this.chatModel } : {}),
        temperature: input.temperature ?? 0.2,
        response_format: { type: "json_object" },
        messages: input.messages,
      },
    });
    const content = raw.choices?.[0]?.message?.content;
    if (typeof content !== "string") throw new Error("Empty model response");
    return input.schema.parse(JSON.parse(content));
  }

  async embed(texts: string[], task: AiTask = "embed_text") {
    const raw = await this.request({
      task,
      promptVersion: "embed-v1",
      path: "/embeddings",
      body: {
        model: this.embeddingModel,
        input: texts,
      },
    });
    return (raw.data as Array<{ embedding: number[] }>).map((row) => row.embedding);
  }

  private async request(input: {
    task: AiTask;
    promptVersion: string;
    path: string;
    body: Record<string, unknown>;
  }) {
    if (!this.available) throw new Error("AI provider is not configured");
    const started = Date.now();
    let lastError: unknown;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const response = await fetch(`${this.baseUrl}${input.path}`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify(input.body),
        });
        const json = (await response.json()) as {
          error?: { message?: string };
          usage?: unknown;
          choices?: Array<{ message?: { content?: string } }>;
          data?: unknown;
          model?: string;
        };
        if (!response.ok) {
          throw new Error(json.error?.message || `AI request failed (${response.status})`);
        }
        const usage = usageSchema.parse(json.usage);
        await this.log({
          task: input.task,
          promptVersion: input.promptVersion,
          model: typeof json.model === "string" ? json.model : this.chatModel || "unspecified",
          inputTokens: usage?.prompt_tokens ?? null,
          outputTokens: usage?.completion_tokens ?? null,
          latencyMs: Date.now() - started,
          status: "ok",
          error: null,
        });
        return json;
      } catch (error) {
        lastError = error;
        await sleep(400 * (attempt + 1));
      }
    }
    await this.log({
      task: input.task,
      promptVersion: input.promptVersion,
      model: this.chatModel || "unspecified",
      inputTokens: null,
      outputTokens: null,
      latencyMs: Date.now() - started,
      status: "error",
      error: lastError instanceof Error ? lastError.message : "AI request failed",
    });
    throw lastError instanceof Error ? lastError : new Error("AI request failed");
  }

  private async log(row: {
    task: string;
    promptVersion: string;
    model: string;
    inputTokens: number | null;
    outputTokens: number | null;
    latencyMs: number;
    status: string;
    error: string | null;
  }) {
    const db = await getDb();
    await db.insert(aiRuns).values({
      id: crypto.randomUUID(),
      task: row.task,
      model: row.model,
      provider: this.baseUrl,
      promptVersion: row.promptVersion,
      inputTokens: row.inputTokens,
      outputTokens: row.outputTokens,
      latencyMs: row.latencyMs,
      status: row.status,
      error: row.error,
      createdAt: new Date(),
    });
  }
}
