# Remade

Paste an existing business website. Remade researches it, interviews the owner, develops creative directions, builds, critiques, repairs, and lets you edit — until it’s good enough to ship.

**The quality loop is the product.**

## Flow

```
URL → Analysis → Grill Me → 3 Directions → Build → QA loop → Studio → Publish / Share
```

## Develop

```bash
npm install
npm run dev
```

Open [http://localhost:3002](http://localhost:3002).

```bash
npm test
npm run build
```

Optional LLM enrichment via `.env.local` (`OPENAI_API_KEY`). Without a key, heuristic agents run — never fake LLM success.

## Docs

- `docs/ARCHITECTURE.md`
- `docs/PHASES.md`
- `docs/PHASE1.md`

## Stack

Next.js · TypeScript · Tailwind · SQLite · Zod schemas between agents · sandboxed HTML preview (no arbitrary codegen execution on the app server).
