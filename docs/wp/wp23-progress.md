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

## 2026-07-09 — WP23-S2…S6

- Schema: `composeRuns` table; `savedDrafts.kind` widened with
  `standalone` | `thread` | `longform`; optional `threadPosts`, `title`,
  `composeRunId`.
- `convex/compose.ts`: listClusters (demo fallback), start/complete/fail,
  saveDraftFromOption; all `requireUser` + fair-use on start.
- Account export/delete: `composeRuns` after `savedDrafts` (order 65).
- Generation: `generateComposeOptions` in `src/lib/ai.ts`; actions
  `startComposeAction` / `saveComposeDraftAction` /
  `publishComposeStandaloneAction`.
- UI: `/compose` + sidebar nav; Dark Chrome MasterDetail; copy-out for
  thread/longform; human-click publish for standalone only.
- **Thread draft choice:** single `savedDrafts` row with `kind: "thread"`
  + `threadPosts: string[]`; `text` is joined preview. Not API-published
  as a chain — copy-out / save only (publish mutation rejects thread +
  longform). Standalone uses existing `publishMode: "standalone"`.
- Outcome seed skipped for non reply/quote kinds.
- Tests: `tests/compose.test.ts`, `tests/compose-demo.test.ts`; full
  suite green. Analytics `OptionKind` widened additively for publish
  typing (compose does not emit new funnel events yet).
- Escalation: none. Touched `shared/accountData.ts` + `convex/account.ts`
  + `convex/outcomes.ts` + `src/lib/analytics/events.ts` as required by
  S2 DoD / typecheck (additive).
