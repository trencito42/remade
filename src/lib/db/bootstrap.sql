CREATE TABLE IF NOT EXISTS sources (
  id text PRIMARY KEY,
  name text NOT NULL,
  domain text NOT NULL,
  type text NOT NULL,
  tier integer NOT NULL,
  reliability_weight real NOT NULL DEFAULT 1,
  logo_url text,
  category text,
  enabled boolean NOT NULL DEFAULT true,
  is_seed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS sources_domain_idx ON sources (domain);

CREATE TABLE IF NOT EXISTS source_feeds (
  id text PRIMARY KEY,
  source_id text NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  url text NOT NULL,
  feed_type text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  last_checked_at timestamptz,
  last_success_at timestamptz,
  last_error text,
  last_error_at timestamptz,
  articles_received integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS source_feeds_source_idx ON source_feeds (source_id);

CREATE TABLE IF NOT EXISTS raw_articles (
  id text PRIMARY KEY,
  source_id text NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  external_id text,
  url text NOT NULL,
  canonical_url text NOT NULL,
  title text NOT NULL,
  excerpt text,
  body_text text,
  published_at timestamptz,
  fetched_at timestamptz NOT NULL,
  language text,
  author text,
  image_url text,
  content_hash text NOT NULL,
  title_hash text NOT NULL,
  embedding jsonb,
  ingestion_status text NOT NULL DEFAULT 'stored',
  cited_source_url text,
  is_seed boolean NOT NULL DEFAULT false
);
CREATE UNIQUE INDEX IF NOT EXISTS raw_articles_canonical_idx ON raw_articles (canonical_url);
CREATE UNIQUE INDEX IF NOT EXISTS raw_articles_source_external_idx ON raw_articles (source_id, external_id);
CREATE INDEX IF NOT EXISTS raw_articles_content_hash_idx ON raw_articles (content_hash);
CREATE INDEX IF NOT EXISTS raw_articles_title_hash_idx ON raw_articles (title_hash);
CREATE INDEX IF NOT EXISTS raw_articles_published_idx ON raw_articles (published_at);

CREATE TABLE IF NOT EXISTS story_clusters (
  id text PRIMARY KEY,
  slug text NOT NULL,
  working_title text NOT NULL,
  summary text,
  status text NOT NULL,
  category text NOT NULL,
  importance integer NOT NULL DEFAULT 50,
  first_seen_at timestamptz NOT NULL,
  last_updated_at timestamptz NOT NULL,
  confidence real NOT NULL DEFAULT 0,
  source_count integer NOT NULL DEFAULT 0,
  parent_story_id text,
  embedding jsonb,
  is_seed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS story_clusters_slug_idx ON story_clusters (slug);
CREATE INDEX IF NOT EXISTS story_clusters_updated_idx ON story_clusters (last_updated_at);
CREATE INDEX IF NOT EXISTS story_clusters_status_idx ON story_clusters (status);
CREATE INDEX IF NOT EXISTS story_clusters_category_idx ON story_clusters (category);

CREATE TABLE IF NOT EXISTS story_sources (
  story_id text NOT NULL REFERENCES story_clusters(id) ON DELETE CASCADE,
  raw_article_id text NOT NULL REFERENCES raw_articles(id) ON DELETE CASCADE,
  relationship text NOT NULL,
  is_primary_source boolean NOT NULL DEFAULT false,
  confidence real NOT NULL DEFAULT 0,
  PRIMARY KEY (story_id, raw_article_id)
);

CREATE TABLE IF NOT EXISTS story_claims (
  id text PRIMARY KEY,
  story_id text NOT NULL REFERENCES story_clusters(id) ON DELETE CASCADE,
  claim_text text NOT NULL,
  claim_type text NOT NULL,
  confidence real NOT NULL DEFAULT 0,
  status text NOT NULL,
  first_seen_at timestamptz NOT NULL,
  excerpt text
);
CREATE INDEX IF NOT EXISTS story_claims_story_idx ON story_claims (story_id);

CREATE TABLE IF NOT EXISTS story_claim_sources (
  claim_id text NOT NULL REFERENCES story_claims(id) ON DELETE CASCADE,
  raw_article_id text NOT NULL REFERENCES raw_articles(id) ON DELETE CASCADE,
  support_type text NOT NULL,
  PRIMARY KEY (claim_id, raw_article_id)
);

CREATE TABLE IF NOT EXISTS story_updates (
  id text PRIMARY KEY,
  story_id text NOT NULL REFERENCES story_clusters(id) ON DELETE CASCADE,
  update_type text NOT NULL,
  summary text NOT NULL,
  created_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS story_updates_story_idx ON story_updates (story_id);

CREATE TABLE IF NOT EXISTS draft_articles (
  id text PRIMARY KEY,
  story_id text NOT NULL REFERENCES story_clusters(id) ON DELETE CASCADE,
  title text NOT NULL,
  dek text NOT NULL,
  body jsonb NOT NULL,
  hero_image jsonb,
  status text NOT NULL,
  generated_at timestamptz,
  reviewed_at timestamptz,
  editor_notes text,
  seo_title text,
  seo_description text,
  editorial_profile_id text
);
CREATE INDEX IF NOT EXISTS draft_articles_story_idx ON draft_articles (story_id);

CREATE TABLE IF NOT EXISTS published_articles (
  id text PRIMARY KEY,
  draft_id text NOT NULL REFERENCES draft_articles(id),
  story_id text NOT NULL REFERENCES story_clusters(id),
  slug text NOT NULL,
  title text NOT NULL,
  dek text NOT NULL,
  body jsonb NOT NULL,
  hero_image jsonb,
  published_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  seo_title text,
  seo_description text,
  category text NOT NULL,
  search_text text NOT NULL DEFAULT ''
);
CREATE UNIQUE INDEX IF NOT EXISTS published_articles_slug_idx ON published_articles (slug);
CREATE INDEX IF NOT EXISTS published_articles_published_idx ON published_articles (published_at);
CREATE INDEX IF NOT EXISTS published_articles_category_idx ON published_articles (category);

CREATE TABLE IF NOT EXISTS tags (
  id text PRIMARY KEY,
  slug text NOT NULL,
  name text NOT NULL
);

CREATE TABLE IF NOT EXISTS story_tags (
  story_id text NOT NULL REFERENCES story_clusters(id) ON DELETE CASCADE,
  tag_id text NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (story_id, tag_id)
);

CREATE TABLE IF NOT EXISTS entities (
  id text PRIMARY KEY,
  name text NOT NULL,
  type text NOT NULL,
  canonical_key text NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS entities_canonical_idx ON entities (canonical_key);

CREATE TABLE IF NOT EXISTS entity_aliases (
  id text PRIMARY KEY,
  entity_id text NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  alias text NOT NULL,
  normalized_alias text NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS entity_aliases_normalized_idx ON entity_aliases (normalized_alias);

CREATE TABLE IF NOT EXISTS story_entities (
  story_id text NOT NULL REFERENCES story_clusters(id) ON DELETE CASCADE,
  entity_id text NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  salience real NOT NULL DEFAULT 1,
  PRIMARY KEY (story_id, entity_id)
);

CREATE TABLE IF NOT EXISTS editorial_profiles (
  id text PRIMARY KEY,
  name text NOT NULL,
  language text NOT NULL,
  tone text NOT NULL,
  reading_level text NOT NULL,
  headline_style text NOT NULL,
  article_length text NOT NULL,
  allowed_categories jsonb NOT NULL,
  banned_phrases jsonb NOT NULL,
  style_instructions text NOT NULL,
  is_default boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS ai_runs (
  id text PRIMARY KEY,
  task text NOT NULL,
  model text NOT NULL,
  provider text NOT NULL,
  prompt_version text NOT NULL,
  input_tokens integer,
  output_tokens integer,
  latency_ms integer NOT NULL,
  status text NOT NULL,
  error text,
  created_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS ai_runs_created_idx ON ai_runs (created_at);
CREATE INDEX IF NOT EXISTS ai_runs_task_idx ON ai_runs (task);

CREATE TABLE IF NOT EXISTS job_runs (
  id text PRIMARY KEY,
  job_name text NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL,
  error text,
  started_at timestamptz NOT NULL,
  finished_at timestamptz
);
CREATE INDEX IF NOT EXISTS job_runs_name_idx ON job_runs (job_name);
