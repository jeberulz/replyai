# WP9 — Scan-triage agent

**Definition of Done (§14):** LLM triage on top-N; dismiss rate drops measurably

Product intent: curated sources get a *relaxed* relevance bar (not none);
the same classifier call that scores relevance also emits `suggestedAngle`;
template `suggestAngle()` is removed; fingerprint dedupe (WP19) is not
regressed; demo mode stays unbroken.

---

## Stories

- [x] **WP9-S1** — Curated-source relaxed relevance gate
  - Introduce `CURATED_SOURCE_MIN_RELEVANCE = 0.3` in `shared/semanticRelevance.ts`.
  - `passesCombinedFeedFilter` for `list` / `watched` / `search` requires
    combined keyword+semantic relevance ≥ 0.3 (not auto-pass).
  - Brand-safety `unsafe` still always fails for every source.
  - Following / unspecified sources keep `FEED_SCANNER_MIN_RELEVANCE` (0.5).
  - `opportunityStillRelevant` uses the same curated vs following thresholds
    (curated: ≥ 0.3 via stored topic relevance or keyword score; following: ≥ 0.5).
  - Tests: update the curated "pasta recipe" case to expect `false` when
    semantic relevance is below the curated bar; add cases for curated pass
    at ≥ 0.3 and unsafe fail.

- [x] **WP9-S2** — Classifier emits `suggestedAngle` in one pass
  - Extend `SemanticScore` with `suggestedAngle: string`.
  - Add pure helper `demoSuggestedAngle(text, niche?)` for deterministic angles.
  - `demoSemanticRelevance` returns a deterministic `suggestedAngle` via that helper.
  - `ClassifyBatchSchema` / Haiku prompt in `semanticActions.classifyBatch`
    require `suggestedAngle` (short actionable missing-angle style); tweet
    text stays delimited untrusted data.
  - Focused tests cover demo angle determinism / presence.

- [ ] **WP9-S3** — Scanner consumes triage angles; delete template `suggestAngle`
  - `scannerActions` maps `suggestedAngle` from classifier / demo semantic
    result instead of `suggestAngle(t)`.
  - Delete regex/template `suggestAngle()` from `scannerActions.ts`.
  - Cache hits (relevance-only cache, no schema change): if no stored angle,
    use `demoSuggestedAngle(text)` — do not re-call the LLM and do not
    resurrect hot-take/`?`/digit templates.
  - Fingerprint dedupe path unchanged (no regression).

- [ ] **WP9-S4** — Final verification
  - `npm run typecheck && npm run lint && npm test && npm run build` all pass.
  - All stories above checked; `docs/wp/wp09-progress.md` complete.
  - PR opened with DoD, verification, deviations, and "Found, not fixed".
