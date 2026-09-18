import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const sources = pgTable(
  "sources",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    domain: text("domain").notNull(),
    type: text("type").notNull(),
    tier: integer("tier").notNull(),
    reliabilityWeight: real("reliability_weight").notNull().default(1),
    logoUrl: text("logo_url"),
    category: text("category"),
    enabled: boolean("enabled").notNull().default(true),
    isSeed: boolean("is_seed").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (t) => [uniqueIndex("sources_domain_idx").on(t.domain)],
);

export const sourceFeeds = pgTable(
  "source_feeds",
  {
    id: text("id").primaryKey(),
    sourceId: text("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    feedType: text("feed_type").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
    lastSuccessAt: timestamp("last_success_at", { withTimezone: true }),
    lastError: text("last_error"),
    lastErrorAt: timestamp("last_error_at", { withTimezone: true }),
    articlesReceived: integer("articles_received").notNull().default(0),
  },
  (t) => [index("source_feeds_source_idx").on(t.sourceId)],
);

export const rawArticles = pgTable(
  "raw_articles",
  {
    id: text("id").primaryKey(),
    sourceId: text("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    externalId: text("external_id"),
    url: text("url").notNull(),
    canonicalUrl: text("canonical_url").notNull(),
    title: text("title").notNull(),
    excerpt: text("excerpt"),
    bodyText: text("body_text"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull(),
    language: text("language"),
    author: text("author"),
    imageUrl: text("image_url"),
    contentHash: text("content_hash").notNull(),
    titleHash: text("title_hash").notNull(),
    embedding: jsonb("embedding").$type<number[]>(),
    ingestionStatus: text("ingestion_status").notNull().default("stored"),
    citedSourceUrl: text("cited_source_url"),
    isSeed: boolean("is_seed").notNull().default(false),
  },
  (t) => [
    uniqueIndex("raw_articles_canonical_idx").on(t.canonicalUrl),
    uniqueIndex("raw_articles_source_external_idx").on(t.sourceId, t.externalId),
    index("raw_articles_content_hash_idx").on(t.contentHash),
    index("raw_articles_title_hash_idx").on(t.titleHash),
    index("raw_articles_published_idx").on(t.publishedAt),
  ],
);

export const storyClusters = pgTable(
  "story_clusters",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    workingTitle: text("working_title").notNull(),
    summary: text("summary"),
    status: text("status").notNull(),
    category: text("category").notNull(),
    importance: integer("importance").notNull().default(50),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull(),
    lastUpdatedAt: timestamp("last_updated_at", { withTimezone: true }).notNull(),
    confidence: real("confidence").notNull().default(0),
    sourceCount: integer("source_count").notNull().default(0),
    parentStoryId: text("parent_story_id"),
    embedding: jsonb("embedding").$type<number[]>(),
    isSeed: boolean("is_seed").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    uniqueIndex("story_clusters_slug_idx").on(t.slug),
    index("story_clusters_updated_idx").on(t.lastUpdatedAt),
    index("story_clusters_status_idx").on(t.status),
    index("story_clusters_category_idx").on(t.category),
  ],
);

export const storySources = pgTable(
  "story_sources",
  {
    storyId: text("story_id")
      .notNull()
      .references(() => storyClusters.id, { onDelete: "cascade" }),
    rawArticleId: text("raw_article_id")
      .notNull()
      .references(() => rawArticles.id, { onDelete: "cascade" }),
    relationship: text("relationship").notNull(),
    isPrimarySource: boolean("is_primary_source").notNull().default(false),
    confidence: real("confidence").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.storyId, t.rawArticleId] })],
);

export const storyClaims = pgTable(
  "story_claims",
  {
    id: text("id").primaryKey(),
    storyId: text("story_id")
      .notNull()
      .references(() => storyClusters.id, { onDelete: "cascade" }),
    claimText: text("claim_text").notNull(),
    claimType: text("claim_type").notNull(),
    confidence: real("confidence").notNull().default(0),
    status: text("status").notNull(),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull(),
    excerpt: text("excerpt"),
  },
  (t) => [index("story_claims_story_idx").on(t.storyId)],
);

export const storyClaimSources = pgTable(
  "story_claim_sources",
  {
    claimId: text("claim_id")
      .notNull()
      .references(() => storyClaims.id, { onDelete: "cascade" }),
    rawArticleId: text("raw_article_id")
      .notNull()
      .references(() => rawArticles.id, { onDelete: "cascade" }),
    supportType: text("support_type").notNull(),
  },
  (t) => [primaryKey({ columns: [t.claimId, t.rawArticleId] })],
);

