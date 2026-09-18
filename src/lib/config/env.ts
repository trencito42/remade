import { z } from "zod";

const schema = z.object({
  AI_BASE_URL: z.string().optional(),
  AI_API_KEY: z.string().optional(),
  AI_MODEL: z.string().optional(),
  AI_EMBEDDING_MODEL: z.string().optional(),
  BUYTOKENS_BASE_URL: z.string().optional(),
  BUYTOKENS_API_KEY: z.string().optional(),
  BUYTOKENS_MODEL: z.string().optional(),
  DATABASE_URL: z.string().optional(),
  PGLITE_DATA_DIR: z.string().optional(),
  SITE_URL: z.string().optional(),
  SITE_NAME: z.string().optional(),
  ADMIN_PASSWORD: z.string().optional(),
});

export type AppEnv = {
  aiBaseUrl: string;
  aiApiKey: string;
  aiModel: string;
  aiEmbeddingModel: string;
  databaseUrl: string | undefined;
  pgliteDir: string;
  siteUrl: string;
  siteName: string;
  adminPassword: string;
};

export function getEnv(): AppEnv {
  const parsed = schema.parse(process.env);
  return {
    aiBaseUrl: parsed.AI_BASE_URL || parsed.BUYTOKENS_BASE_URL || "",
    aiApiKey: parsed.AI_API_KEY || parsed.BUYTOKENS_API_KEY || "",
    aiModel: parsed.AI_MODEL || parsed.BUYTOKENS_MODEL || "claude-fable-5.1",
    aiEmbeddingModel: parsed.AI_EMBEDDING_MODEL || "text-embedding-3-small",
    databaseUrl: parsed.DATABASE_URL || undefined,
    pgliteDir: parsed.PGLITE_DATA_DIR || "./data/dispatch",
    siteUrl: parsed.SITE_URL || "http://localhost:3002",
    siteName: parsed.SITE_NAME || "Dispatch",
    adminPassword: parsed.ADMIN_PASSWORD || "dispatch-admin-2026",
  };
}

export const clusteringConfig = {
  embeddingWeight: 0.55,
  entityWeight: 0.25,
  temporalWeight: 0.15,
  categoryWeight: 0.05,
  attachThreshold: 0.72,
  ambiguousLow: 0.58,
  ambiguousHigh: 0.72,
  recentWindowHours: 72,
  childUpdateTitleHints: ["spec", "specs", "leak", "leaked", "benchmark", "review"],
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
