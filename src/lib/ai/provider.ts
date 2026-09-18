import { randomUUID } from "node:crypto";
import type { AiCompleteRequest, AiCompleteResult, AiUsage } from "@/lib/ai/types";
import { recordUsage } from "@/lib/ai/usage";

export interface AiProvider {
  readonly name: string;
  completeText(messages: AiCompleteRequest<unknown>["messages"], opts?: {
    modelOverride?: string;
    temperature?: number;
  }): Promise<{ text: string; usage: AiUsage }>;
}

class HeuristicProvider implements AiProvider {
  readonly name = "heuristic";
  async completeText(): Promise<{ text: string; usage: AiUsage }> {
    throw new Error("Heuristic provider does not complete free-form text. Use task-specific agents.");
  }
}

function normalizeBaseUrl(raw: string) {
  const clean = raw.trim().replace(/\/+$/, "");
  return clean.endsWith("/v1") ? clean : `${clean}/v1`;
}

class OpenAiCompatibleProvider implements AiProvider {
  readonly name: string;
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly defaultModel: string;

  constructor(opts: { name: string; apiKey: string; baseUrl: string; defaultModel: string }) {
    this.name = opts.name;
    this.apiKey = opts.apiKey;
    this.baseUrl = normalizeBaseUrl(opts.baseUrl);
    this.defaultModel = opts.defaultModel;
  }

  async completeText(messages: AiCompleteRequest<unknown>["messages"], opts?: {
    modelOverride?: string;
    temperature?: number;
  }): Promise<{ text: string; usage: AiUsage }> {
    const started = Date.now();
    const model = opts?.modelOverride ?? this.defaultModel;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 90_000);
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          model,
          temperature: opts?.temperature ?? 0.3,
          messages,
        }),
        cache: "no-store",
      });
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`${this.name} AI error (${response.status}): ${body.slice(0, 300)}`);
    }

    const json = (await response.json()) as {
      id?: string;
      choices?: { message?: { content?: string } }[];
      usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        prompt_tokens_details?: { cached_tokens?: number };
      };
    };
    const text = json.choices?.[0]?.message?.content?.trim() ?? "";
    if (!text) throw new Error(`${this.name} returned an empty completion.`);

    return {
      text,
      usage: {
        provider: this.name,
        model,
        inputTokens: json.usage?.prompt_tokens ?? 0,
        outputTokens: json.usage?.completion_tokens ?? 0,
        cacheTokens: json.usage?.prompt_tokens_details?.cached_tokens ?? 0,
        costUsd: null,
        latencyMs: Date.now() - started,
        generationId: json.id ?? randomUUID(),
      },
    };
  }
}

export function getConfiguredProvider(): AiProvider | null {
  // BuyTokens is the preferred production provider. Keep generic OpenAI-compatible
  // aliases so local/dev deployments do not need code changes.
  const buyTokensKey = process.env.BUYTOKENS_API_KEY;
  if (buyTokensKey) {
    return new OpenAiCompatibleProvider({
      name: "buytokens",
      apiKey: buyTokensKey,
      baseUrl: process.env.BUYTOKENS_BASE_URL ?? "http://185.221.214.224:4100/v1",
      defaultModel: process.env.BUYTOKENS_MODEL ?? process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    });
  }

  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    return new OpenAiCompatibleProvider({
      name: process.env.OPENAI_BASE_URL?.includes("185.221.214.224") ? "buytokens" : "openai-compatible",
      apiKey: openaiKey,
      baseUrl: process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1",
      defaultModel: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    });
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey && process.env.ANTHROPIC_COMPAT_BASE_URL) {
    return new OpenAiCompatibleProvider({
      name: "anthropic-compat",
      apiKey: anthropicKey,
      baseUrl: process.env.ANTHROPIC_COMPAT_BASE_URL,
      defaultModel: process.env.ANTHROPIC_MODEL ?? "claude-3-5-haiku-latest",
    });
  }
  return null;
}

export const heuristicProvider = new HeuristicProvider();

export async function completeJson<T>(
  request: AiCompleteRequest<T> & { projectId?: string },
): Promise<AiCompleteResult<T> | null> {
  const provider = getConfiguredProvider();
  if (!provider || !request.parseJson) return null;
  const { text, usage } = await provider.completeText(request.messages, {
    modelOverride: request.modelOverride,
    temperature: request.temperature,
  });
  if (request.projectId) recordUsage({ projectId: request.projectId, task: request.task, usage });
  return { data: request.parseJson(text), usage, method: "llm" };
}
