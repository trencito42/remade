import { afterEach, describe, expect, it } from "vitest";
import { AiProvider } from "@/lib/ai/provider";

const original = {
  enabled: process.env.AI_EMBEDDINGS_ENABLED,
  model: process.env.AI_EMBEDDING_MODEL,
  key: process.env.AI_API_KEY,
  base: process.env.AI_BASE_URL,
};

afterEach(() => {
  process.env.AI_EMBEDDINGS_ENABLED = original.enabled;
  process.env.AI_EMBEDDING_MODEL = original.model;
  process.env.AI_API_KEY = original.key;
  process.env.AI_BASE_URL = original.base;
});

describe("optional embeddings", () => {
  it("never enables embeddings when AI_EMBEDDINGS_ENABLED is false", () => {
    process.env.AI_EMBEDDINGS_ENABLED = "false";
    process.env.AI_API_KEY = "sk-test";
    process.env.AI_BASE_URL = "http://127.0.0.1:9/v1";
    process.env.AI_EMBEDDING_MODEL = "text-embedding-3-small";
    expect(AiProvider.fromEnv().embeddingsEnabled).toBe(false);
  });

  it("stays off in auto mode when no embedding model is configured", () => {
    process.env.AI_EMBEDDINGS_ENABLED = "";
    process.env.AI_EMBEDDING_MODEL = "";
    process.env.AI_API_KEY = "sk-test";
    process.env.AI_BASE_URL = "http://127.0.0.1:9/v1";
    expect(AiProvider.fromEnv().embeddingsEnabled).toBe(false);
  });
});
