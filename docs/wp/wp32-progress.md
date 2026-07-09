# WP32 progress

Append-only. Newest entries at the bottom.

## 2026-07-09 — Kickoff

- Stories checked in: `docs/wp/wp32-stories.md`.
- File boundary: `docs/wp/RULINGS.md` → WP32.
- Orchestration: `docs/wp/PHASE1-CLOSEOUT-WP31-33.md`.
- Branch: `feat/wp32-ranking-outcome-weights` from latest `main`.

## 2026-07-09 — Working-directory collision (gotcha for future agents)

- The shared main checkout (`/Users/jeberulz/Documents/AI-projects/replyai`)
  had a concurrent WP31 agent actively working in it. My first `git checkout
  -b feat/wp32-ranking-outcome-weights` there got clobbered when the other
  session checked back out to its own branch mid-session, and my WP32-S1
  commit briefly landed on `feat/wp31-freshness-auto-archive`. Fixed by
  `git reset --soft HEAD~1` on that branch (no disruption to WP31's
  uncommitted work) and moving to a dedicated worktree at
  `/Users/jeberulz/Documents/AI-projects/replyai-wp32` (matches the existing
  `replyai-wpNN` convention used by other WPs). **All WP32 work from here on
  happens in that worktree, not the shared main checkout.**

## 2026-07-09 — WP32-S1 done

- `shared/rankingWeights.ts`: added `funnelOutcomeScore` (responded=1.0,
  sent=0.6, analyzed=0.25, ignored/no-outcome=0) and `recencyWeight`
  (exponential decay, 7-day half-life). `bucketRate` now takes `now` and
  computes a recency-weighted average of `funnelOutcomeScore` instead of a
  plain analyzed/not-analyzed ratio. `MIN_SAMPLE`/`MIN_TOTAL`/clamp range
  (0.85-1.15) unchanged. `opportunityWasAnalyzed` and
  `opportunityToAnalyzeRate` untouched — they're the dashboard's separate
  "was this looked at" stat, not part of ranking.
- Tests added: `funnelOutcomeScore` ordering, `recencyWeight` decay shape,
  an integration case where a source with `responded` rows beats one with
  only `analyzed` rows, and a case where shifting a `responded` row 10 days
  back (still inside the 14-day lookback) lowers its multiplier vs. the
  recent version. Had to pick outcome mixes that don't saturate the
  ±0.85-1.15 clamp, otherwise the "old rows weigh less" assertion is
  untestable (both sides clamp to the same value).
