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

## 2026-07-09 — WP32-S2 done

- Moved `rankingChangelogSentence` (+ its label maps and default max-age
  constant) from `shared/briefings.ts` into new `shared/rankingChangelog.ts`.
  `shared/briefings.ts` now imports and re-exports it, and its
  `BRIEFING_DEFAULTS.rankingChangelogMaxAgeMs` reads from the new
  `RANKING_CHANGELOG_MAX_AGE_MS` constant — same 7-day value, single source.
  No behavior change: existing `tests/briefings.test.ts` assertions on
  `rankingChangelogSentence` still pass unmodified.
- Added `tests/rankingChangelog.test.ts` importing directly from the new
  module (missing/stale/no-delta/source+band/custom-maxAge cases).

## 2026-07-09 — WP32-S3 done

- Additive `scannerSettings.rankingChangelog` (string) and
  `rankingChangelogAt` (number) in `convex/schema.ts`.
- `convex/ranking.ts`: both `recomputeForUser` and `recomputeAll` now compute
  `rankingChangelogSentence(weights, now)` alongside `rankingWeights` and
  patch both. **Decision:** set on every successful recompute, not only on
  "material" changes — `rankingChangelogSentence` already has a plain
  fallback sentence ("...refreshed recently...") when there's no meaningful
  multiplier delta, so every recompute with enough funnel data produces a
  truthful sentence; when `computeRankingWeights` returns null (not enough
  data), both fields are cleared (patched to `undefined`, matching the
  existing `rankingWeights: weights ?? undefined` pattern). No convex-test
  added for `ranking.ts` — this repo has no `convex/*.test.ts` files at all;
  its testing convention is pure-function unit tests in `shared/`, which
  already covers the actual logic (`computeRankingWeights`,
  `rankingChangelogSentence`).

## 2026-07-09 — WP32-S4 done

- Added a dismissible banner in `feed-scanner.tsx` (Option A from the
  stories doc) between the top bar and the scroll body. Shows
  `settings.rankingChangelog` verbatim, gated on `rankingChangelogAt` being
  within `RANKING_CHANGELOG_MAX_AGE_MS` (client-side belt-and-suspenders
  check on top of the server already only ever setting a fresh sentence).
  Dismiss is local `useState` (session-only) — no persistence story was
  asked for, and the sentence rotates out naturally after 7 days or the
  next weekly recompute.
- Did not touch `feed-scanner.tsx`'s settings dialog, sources config, or any
  freshness/decay copy — that's WP31's surface in the same file. Kept this
  change to one self-contained block (import, one state var, one computed
  bool, one JSX block) to minimize overlap risk with their concurrent edits.
- **Not verified in a running browser.** The shared Convex dev deployment
  (`shiny-crow-162`, from `.env.local` in the main checkout) is a singleton
  resource; a concurrent WP31 agent may have `npx convex dev` pushing its
  own in-progress schema/functions against it right now. Pushing my schema
  change from this worktree risked clobbering their live dev session (the
  same class of collision as the git working-directory issue above).
  Verified instead via `npm run typecheck` (confirms `settings.rankingChangelog`
  types flow through end-to-end from schema → query → component) and a
  manual read-through of the JSX. Flagging this so the PR reviewer/gate
  session does a real browser pass once WP31/WP32 aren't racing the same
  dev deployment.

## 2026-07-09 — WP32-S5 / WP32-S6: no code needed

- **S5 (query exposure):** `api.scanner.settings` already does
  `return { ...row, needsListScope, scannerLocked }` — spreading the whole
  `scannerSettings` doc. Once the schema fields exist, `rankingChangelog`
  and `rankingChangelogAt` are already exposed, still behind the existing
  `requireUser` auth. Confirmed via typecheck (the UI reads
  `settings.rankingChangelog` with no cast).
- **S6 (account export):** `shared/accountData.ts`'s
  `sanitizeAccountExportRow` has no special case for `scannerSettings` — it
  falls through to a whole-row export, so the new fields are included
  automatically. No changes to `shared/accountData.ts` or `convex/account.ts`.

## 2026-07-09 — WP32-S7: final verification

- `npm run typecheck && npm run lint && npm test && npm run build` — all
  green (305 tests passed, 1 pre-existing skip; lint has only pre-existing
  warnings on generated `convex/_generated/*` files, unrelated to this WP).
- Weekly cron confirmed unchanged: `convex/crons.ts` still schedules
  `internal.ranking.recomputeAll` for Monday 04:00 UTC — WP32 did not touch
  `crons.ts`, per the file-boundary ruling.
- File boundary respected: touched `shared/rankingWeights.ts`,
  `shared/rankingChangelog.ts` (new), `convex/ranking.ts`,
  `convex/schema.ts` (additive only), `src/components/app/feed-scanner.tsx`,
  `tests/rankingWeights.test.ts`, `tests/rankingChangelog.test.ts`,
  `docs/wp/wp32-*.md`, `docs/wp/RULINGS.md`, `docs/wp/PHASE1-CLOSEOUT-WP31-33.md`.
  Did not touch `crons.ts`, `opportunities` archive logic, `researchActions.ts`,
  `shared/accountData.ts`, or add any new npm dependency.
- Outstanding item for the reviewer/gate session: no real-browser
  verification of the WP32-S4 banner was performed (see the S4 entry above)
  because the shared Convex dev deployment was a live, contended resource
  during this session. Recommend a browser pass once WP31/WP32 land and the
  dev deployment is quiet.
- Ready for PR per `docs/AGENT_PLAYBOOK.md` §1/§6.
