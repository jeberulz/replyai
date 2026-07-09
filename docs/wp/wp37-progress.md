# WP37 Progress — Trend-radar MVP

## 2026-07-09 — Scaffold

- Separate from WP13 author dossiers; topic-level only for MVP.

## 2026-07-09 — WP37-S1

- Heuristic MVP in `shared/trends.ts`: niche-keyword overlap first, content-token
  fallback when keywords miss. No embeddings/LLM labeling in v1 (upgrade path
  documented in file header).
- Cap top 3; 7-day window; min cluster size 2; counts only (no fake %).
- Demo: `demoTrendTopics()` seeds DEMO_TWEETS ×2 so clusters clear min size;
  deterministic for a fixed `nowMs`.
- Tests: 9 cases in `tests/trends.test.ts` — all green.

## 2026-07-09 — WP37-S2

- Additive `trendRuns` table (topic clusters only; separate from WP13).
- `convex/trends.ts`: `radar` query via `requireUser`; client passes `nowMs`
  (no Date.now in queries). Demo users → `demoTrendTopics`. Live users cluster
  last 7d opportunities (max 200), niche keywords from scanner settings.
- Optional `recordRun` internalMutation for future cache/cron — MVP path is
  on-demand only.
- Codegen + typecheck green.

## 2026-07-09 — WP37-S3

- Surface: `/feed` only (one surface). `TrendRadarStrip` above the opportunity
  list; links to `/feed?topic=<slug>` and clears when re-clicked.
- Feed filters by `opportunityMatchesTopic` (id → keyword → slug token).
- No fake engagement %; copy is observed conversation counts only.
- Typecheck + trends tests green.
