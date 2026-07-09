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
