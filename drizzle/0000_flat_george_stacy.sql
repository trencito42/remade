CREATE TABLE "admin_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"token_hash" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"task" text NOT NULL,
	"model" text NOT NULL,
	"provider" text NOT NULL,
	"prompt_version" text NOT NULL,
	"input_tokens" integer,
	"output_tokens" integer,
	"latency_ms" integer NOT NULL,
	"status" text NOT NULL,
	"error" text,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "draft_articles" (
	"id" text PRIMARY KEY NOT NULL,
	"story_id" text NOT NULL,
	"title" text NOT NULL,
	"dek" text NOT NULL,
	"body" jsonb NOT NULL,
	"hero_image" jsonb,
	"status" text NOT NULL,
	"generated_at" timestamp with time zone,
	"reviewed_at" timestamp with time zone,
	"editor_notes" text,
	"seo_title" text,
	"seo_description" text,
	"editorial_profile_id" text
);
--> statement-breakpoint
CREATE TABLE "editorial_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"language" text NOT NULL,
	"tone" text NOT NULL,
	"reading_level" text NOT NULL,
	"headline_style" text NOT NULL,
	"article_length" text NOT NULL,
	"allowed_categories" jsonb NOT NULL,
	"banned_phrases" jsonb NOT NULL,
	"style_instructions" text NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entities" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"canonical_key" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entity_aliases" (
	"id" text PRIMARY KEY NOT NULL,
	"entity_id" text NOT NULL,
	"alias" text NOT NULL,
	"normalized_alias" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"job_name" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" text NOT NULL,
	"error" text,
	"started_at" timestamp with time zone NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "published_articles" (
	"id" text PRIMARY KEY NOT NULL,
	"draft_id" text NOT NULL,
	"story_id" text NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"dek" text NOT NULL,
	"body" jsonb NOT NULL,
	"hero_image" jsonb,
	"published_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"seo_title" text,
	"seo_description" text,
	"category" text NOT NULL,
	"search_text" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "raw_articles" (
	"id" text PRIMARY KEY NOT NULL,
	"source_id" text NOT NULL,
	"external_id" text,
	"url" text NOT NULL,
	"canonical_url" text NOT NULL,
	"title" text NOT NULL,
	"excerpt" text,
	"body_text" text,
	"published_at" timestamp with time zone,
	"fetched_at" timestamp with time zone NOT NULL,
	"language" text,
	"author" text,
	"image_url" text,
	"content_hash" text NOT NULL,
	"title_hash" text NOT NULL,
	"embedding" jsonb,
	"ingestion_status" text DEFAULT 'stored' NOT NULL,
	"cited_source_url" text,
	"is_seed" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "source_feeds" (
	"id" text PRIMARY KEY NOT NULL,
	"source_id" text NOT NULL,
	"url" text NOT NULL,
	"feed_type" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"last_checked_at" timestamp with time zone,
	"last_success_at" timestamp with time zone,
	"last_error" text,
	"last_error_at" timestamp with time zone,
	"articles_received" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"domain" text NOT NULL,
	"type" text NOT NULL,
	"tier" integer NOT NULL,
	"reliability_weight" real DEFAULT 1 NOT NULL,
	"logo_url" text,
	"category" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"is_seed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "story_claim_sources" (
	"claim_id" text NOT NULL,
	"raw_article_id" text NOT NULL,
	"support_type" text NOT NULL,
	CONSTRAINT "story_claim_sources_claim_id_raw_article_id_pk" PRIMARY KEY("claim_id","raw_article_id")
);
--> statement-breakpoint
CREATE TABLE "story_claims" (
	"id" text PRIMARY KEY NOT NULL,
	"story_id" text NOT NULL,
	"claim_text" text NOT NULL,
	"claim_type" text NOT NULL,
	"confidence" real DEFAULT 0 NOT NULL,
	"status" text NOT NULL,
	"first_seen_at" timestamp with time zone NOT NULL,
	"excerpt" text
);
--> statement-breakpoint
CREATE TABLE "story_clusters" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"working_title" text NOT NULL,
	"summary" text,
	"status" text NOT NULL,
	"category" text NOT NULL,
	"importance" integer DEFAULT 50 NOT NULL,
	"first_seen_at" timestamp with time zone NOT NULL,
	"last_updated_at" timestamp with time zone NOT NULL,
	"confidence" real DEFAULT 0 NOT NULL,
	"source_count" integer DEFAULT 0 NOT NULL,
	"parent_story_id" text,
	"embedding" jsonb,
	"is_seed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "story_entities" (
	"story_id" text NOT NULL,
	"entity_id" text NOT NULL,
	"salience" real DEFAULT 1 NOT NULL,
	CONSTRAINT "story_entities_story_id_entity_id_pk" PRIMARY KEY("story_id","entity_id")
);
--> statement-breakpoint
CREATE TABLE "story_sources" (
	"story_id" text NOT NULL,
	"raw_article_id" text NOT NULL,
	"relationship" text NOT NULL,
	"is_primary_source" boolean DEFAULT false NOT NULL,
	"confidence" real DEFAULT 0 NOT NULL,
	CONSTRAINT "story_sources_story_id_raw_article_id_pk" PRIMARY KEY("story_id","raw_article_id")
);
--> statement-breakpoint
CREATE TABLE "story_tags" (
	"story_id" text NOT NULL,
	"tag_id" text NOT NULL,
	CONSTRAINT "story_tags_story_id_tag_id_pk" PRIMARY KEY("story_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "story_updates" (
	"id" text PRIMARY KEY NOT NULL,
	"story_id" text NOT NULL,
	"update_type" text NOT NULL,
	"summary" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "draft_articles" ADD CONSTRAINT "draft_articles_story_id_story_clusters_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."story_clusters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draft_articles" ADD CONSTRAINT "draft_articles_editorial_profile_id_editorial_profiles_id_fk" FOREIGN KEY ("editorial_profile_id") REFERENCES "public"."editorial_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_aliases" ADD CONSTRAINT "entity_aliases_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "published_articles" ADD CONSTRAINT "published_articles_draft_id_draft_articles_id_fk" FOREIGN KEY ("draft_id") REFERENCES "public"."draft_articles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "published_articles" ADD CONSTRAINT "published_articles_story_id_story_clusters_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."story_clusters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_articles" ADD CONSTRAINT "raw_articles_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_feeds" ADD CONSTRAINT "source_feeds_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_claim_sources" ADD CONSTRAINT "story_claim_sources_claim_id_story_claims_id_fk" FOREIGN KEY ("claim_id") REFERENCES "public"."story_claims"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_claim_sources" ADD CONSTRAINT "story_claim_sources_raw_article_id_raw_articles_id_fk" FOREIGN KEY ("raw_article_id") REFERENCES "public"."raw_articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_claims" ADD CONSTRAINT "story_claims_story_id_story_clusters_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."story_clusters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_clusters" ADD CONSTRAINT "story_clusters_parent_story_id_story_clusters_id_fk" FOREIGN KEY ("parent_story_id") REFERENCES "public"."story_clusters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_entities" ADD CONSTRAINT "story_entities_story_id_story_clusters_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."story_clusters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_entities" ADD CONSTRAINT "story_entities_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_sources" ADD CONSTRAINT "story_sources_story_id_story_clusters_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."story_clusters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_sources" ADD CONSTRAINT "story_sources_raw_article_id_raw_articles_id_fk" FOREIGN KEY ("raw_article_id") REFERENCES "public"."raw_articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_tags" ADD CONSTRAINT "story_tags_story_id_story_clusters_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."story_clusters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_tags" ADD CONSTRAINT "story_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_updates" ADD CONSTRAINT "story_updates_story_id_story_clusters_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."story_clusters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "admin_sessions_token_idx" ON "admin_sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "ai_runs_created_idx" ON "ai_runs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "ai_runs_task_idx" ON "ai_runs" USING btree ("task");--> statement-breakpoint
CREATE INDEX "draft_articles_story_idx" ON "draft_articles" USING btree ("story_id");--> statement-breakpoint
CREATE UNIQUE INDEX "entities_canonical_idx" ON "entities" USING btree ("canonical_key");--> statement-breakpoint
CREATE UNIQUE INDEX "entity_aliases_normalized_idx" ON "entity_aliases" USING btree ("normalized_alias");--> statement-breakpoint
CREATE INDEX "job_runs_name_idx" ON "job_runs" USING btree ("job_name");--> statement-breakpoint
CREATE UNIQUE INDEX "published_articles_slug_idx" ON "published_articles" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "published_articles_published_idx" ON "published_articles" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "published_articles_category_idx" ON "published_articles" USING btree ("category");--> statement-breakpoint
CREATE INDEX "published_articles_category_date_idx" ON "published_articles" USING btree ("category","published_at");--> statement-breakpoint
CREATE INDEX "published_articles_search_idx" ON "published_articles" USING btree ("search_text");--> statement-breakpoint
CREATE UNIQUE INDEX "raw_articles_canonical_idx" ON "raw_articles" USING btree ("canonical_url");--> statement-breakpoint
CREATE UNIQUE INDEX "raw_articles_source_external_idx" ON "raw_articles" USING btree ("source_id","external_id");--> statement-breakpoint
CREATE INDEX "raw_articles_content_hash_idx" ON "raw_articles" USING btree ("content_hash");--> statement-breakpoint
CREATE INDEX "raw_articles_title_hash_idx" ON "raw_articles" USING btree ("title_hash");--> statement-breakpoint
CREATE INDEX "raw_articles_published_idx" ON "raw_articles" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "raw_articles_status_idx" ON "raw_articles" USING btree ("ingestion_status","fetched_at");--> statement-breakpoint
CREATE INDEX "source_feeds_source_idx" ON "source_feeds" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "source_feeds_health_idx" ON "source_feeds" USING btree ("enabled","last_checked_at");--> statement-breakpoint
CREATE UNIQUE INDEX "sources_domain_idx" ON "sources" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "story_claims_story_idx" ON "story_claims" USING btree ("story_id");--> statement-breakpoint
CREATE UNIQUE INDEX "story_clusters_slug_idx" ON "story_clusters" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "story_clusters_updated_idx" ON "story_clusters" USING btree ("last_updated_at");--> statement-breakpoint
CREATE INDEX "story_clusters_status_idx" ON "story_clusters" USING btree ("status");--> statement-breakpoint
CREATE INDEX "story_clusters_category_idx" ON "story_clusters" USING btree ("category");--> statement-breakpoint
CREATE INDEX "story_updates_story_idx" ON "story_updates" USING btree ("story_id");