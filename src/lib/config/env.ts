import { z } from "zod";

const schema = z.object({
  AI_BASE_URL: z.string().optional(),
  AI_API_KEY: z.string().optional(),
  AI_MODEL: z.string().optional(),
  AI_EMBEDDING_MODEL: z.string().optional(),
  AI_EMBEDDINGS_ENABLED: z.string().optional(),
  EMBEDDING_BASE_URL: z.string().optional(),
  EMBEDDING_API_KEY: z.string().optional(),
  EMBEDDING_MODEL: z.string().optional(),
  BUYTOKENS_BASE_URL: z.string().optional(),
  BUYTOKENS_API_KEY: z.string().optional(),
  BUYTOKENS_MODEL: z.string().optional(),
  DATABASE_URL: z.string().optional(),
  PGLITE_DATA_DIR: z.string().optional(),
  SITE_URL: z.string().optional(),
  SITE_NAME: z.string().optional(),
  ADMIN_PASSWORD: z.string().optional(),
  CLUSTER_DEBUG: z.string().optional(),
});

export type AppEnv = {
  aiBaseUrl: string;
  aiApiKey: string;
  aiModel: string;
  aiEmbeddingModel: string;
  embeddingsEnabled: boolean | "auto";
  embeddingBaseUrl: string;
  embeddingApiKey: string;
  databaseUrl: string | undefined;
  pgliteDir: string;
  siteUrl: string;
  siteName: string;
  adminPassword: string;
  clusterDebug: boolean;
};

function parseTriState(value: string | undefined): boolean | "auto" {
  if (value == null || value === "") return "auto";
  const normalized = value.toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return "auto";
}

function embeddingModelFrom(parsed: z.infer<typeof schema>) {
  const specified = (parsed.EMBEDDING_MODEL || parsed.AI_EMBEDDING_MODEL || "").trim();
  if (specified) return specified;
  const mode = parseTriState(parsed.AI_EMBEDDINGS_ENABLED);
  return mode === true ? "text-embedding-3-small" : "";
}

export function getEnv(): AppEnv {
  const parsed = schema.parse(process.env);
  return {
    aiBaseUrl: parsed.AI_BASE_URL || parsed.BUYTOKENS_BASE_URL || "",
    aiApiKey: parsed.AI_API_KEY || parsed.BUYTOKENS_API_KEY || "",
    aiModel: parsed.AI_MODEL || parsed.BUYTOKENS_MODEL || "claude-fable-5.1",
    aiEmbeddingModel: embeddingModelFrom(parsed),
    embeddingsEnabled: parseTriState(parsed.AI_EMBEDDINGS_ENABLED),
    embeddingBaseUrl: (parsed.EMBEDDING_BASE_URL || parsed.AI_BASE_URL || parsed.BUYTOKENS_BASE_URL || "").replace(
      /\/$/,
      "",
    ),
    embeddingApiKey: parsed.EMBEDDING_API_KEY || parsed.AI_API_KEY || parsed.BUYTOKENS_API_KEY || "",
    databaseUrl: parsed.DATABASE_URL || undefined,
    pgliteDir: parsed.PGLITE_DATA_DIR || "./data/dispatch",
    siteUrl: parsed.SITE_URL || "http://localhost:3002",
    siteName: parsed.SITE_NAME || "Dispatch",
    adminPassword: parsed.ADMIN_PASSWORD || "dispatch-admin-2026",
    clusterDebug: ["1", "true", "yes", "on"].includes((parsed.CLUSTER_DEBUG ?? "").toLowerCase()),
  };
}

export const clusteringConfig = {
  attachThreshold: 0.72,
  ambiguousLow: 0.5,
  conflictScoreCap: 0.64,
  recentWindowHours: 168,
  candidateLimit: 80,
  childUpdateTitleHints: ["spec", "specs", "leak", "leaked", "benchmark", "review"],
  weightsWithEmbeddings: {
    semantic: 0.34,
    title: 0.22,
    entity: 0.18,
    event: 0.12,
    time: 0.09,
    category: 0.05,
  },
  weightsWithoutEmbeddings: {
    semantic: 0,
    title: 0.38,
    entity: 0.28,
    event: 0.18,
    time: 0.11,
    category: 0.05,
  },
};

export const categories = ["gaming", "hardware", "technology", "ai"] as const;
export type Category = (typeof categories)[number];

export const categoryLabels: Record<Category, string> = {
  gaming: "Gaming",
  hardware: "Hardware",
  technology: "Technology",
  ai: "AI",
};

export const categoryMeta: Record<string, { label: string; href: string }> = {
  gaming: { label: "Gaming", href: "/gaming" },
  hardware: { label: "Hardware", href: "/hardware" },
  technology: { label: "Tech", href: "/technology" },
  ai: { label: "AI", href: "/ai" },
};
