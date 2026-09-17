# Phase 1 decisions & validation

## What shipped

Working end-to-end flow:

1. Landing — paste URL  
2. Project + analysis job created  
3. Real persisted stages (validate → crawl → extract → brand → content → interview prep)  
4. Adaptive Grill Me interview (or assumptions)  
5. “What I understood” summary with corrections + confirm  

## Architectural decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Persistence | `better-sqlite3` + SQL schema | Prisma RC tooling failed in this environment; SQLite keeps local MVP honest and portable. Swap to Postgres later without changing repository shapes. |
| Jobs | DB stages + in-process runner | Real progress polling; no fake timers. Queue worker can replace kickoff later. |
| Crawl | `fetch` + cheerio, max 6 pages | Enough for MVP business understanding; Playwright later if JS-rendered sites dominate. |
| AI | Provider abstraction + heuristic fallback | Product works without keys; never pretends an LLM call succeeded. |
| Interview | Heuristic adaptive questioner | Asks only material gaps; LLM can enrich summaries when configured. |
| Entitlements | Feature stubs only | Billing architecture reserved; no hardwired prices. |

## Security choices

- URL normalization + DNS resolution private-IP checks (SSRF)
- Redirect caps, size/timeout limits, HTML-only responses
- Script stripping + untrusted content wrappers for prompts
- Credentials stripped from URLs

## Files added (high level)

- `docs/ARCHITECTURE.md`, `docs/PHASES.md`, `docs/PHASE1.md`
- `src/lib/db/*`, `src/lib/security/*`, `src/lib/ai/*`, `src/lib/crawl/*`
- `src/lib/agents/extract-business.ts`, `src/lib/agents/interview.ts`
- `src/lib/jobs/runner.ts`, `src/lib/entitlements/types.ts`
- `src/app/api/projects/**`
- `src/components/{landing,analysis,interview}/*`
- `tests/phase1.test.ts`

## How to run

```bash
npm install
npm run dev
# optional: OPENAI_API_KEY=... for LLM-enriched extraction/summaries
npm test
```

## Remaining limitations (honest)

- Crawler does not execute JavaScript (SPA-only sites will be thin)
- Heuristic extraction is good for local-business HTML, not perfect for every industry
- Interview question bank is curated + adaptive, not fully LLM-planned when offline
- Phase 2+ (concepts, generation, visual QA) intentionally not stubbed as complete
- Single-process job runner is not multi-instance safe yet
- Auth/users are optional/anonymous in Phase 1
- No preview deployment yet

## UX inspection checklist

- [ ] Landing focuses on brand + one input + one CTA
- [ ] Analysis labels advance only when stages succeed
- [ ] Failed crawl shows real error, not success
- [ ] Interview offers Ask everything / Smart assumptions
- [ ] Summary is editable before confirm
- [ ] Confirm gates Phase 2 clearly without fake generation
