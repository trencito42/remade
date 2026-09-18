import { z } from "zod";
import { getEnv } from "@/lib/config/env";
import { getDb } from "@/lib/db/client";
import { aiRuns } from "@/lib/db/schema";

export type AiTask =
  | "cluster_judge"
  | "extract_entities"
  | "extract_claims"
  | "generate_brief"
  | "generate_draft"
  | "edit_segment"
  | "embed_text";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

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

export function extractJsonFromText(rawText: string): unknown {
  const trimmed = rawText.trim();
  // Try direct parse
  try {
    return JSON.parse(trimmed);
  } catch {
    // Check for markdown code blocks
    const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match && match[1]) {
      try {
        return JSON.parse(match[1].trim());
      } catch {
        // continue
      }
    }

    // Try finding outer curly braces or brackets
    const firstBrace = trimmed.indexOf("{");
    const lastBrace = trimmed.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
      } catch {
        // continue
      }
    }

    throw new Error(`Failed to extract valid JSON from model response: ${trimmed.slice(0, 150)}...`);
  }
}

export class AiProvider {
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
    private readonly chatModel: string,
    private readonly embeddingModel: string,
  ) {}

  static fromEnv(): AiProvider {
    const env = getEnv();
    return new AiProvider(
      env.aiBaseUrl.replace(/\/$/, ""),
      env.aiApiKey,
      env.aiModel || "gpt-5.6-sol",
      env.aiEmbeddingModel,
    );
  }

  get available(): boolean {
    return Boolean(this.baseUrl && this.apiKey);
  }

  async chatJson<T>(input: {
    task: AiTask;
    promptVersion: string;
    messages: ChatMessage[];
    schema: z.ZodType<T>;
    temperature?: number;
  }): Promise<T> {
    const correlationId = crypto.randomUUID();
    const modelToUse = this.chatModel || "gpt-5.6-sol";

    // Ensure system prompt instructs json
    const hasSystem = input.messages.some((m) => m.role === "system");
    const messages = hasSystem
      ? input.messages
      : [{ role: "system" as const, content: "You are a precise newsroom AI. Always output strict JSON." }, ...input.messages];

    let content: string | undefined;

    try {
      const raw = await this.request({
        task: input.task,
        promptVersion: input.promptVersion,
        correlationId,
        path: "/chat/completions",
        body: {
          model: modelToUse,
          temperature: input.temperature ?? 0.2,
          response_format: { type: "json_object" },
          messages,
        },
      });
      content = raw.choices?.[0]?.message?.content;
    } catch (err) {
      // Fallback: retry once without response_format if provider doesn't support json_object
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.includes("response_format") || errMsg.includes("400")) {
        const raw = await this.request({
          task: input.task,
          promptVersion: input.promptVersion,
          correlationId,
          path: "/chat/completions",
          body: {
            model: modelToUse,
            temperature: input.temperature ?? 0.2,
            messages,
          },
        });
        content = raw.choices?.[0]?.message?.content;
      } else {
        throw err;
      }
    }

    if (typeof content !== "string" || !content.trim()) {
      throw new Error("Empty model response received");
    }

    const parsedJson = extractJsonFromText(content);
    return input.schema.parse(parsedJson);
  }

  private static embeddingsSupported: boolean | null = null;

  async embed(texts: string[], task: AiTask = "embed_text"): Promise<number[][] | null> {
    if (!this.available) return null;
    if (AiProvider.embeddingsSupported === false) return null;

    try {
      const correlationId = crypto.randomUUID();
      const raw = await this.request({
        task,
        promptVersion: "embed-v1",
        correlationId,
        path: "/embeddings",
        body: {
          model: this.embeddingModel || "text-embedding-3-small",
          input: texts,
        },
      });

      if (!raw.data || !Array.isArray(raw.data)) return null;
      AiProvider.embeddingsSupported = true;
      return (raw.data as Array<{ embedding: number[] }>).map((row) => row.embedding);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("404") || msg.includes("Not found")) {
        AiProvider.embeddingsSupported = false;
      }
      // Graceful degradation when embeddings are not supported by the provider
      return null;
    }
  }

  private async request(input: {
    task: AiTask;
    promptVersion: string;
    correlationId: string;
    path: string;
    body: Record<string, unknown>;
  }): Promise<{
    error?: { message?: string };
    usage?: unknown;
    choices?: Array<{ message?: { content?: string } }>;
    data?: unknown;
    model?: string;
  }> {
    if (!this.available) throw new Error("AI provider is not configured");

    const started = Date.now();
    let lastError: unknown;
    const maxAttempts = 3;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 25_000);

        const response = await fetch(`${this.baseUrl}${input.path}`, {
          method: "POST",
          signal: controller.signal,
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${this.apiKey}`,
            "x-correlation-id": input.correlationId,
          },
          body: JSON.stringify(input.body),
        }).finally(() => clearTimeout(timeout));

        const json = (await response.json()) as {
          error?: { message?: string; type?: string; code?: string };
          usage?: unknown;
          choices?: Array<{ message?: { content?: string } }>;
          data?: unknown;
          model?: string;
        };

        if (!response.ok) {
          const status = response.status;
          const msg = json.error?.message || `AI request failed with HTTP ${status}`;

          // Do NOT retry 400, 401, 403, 404 client errors
          if (status >= 400 && status < 500 && status !== 429) {
            await this.log({
              task: input.task,
              promptVersion: input.promptVersion,
              model: this.chatModel || "unspecified",
              inputTokens: null,
              outputTokens: null,
              latencyMs: Date.now() - started,
              status: "error",
              error: msg,
            });
            throw new Error(msg);
          }

          throw new Error(msg);
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
        // If client error was rethrown, exit loop
        if (error instanceof Error && error.message.includes("HTTP 4")) {
          break;
        }
        if (attempt < maxAttempts - 1) {
          await sleep(500 * (attempt + 1));
        }
      }
    }

    const errMessage = lastError instanceof Error ? lastError.message : "AI request failed";
    await this.log({
      task: input.task,
      promptVersion: input.promptVersion,
      model: this.chatModel || "unspecified",
      inputTokens: null,
      outputTokens: null,
      latencyMs: Date.now() - started,
      status: "error",
      error: errMessage,
    });

    throw lastError instanceof Error ? lastError : new Error(errMessage);
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
    try {
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
    } catch {
      // Don't fail the AI call if run logging encounters transient issue
    }
  }
}
