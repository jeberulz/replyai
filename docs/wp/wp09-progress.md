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
