# WP23 Progress — Reply-to-post ladder

Append-only log. Fresh agents resume from here + `wp23-stories.md` + `git log`.

## 2026-07-09 — Scaffold

- Program kickoff from `main` (WP34 merged). Stories unchecked; worker not started.
- Flagship: compound won conversations → standalone / thread / long-form.

## 2026-07-09 — WP23-S1

- Added `shared/compose.ts`: `isWinningReply`, `pickUnusedAngles`,
  `clusterWinningReplies`, demo rows/clusters/bundles.
- Winning = `responded` + not `major_edit` (missing editBucket still counts).
- Unused angles: fuzzy normalize + substring match against used angles.
- Vitest: `tests/compose.test.ts` (6 passing).
- Decision: demo fixtures live in `shared/compose.ts` (not `demoData.ts`) so
  compose stays self-contained for the ladder.
