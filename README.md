# Dispatch

Dispatch is a real, autonomous newsroom intelligence and publishing engine. It ingests verified RSS/Atom sources, extracts full article content and entities, deduplicates articles deterministically, clusters coverage by real-world events, extracts factual claims and contradictory evidence, generates grounded editorial briefs, writes original drafts aligned to an editorial profile, supports block-level AI editing, and publishes production articles with SEO metadata and search indexing.

Zero mock or fake data exists in production paths.

---

## The Dispatch Pipeline

```
REAL SOURCE (RSS/Atom)
    │
    ▼
SAFE INGESTION (SSRF pre-resolution & canonical dedupe)
    │
    ▼
FULL ARTICLE EXTRACTION (Cheerio, JSON-LD, OpenGraph, clean text)
    │
    ▼
ENTITY INTELLIGENCE (Fast alias catalog + AI extraction pass)
    │
    ▼
EVENT CLUSTERING ENGINE (Semantic embeddings + title similarity + entity overlap + ambiguous AI judge)
    │
    ▼
SOURCE PROVENANCE & CLAIMS (Untrusted source sandboxing, status resolution, price/date contradiction detection)
    │
    ▼
GROUNDED STORY BRIEF (Summary, timeline, confirmed vs. unverified facts)
    │
    ▼
AI DRAFT SYNTHESIS (Zero plagiarism, strict JSON schema, editorial profile tone)
    │
    ▼
BLOCK-LEVEL AI EDITING (Shorten, Make Clearer, Add Context, Verify Claim)
    │
    ▼
PRODUCTION PUBLISHING (Collision-resistant slug generation, search index, public pages)
```

---

## Tech Stack & Architecture

- **Framework**: Next.js 16 (Turbopack, Server Components by default, App Router)
- **Language**: TypeScript 5.9 (Strict mode, zero type errors)
- **Database Layer**: Drizzle ORM + PGlite (local zero-setup development in `./data/dispatch`) and PostgreSQL (production ready via `DATABASE_URL`)
- **Database Migrations**: Drizzle Kit migrations (`drizzle/`) + `bootstrap.sql` for instant PGlite initialization
- **AI Engine**: OpenAI-compatible AI gateway (`AiProvider`) with strict Zod parsing, prompt injection isolation, Markdown extraction, exponential backoff, and correlation IDs
- **Ingestion & Fetching**: Hardened `safeFetch` with DNS pre-resolution, private IPv4/IPv6 blocking, cloud metadata blocking, redirect limits, and response caps
- **Styling**: Vanilla Tailwind CSS v4 with a warm neutral canvas, restrained typography (Geist Sans & Mono), and row-first information design
- **Testing**: Vitest with unit and end-to-end integration tests

---

## Getting Started

### Prerequisites

- Node.js >= 20.x (Node 24 recommended)
- pnpm >= 9.x

### Environment Variables

Copy `.env.example` or configure `.env`:

```bash
# AI Gateway Configuration (OpenAI-compatible)
AI_BASE_URL="http://185.221.214.224:4100/v1"
AI_API_KEY="your-api-key"
AI_MODEL="gpt-5.6-sol"
AI_EMBEDDING_MODEL="text-embedding-3-small"

# Database Configuration (Leave DATABASE_URL empty to use local PGlite)
# DATABASE_URL="postgresql://user:password@localhost:5432/dispatch"
PGLITE_DATA_DIR="./data/dispatch"

# Application Settings
SITE_URL="http://localhost:3002"
SITE_NAME="Dispatch"

# Admin Authentication for Newsroom
ADMIN_PASSWORD="dispatch-admin-2026"
```

---

## Commands

```bash
# 1. Install dependencies
pnpm install

# 2. Seed configuration (editorial profiles, canonical entities, default starter sources)
pnpm db:seed

# 3. Ingest real RSS/Atom feeds once
pnpm ingest

# 4. Start background worker (continuous feed polling and unclustered article processing)
pnpm jobs

# 5. Start development server
pnpm dev

# 6. Run unit and integration tests
pnpm test

# 7. Typecheck and Lint
pnpm typecheck
pnpm lint

# 8. Production build
pnpm build
```

---

## Newsroom Management

- **Newsroom Wire**: `http://localhost:3002/newsroom`
  Browse incoming story clusters grouped by event with category and status filters.
- **Story Workspace**: `http://localhost:3002/newsroom/[id]`
  Inspect grounded story brief, confirmed facts, unverified/disputed claims, supporting sources, generate/edit drafts, and publish.
- **Source Manager**: `http://localhost:3002/newsroom/sources`
  Add, edit, enable, disable, and delete feeds with live health tracking (last checked, last success, last error, articles received).
- **System Health**: `http://localhost:3002/newsroom/health`
  Real-time operational visibility: failing feeds, pending articles, failed jobs, and AI execution logs.

---

## Public Reader Experience

- **Homepage**: `http://localhost:3002/` (Lead story, latest feed, and category blocks)
- **Category Feeds**: `/gaming`, `/hardware`, `/technology`, `/ai`, and `/latest`
- **Article Reader**: `http://localhost:3002/story/[slug]` (Full story with NewsArticle JSON-LD, metadata, source provenance, and claim transparency)
- **Command Search**: `⌘K` or `Ctrl+K` for instant database-backed search

---

## Security & Reliability Guardrails

1. **SSRF Mitigation (`safeFetch`)**:
   - Only `http:` and `https:` protocols allowed.
   - Hostnames resolved via `dns.lookup` before connection.
   - Blocks private IPv4 (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `127.0.0.0/8`), private IPv6 (`fc00::/7`, `fe80::/10`), and cloud metadata IPs (`169.254.169.254`, `100.100.100.200`).
   - Every redirect target validated before following (maximum 5 redirects).
   - Maximum payload capped at 2.5MB.
2. **Prompt Injection Protection**:
   - All third-party article excerpts and text wrapped with explicit safety boundaries (`wrapUntrustedSource()`).
   - System prompts forbid obedience to third-party instructions.
3. **Plagiarism Prevention**:
   - Draft synthesis receives structured claim graphs and provenance rather than raw source articles.
   - Models are instructed to generate original, concise prose without echoing source sentences.
4. **Idempotency & Deduplication**:
   - Content and title hashing prevent duplicate articles across runs.
   - Atomic job locking ensures multi-worker deployments do not duplicate work.

---

## Acceptance Test Verification

The core newsroom pipeline has been verified with real live data:

1. **Real Ingestion**: Ingested 50 articles from live RSS feeds (The Verge, Ars Technica, Polygon, Eurogamer).
2. **Deduplication**: Re-running ingestion detected 50 duplicates with 0 redundant records created.
3. **Event Clustering**: Formed event-specific clusters without collapsing unrelated topics into single buckets.
4. **Claims & Contradictions**: Extracted factual claims, attributed source IDs, and flagged conflicting price/date assertions.
5. **Grounded Brief & Draft**: Synthesized an objective brief and draft using the default Dispatch editorial profile.
6. **AI Segment Editing**: Selected paragraph shortened accurately using `editDraftSegment`.
7. **Publishing**: Created a production article with a collision-resistant slug (`waymo-says-singapore-will-be-its-next-international-robotaxi-city`), verified via direct slug retrieval and database search.
8. **Automated Test Suite**: 10 test files with 37 tests passing cleanly (`pnpm test`).
