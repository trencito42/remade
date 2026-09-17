# Remade — full pipeline status

## Completed in this build

| Phase | Status | Notes |
|-------|--------|-------|
| 1 Intake / Grill Me | Done | Real crawl stages + adaptive interview |
| 2 Creative directions | Done | Research → brief → 3 concepts → Style DNA freeze |
| 3 Generate + preview | Done | Design system + SiteDocument + sandboxed HTML preview |
| 4 Visual QA loop | Done | Structural critic + slop detector + surgical repair (min 2 / max 5) |
| 5 Editing + versioning | Done | Chat edits, undo, restore, version history |
| 6 Deploy + entitlements | Done (MVP) | Preview publish `/p/:id`, share links, entitlement gates (no hardwired prices) |
| 7 Quality flywheel | Seeded | Expanded references, critique scoring harness, shareable before/after |

## Honest limitations

- Visual critic is **structural** on rendered HTML (concrete findings). Playwright screenshot capture is the next upgrade (`method: "visual"`).
- Generated site is a structured `SiteDocument` → HTML (isolated iframe), not arbitrary code execution on the app server.
- Custom domains return 402 with architecture note until paid plan wiring.
- Single-process job runner (fine for MVP; swap to queue later).
- Crawler still does not execute JavaScript SPAs.

## Flow

```
URL → Analysis → Grill Me → Directions (A/B/C)
  → Build → QA loop → Studio (before/after + edits + publish + share)
```
