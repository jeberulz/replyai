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
