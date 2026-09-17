import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/db/client";
import type { AiTask, AiUsage } from "@/lib/ai/types";

export function recordUsage(input: {
  projectId?: string | null;
  task: AiTask;
  usage: AiUsage;
}) {
  const db = getDb();
  db.prepare(
    `INSERT INTO usage_events
      (id, project_id, task, provider, model, input_tokens, output_tokens, cache_tokens, cost_usd, latency_ms, generation_id)
     VALUES (@id, @project_id, @task, @provider, @model, @input_tokens, @output_tokens, @cache_tokens, @cost_usd, @latency_ms, @generation_id)`,
  ).run({
    id: randomUUID(),
    project_id: input.projectId ?? null,
    task: input.task,
    provider: input.usage.provider,
    model: input.usage.model,
    input_tokens: input.usage.inputTokens,
    output_tokens: input.usage.outputTokens,
    cache_tokens: input.usage.cacheTokens,
    cost_usd: input.usage.costUsd,
    latency_ms: input.usage.latencyMs,
    generation_id: input.usage.generationId,
  });
}
