# Remade — Architecture

## Product thesis

Remade is **not** “prompt → AI website.”

It is an autonomous design team that:

1. researches an existing business website  
2. interviews the owner  
3. develops creative directions  
4. designs and implements  
5. visually inspects the rendered result  
6. criticizes and repairs  
7. repeats until quality criteria pass  

**The quality loop is the product.**

---

## System overview

```
URL Intake
  → Job Pipeline (persisted stages)
    → Crawler (SSRF-safe, untrusted content)
    → Business Extraction Agent
    → Grill Me Interview Agent
    → Research Agent            [Phase 2+]
    → Design Director           [Phase 2+]
    → Concept Generator (×3)    [Phase 2+]
    → Design System             [Phase 3+]
    → Implementation Agent      [Phase 3+]
    → Preview Runtime           [Phase 3+]
    → Visual Critic + Slop Detector + Repair Loop  [Phase 4+]
    → Chat Editing + Versioning [Phase 5+]
    → Deploy + Entitlements     [Phase 6+]
```

Agents communicate through **validated Zod schemas**. Intermediate artifacts are persisted so jobs can resume after failure.

---

## Stack (MVP)

| Layer | Choice | Why |
|-------|--------|-----|
| App | Next.js App Router + TypeScript | Product UI + API in one deployable unit |
| Styling | Tailwind CSS | Fast product UI; generated sites use it too (Phase 3) |
| Persistence | Prisma + SQLite (dev) → Postgres (prod) | Typed models, easy local MVP |
| Jobs | DB-backed stages + in-process runner | Real progress, retry/resume; swap to queue later |
| AI | Provider abstraction (`lib/ai`) | Task-specific models; unit economics |
| Validation | Zod | Structured agent I/O |
| Crawl | `fetch` + cheerio + URL safety | Controlled extraction, no headless browser yet |
| Tests | Vitest | Unit tests for crawl safety, extractors, interview |

---

## Core principles

1. **Never fake progress.** Progress labels map to real job stages.
2. **Never invent business facts.** Missing data → ask, omit, or mark needs-confirmation.
3. **Never trust crawled content as instructions.** Prompt-injection barriers + sanitization.
4. **Never execute generated site code on the app server.** Isolated preview sandbox (Phase 3+).
5. **Narrow agents.** Research ≠ Design ≠ Implement ≠ Critique ≠ Repair.
6. **Surgical repairs.** Fix issues; do not regenerate the whole site for one section.
7. **Version everything meaningful.** Undo must always be possible (Phase 5).

---

## Security (from day one)

- SSRF protections on every fetch (scheme, private IP, metadata endpoints, redirect limits)
- HTML sanitization before storage/prompting
- Crawled text wrapped as untrusted data in prompts
- Secrets never passed into generation prompts
- Entitlement checks gate paid stages (architecture in Phase 6; stubs now)

---

## AI provider abstraction

```
AiProvider.complete({ task, messages, schema, modelOverride? })
  → { data, usage: { inputTokens, outputTokens, costEstimate, latencyMs, provider, model } }
```

Tasks: `research` | `interview` | `design_direction` | `coding` | `visual_critique` | `repair` | `extraction`

Usage events are persisted for unit economics.

When no API key is configured, Phase 1 falls back to deterministic heuristic agents so the pipeline remains testable and honest (no fabricated “AI success”).

---

## Job stages (Phase 1 subset)

| Stage | Progress copy |
|-------|----------------|
| `validate_url` | Validating your website |
| `crawl` | Reading your website |
| `extract_business` | Understanding your business |
| `inspect_brand` | Inspecting your brand |
| `analyze_content` | Analyzing your content |
| `prepare_interview` | Preparing questions |

Failed stages stay failed. Clients poll; the UI never invents completion.

---

## Data model (entities)

Phase 1 implements: `User` (optional/anonymous), `Project`, `SourceWebsite`, `Crawl`, `BusinessProfile`, `Interview`, `InterviewMessage`, `GenerationJob`, `GenerationStage`, `UsageEvent`.

Forward-compatible tables/types documented for: `CreativeBrief`, `StyleDNA`, `Concept`, `WebsiteVersion`, `VisualReview`, `VisualIssue`, `Deployment`, `Entitlement`.

---

## Product UI principles

Serious creative tool — not generic AI SaaS.

- Preview (later) is the star; chrome stays restrained  
- Strong typography, excellent spacing  
- No purple gradients, glowing orbs, glassmorphism, endless cards  

---

## Phase map

See [PHASES.md](./PHASES.md). Complete and validate each phase before advancing.