export const storyUpdates = pgTable(
  "story_updates",
  {
    id: text("id").primaryKey(),
    storyId: text("story_id")
      .notNull()
      .references(() => storyClusters.id, { onDelete: "cascade" }),
    updateType: text("update_type").notNull(),
    summary: text("summary").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("story_updates_story_idx").on(t.storyId)],
);

export const draftArticles = pgTable(
  "draft_articles",
  {
    id: text("id").primaryKey(),
    storyId: text("story_id")
      .notNull()
      .references(() => storyClusters.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    dek: text("dek").notNull(),
    body: jsonb("body").$type<ArticleBlock[]>().notNull(),
    heroImage: jsonb("hero_image").$type<ImageRef | null>(),
    status: text("status").notNull(),
    generatedAt: timestamp("generated_at", { withTimezone: true }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    editorNotes: text("editor_notes"),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    editorialProfileId: text("editorial_profile_id"),
  },
  (t) => [index("draft_articles_story_idx").on(t.storyId)],
);

export const publishedArticles = pgTable(
  "published_articles",
  {
    id: text("id").primaryKey(),
    draftId: text("draft_id")
      .notNull()
      .references(() => draftArticles.id),
    storyId: text("story_id")
      .notNull()
      .references(() => storyClusters.id),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    dek: text("dek").notNull(),
    body: jsonb("body").$type<ArticleBlock[]>().notNull(),
    heroImage: jsonb("hero_image").$type<ImageRef | null>(),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    category: text("category").notNull(),
    searchText: text("search_text").notNull().default(""),
  },
  (t) => [
    uniqueIndex("published_articles_slug_idx").on(t.slug),
    index("published_articles_published_idx").on(t.publishedAt),
    index("published_articles_category_idx").on(t.category),
  ],
);

export const tags = pgTable("tags", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
});

export const storyTags = pgTable(
  "story_tags",
  {
    storyId: text("story_id")
      .notNull()
      .references(() => storyClusters.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.storyId, t.tagId] })],
);

export const entities = pgTable(
  "entities",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    type: text("type").notNull(),
    canonicalKey: text("canonical_key").notNull(),
  },
  (t) => [uniqueIndex("entities_canonical_idx").on(t.canonicalKey)],
);

export const entityAliases = pgTable(
  "entity_aliases",
  {
    id: text("id").primaryKey(),
    entityId: text("entity_id")
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    alias: text("alias").notNull(),
    normalizedAlias: text("normalized_alias").notNull(),
  },
  (t) => [uniqueIndex("entity_aliases_normalized_idx").on(t.normalizedAlias)],
);

export const storyEntities = pgTable(
  "story_entities",
  {
    storyId: text("story_id")
      .notNull()
      .references(() => storyClusters.id, { onDelete: "cascade" }),
    entityId: text("entity_id")
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    salience: real("salience").notNull().default(1),
  },
  (t) => [primaryKey({ columns: [t.storyId, t.entityId] })],
);

export const editorialProfiles = pgTable("editorial_profiles", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  language: text("language").notNull(),
  tone: text("tone").notNull(),
  readingLevel: text("reading_level").notNull(),
  headlineStyle: text("headline_style").notNull(),
  articleLength: text("article_length").notNull(),
  allowedCategories: jsonb("allowed_categories").$type<string[]>().notNull(),
  bannedPhrases: jsonb("banned_phrases").$type<string[]>().notNull(),
  styleInstructions: text("style_instructions").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
});

export const aiRuns = pgTable(
  "ai_runs",
  {
    id: text("id").primaryKey(),
    task: text("task").notNull(),
    model: text("model").notNull(),
    provider: text("provider").notNull(),
    promptVersion: text("prompt_version").notNull(),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    latencyMs: integer("latency_ms").notNull(),
    status: text("status").notNull(),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("ai_runs_created_idx").on(t.createdAt), index("ai_runs_task_idx").on(t.task)],
);

export const jobRuns = pgTable(
  "job_runs",
  {
    id: text("id").primaryKey(),
    jobName: text("job_name").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    status: text("status").notNull(),
    error: text("error"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (t) => [index("job_runs_name_idx").on(t.jobName)],
);

export type ArticleBlock = {
  id: string;
  type: "p" | "h2" | "quote";
  text: string;
};

export type ImageRef = {
  url: string;
  sourceUrl?: string;
  width?: number;
  height?: number;
  alt?: string;
  attribution?: string;
  stored?: boolean;
};
