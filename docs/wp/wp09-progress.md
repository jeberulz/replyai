# WP9 progress

Append-only. Decisions, dead ends, gotchas for the next iteration.

## 2026-07-09 — stories filed

- Checked in `docs/wp/wp09-stories.md` (WP9-S1…S4).
- Left pre-existing dirty `docs/wp/RULINGS.md` and `convex/_generated/api.d.ts`
  unstaged (orchestrator/ruling + generated noise; not WP9 story work).

## 2026-07-09 — WP9-S1

- Added `CURATED_SOURCE_MIN_RELEVANCE = 0.3`, `isCuratedOpportunitySource`,
  `minRelevanceForSource`.
- `passesCombinedFeedFilter` and `opportunityStillRelevant` both use the
  source-aware bar; brand-safety unsafe still short-circuits to fail.
- Combined score still uses `combineTopicRelevance` (keyword max semantic*0.9),
  so curated pass tests use `relevance >= 0.3/0.9` when keywordScore is 0.
- Verified: `npm run typecheck && npm test -- tests/semanticRelevance.test.ts`.

## 2026-07-09 — WP9-S2

- Extended `SemanticScore` with optional `suggestedAngle` (required on the
  batch classifier path; optional so `src/app/actions.ts` ManualSemanticSchema
  stays compatible without editing out-of-boundary files).
- Added `demoSuggestedAngle`; `demoSemanticRelevance` always sets angle.
- `classifyBatch` zod schema + prompt now emit angle in the same call;
  empty LLM angle falls back to `demoSuggestedAngle`.
- Verified: `npm run typecheck && npm test -- tests/semanticRelevance.test.ts`.

## 2026-07-09 — WP9-S3

- Scanner maps `suggestedAngle` via `resolveSuggestedAngle(semantic, text, niche)`.
- Deleted template `suggestAngle()` from `scannerActions.ts`.
- Cache hits attach `demoSuggestedAngle(target.text, nicheContext)` (no schema).
- Fingerprint dedupe tests still pass (`tests/scannerActions.test.ts`).
- Verified: `npm run typecheck && npm test -- tests/semanticRelevance.test.ts tests/scannerActions.test.ts`.

## 2026-07-09 — WP9-S4

- Full suite: `npm run typecheck && npm run lint && npm test && npm run build` — pass
  (lint: 0 errors, 4 pre-existing warnings in `convex/_generated/*`).
- All stories checked. Opening PR.
