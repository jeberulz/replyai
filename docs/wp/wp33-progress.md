# WP33 progress

Append-only. Newest entries at the bottom.

## 2026-07-09 — Kickoff

- Stories checked in: `docs/wp/wp33-stories.md`.
- File boundary: `docs/wp/RULINGS.md` → WP33.
- Orchestration: `docs/wp/PHASE1-CLOSEOUT-WP31-33.md`.
- Branch: `feat/wp33-research-agent-v2-mvp` from latest `main` (rebase on WP31 before merge).
- Note: branched after WP31 already merged to `main` (PR #35), so the `crons.ts`
  rebase requirement is satisfied by construction — no separate rebase needed.

## 2026-07-09 — S1 shared helpers

- `shared/researchCurator.ts`: `isProfileQuiet` uses `discoveredAt` staleness
  (default 30d, exclusive of the exact boundary). Decision: `exampleTweets`
  absence is not an independent prune trigger — a fresh sparse row must not be
  pruned; a row only goes quiet once it ages past the window. Documented in the
  helper.
- `curatorMonthKey` is UTC (matches the "1 run per calendar month, UTC" default).
- `demoCuratorArtifact` reuses `demoResearchProfiles`; reasons prefixed
  "Suggested replacement — " via `replacementReason` (idempotent).
- Tests: `tests/researchCurator.test.ts` (10 cases). Typecheck green.

## 2026-07-09 — S2 schema

- Additive optional fields only: `researchRuns.runKind`,
  `researchRuns.curatorPrunedCount`, `researchProfiles.passedReason`,
  `scannerSettings.lastCuratorRunMonth`. No breaking changes to existing rows.
- `curatorPrunedCount` added beyond the S2 list to persist the pruned count per
  run (needed by the S6 UI strip). Justified additive field; noted in stories.
- `_generated/dataModel.d.ts` derives `Doc` types from `schema.ts` directly, so
  no codegen was needed for the new fields. Typecheck green.

## 2026-07-09 — S3 curator action

- `internal.research.pruneQuietSuggestedProfiles`: prunes only `suggested` rows
  that are quiet → `passed` + `passedReason: "quiet_30d"`. **Does not touch
  watched handles or watching rows** — the DoD top line requires a human to
  approve every watch change, so auto-unwatch is out (deviation from the literal
  "quiet watched...pruned" wording; documented for the PR).
- `internal.research.saveCuratorResults`: insert-only for genuinely new handles
  (skips watched/passed/already-suggested), capped at MAX_REPLACEMENT_SUGGESTIONS
  (5); closes the run with resultCount + curatorPrunedCount.
- `internal.researchActions.runMonthlyCurator`: prune → demo path (keys missing
  or isDemo → `demoCuratorArtifact`) → real discovery (reuses fetchSearch/
  fetchHandle/rankResearchProfiles/synthesizeReasons; query built from niche
  keywords + recent topics). No token → keep prune, save 0 new. Reasons prefixed
  "Suggested replacement — ". try/catch → markRunFailed + Sentry.
- Run row is created by the S4 dispatcher; the action receives runId only.
- `npx convex codegen` did not change checked-in `_generated` files; typecheck +
  full suite (324 pass) green.

## 2026-07-09 — S4 cron dispatcher

- `internal.research.dispatchMonthlyCuratorAll`: iterates `scannerSettings`
  rows (same pattern as WP12 briefings iterating `briefingSettings`), gates on
  `hasProAccess({plan, isDemo})`, and skips users whose `lastCuratorRunMonth`
  already equals the current UTC month. Claims the month *before* scheduling so
  an overlapping/retrying cron cannot double-run (idempotent).
- Users without a `scannerSettings` row are not dispatched — they have no
  keywords/watched handles to curate. Documented tradeoff; acceptable for MVP.
- `convex/crons.ts`: appended true monthly cron (day 1, 05:00 UTC). Did not
  reorder existing crons. WP31 archive cron already present on `main` (branched
  after PR #35), so no rebase conflict.
- Typecheck green.
