# WP32 — Ranking outcome weights + changelog

**Definition of Done:** Weekly ranking recomputes from outcome quality
(`responded > sent > analyzed`) with recency decay; after recompute the user
gets one plain-language sentence explaining the shift (no fake ML %).

**Product refs:** `docs/PRODUCT_STRATEGY.md` §2 (Learned ranking), §7.2.6
(changelog MVP — deterministic, not LLM agent).

**Depends on:** WP7 on `main` (outcome funnel populated).

**Parallel-safe with:** WP31 (disjoint files).

File boundary: `docs/wp/RULINGS.md` → **2026-07-09 - WP32**.

## Defaults (settled)

- Outcome weights (internal): `responded = 1.0`, `sent = 0.6`,
  `analyzed = 0.25`, `ignored / dismissed-without-outcome = 0`.
- Recency: exponential decay on funnel rows inside 14-day lookback
  (half-life ≈ 7 days — document constant in code).
- Keep clamped multipliers **0.85–1.15**; never show multipliers as UI
  percentages.
- Changelog: deterministic sentence from multiplier deltas (same rules as
  `rankingChangelogSentence` in `shared/briefings.ts` if that file exists on
  your base branch — **extract to `shared/rankingChangelog.ts`** as the
  single source; briefing/WP12 imports from there later).
- Store on `scannerSettings`: `rankingChangelog?: string`,
  `rankingChangelogAt?: number` (set in `recomputeForUser` when weights
  change materially or on every successful recompute — pick one, document).
- Surface changelog once: feed empty-state banner or settings scanner card —
  **minimal**; dismissible or auto-hide after 7 days.
- Demo: deterministic weights + sentence in tests without Convex.

---

## Stories

- [x] **WP32-S1 — Outcome-weighted funnel score**
  - In `shared/rankingWeights.ts`:
    - Replace `opportunityWasAnalyzed` success signal in `bucketRate` with
      `funnelOutcomeScore(row)` using weights above.
    - Add `recencyWeight(scannedAt, nowMs)` applied per row before aggregation.
    - Keep `MIN_SAMPLE`, `MIN_TOTAL`, clamp logic unchanged unless tests
      require tuning — document any constant changes.
  - Update `tests/rankingWeights.test.ts` with cases: responded row beats
    analyzed-only; old rows weigh less than recent.

- [ ] **WP32-S2 — Changelog helper (shared)**
  - Add `shared/rankingChangelog.ts` with `rankingChangelogSentence(weights, nowMs, maxAgeMs?)`.
  - If `shared/briefings.ts` exists on branch, refactor it to import from
    `shared/rankingChangelog.ts` (no behavior change).
  - Vitest for null when stale/no deltas, sentence when source/band mult ≠ 1.

- [ ] **WP32-S3 — Persist changelog on recompute**
  - Extend `scannerSettings` schema (additive): `rankingChangelog`,
    `rankingChangelogAt` optional fields.
  - In `convex/ranking.recomputeForUser`: after patch, set changelog fields
    when new weights computed (null weights → clear changelog).
  - `normalizeRankingWeights` unchanged for scoring path.

- [x] **WP32-S4 — Minimal UI surface**
  - One surface only (choose smallest diff):
    - **Option A:** `feed-scanner.tsx` banner when `rankingChangelogAt` within
      7 days and sentence non-empty, or
    - **Option B:** scanner section on settings page.
  - Copy is the stored sentence verbatim; no multiplier numbers in UI.
  - Demo users see deterministic demo sentence when demo weights present.

- [x] **WP32-S5 — Query exposure**
  - Extend existing scanner settings query (or `scanner.getSettings`) to return
    `rankingChangelog` + `rankingChangelogAt` for the UI — auth via
    `requireUser`.

- [x] **WP32-S6 — Account export**
  - Include new settings fields in export payload if scanner settings exported.

- [x] **WP32-S7 — Final verification + PR**
  - Full CI suite green.
  - Confirm weekly cron unchanged (still `recomputeAll` Monday 04:00 UTC).
  - `docs/wp/wp32-progress.md` complete; PR per playbook §1.
