# WP31 progress

Append-only. Newest entries at the bottom.

## 2026-07-09 — Kickoff

- Stories checked in: `docs/wp/wp31-stories.md`.
- File boundary: `docs/wp/RULINGS.md` → WP31.
- Orchestration: `docs/wp/PHASE1-CLOSEOUT-WP31-33.md`.
- Branch: `feat/wp31-freshness-auto-archive` from latest `main` (WP9 merged).
- Note: `shared/rankingWeights.ts` has uncommitted WP32 work-in-progress
  sitting in the shared working tree (outcome-weighted recency decay). Left
  untouched and unstaged — not part of this WP31 branch/PR.

## WP31-S1 — Shared freshness helpers

- Added `shared/feedFreshness.ts` with the age/window helpers, mirroring the
  `replyTiming` curve in `shared/scoring.ts` (full ≤120m, linear decay to 0
  by 480m).
- `tests/feedFreshness.test.ts`: 15 tests covering boundaries at 120m/480m,
  monotonic decay, and effective-score rounding. All green; typecheck clean.

## WP31-S2 — Schema + archive mutations

- `convex/schema.ts`: `opportunities.status` gets `v.literal("archived")`
  (additive) plus optional `archivedAt`.
- `convex/opportunities.ts`: `archiveExpiredForUserImpl` shared helper used
  by both `archiveExpiredForUser` (single user, useful standalone/testing)
  and `archiveExpiredAll` (fans out over `scannerSettings` rows with
  `enabled: true`, matching the existing `scanner.enabledSettings` pattern).
  Archived rows get `outcome: "ignored"` if unset — same convention as the
  existing `pruneStale` dismiss path. Distinct from `pruneStale`: archived
  means "window closed unattended," dismissed means "user rejected it."
  Left `pruneStale` untouched (out of WP31 boundary; it's a redundant-but-
  harmless per-user safety net that already excludes stale rows from the
  default feed via its own status change).
- **Type ripple (not a scope decision, a compile requirement):** adding
  `"archived"` to `opportunities.status` broke three narrower status unions
  that consumed it: `shared/rankingWeights.ts`'s `OpportunityFunnelRow`
  (via `convex/ranking.ts`'s local `toFunnelRow`), `convex/usage.ts`'s
  inline mapping to the same type, and `shared/replyPacing.ts`'s
  `LiveOpportunityPoint`. Ruling forbids editing `shared/rankingWeights.ts`,
  so fixed this at the call site instead: `convex/ranking.ts` and
  `convex/usage.ts` now map `status: "archived"` → `"dismissed"` before
  constructing `OpportunityFunnelRow` (archived rows carry `outcome:
  "ignored"`, so `funnelOutcomeScore` scores them identically to a
  dismissed row — zero behavior change for existing statuses). Widened
  `LiveOpportunityPoint.status` in `shared/replyPacing.ts` directly (not on
  the forbidden list) and excluded `"archived"` alongside `"dismissed"` in
  the live-opportunity loop, matching its existing treatment.
- Full repo typecheck + `npm test` (311 passed) green after the ripple fix.

## WP31-S3 — Cron

- Appended `archive expired opportunities` to `convex/crons.ts`, 30-minute
  interval, calling `internal.opportunities.archiveExpiredAll`. Placed after
  the existing briefing cron; did not reorder any existing entries.

## WP31-S4 — Feed query + sort

- `opportunities.list` already excluded non-`"new"` rows for free — it
  queries the `by_user_status` index with `status: "new"` equality, so
  `archived` rows never reach the handler. No separate exclusion filter was
  needed.
- Added `effectiveScore` (via `effectiveDisplayScore`) and `freshnessLabel`
  per row after the existing relevance/cooldown/replied filters, sorting by
  `effectiveScore` desc instead of the raw stored `score`.
- Did not add an `includeArchived` debug arg — nothing in this WP needed it.

## WP31-S5 — Feed UI

- `opportunity-row.tsx` / `opportunity-detail.tsx`: show a `freshnessLabel`
  badge (`warning` variant while "Window closing", `neutral` once "Window
  closed") next to the existing source badge; both score badges now read
  `effectiveScore` (falling back to `score` if absent, so any caller that
  doesn't send the new field still renders correctly). Row gets `opacity-60`
  once the window is closed, matching the existing `pending`-state pattern.
- Left the "< 1h old" quick filter (`FRESH_AGE_MS`, `feed-scanner.tsx`)
  unchanged — it's a distinct "very recent" filter, not the same concept as
  the reply-window freshness label, and the story allowed leaving it as-is.
- **Verification gap, reported honestly:** could not get an isolated
  `preview_start`/browser check in this session — a `next dev` instance
  from a concurrent agent session was already holding port 3000 in the same
  working directory, and Next.js/Turbopack refuses a second dev server in
  the same project dir even on a different port ("Another next dev server
  is already running"). The `preview_*` tool itself also returned "Server
  not found" immediately after a successful `preview_start` across three
  attempts — looked like a tooling/workspace issue independent of this
  branch. Verified instead via `npm run build` (full production build,
  including the `/feed` route, compiled clean) plus `npx tsc --noEmit` and
  a manual re-read of the row/detail diffs for prop-threading correctness.
  If a fresh session has an exclusive dev server available, a real
  `/feed` click-through with an expired-window opportunity is worth doing
  before merge.

## WP31-S6 — Notifications guard

- `evaluateOpportunity` now returns `null` immediately when
  `isOpportunityExpired(opportunity.postedAt, now)`, before building the
  enqueue decision. No dedicated test added — matches this repo's existing
  convention of testing the pure `shared/notifications.ts` logic, not the
  Convex mutation wrapper (no test in `tests/notifications.test.ts`
  exercises `evaluateOpportunity` directly either).

## WP31-S7 — Account delete/export

- No code change needed. Both `convex/account.ts` export
  (`exportRowsForTable`) and delete (`nextBatchToDelete`) query
  `opportunities` via the `by_user` index with no status filter, and
  `shared/accountData.ts`'s registry entry for `opportunities` has no
  status-based exclusion either — archived rows were already included in
  both paths before this WP.

## WP31-S8 — Final verification

- `npm run typecheck && npm run lint && npm test && npm run build` all
  green: 0 typecheck errors, lint has only pre-existing warnings on
  generated files (unrelated to this WP), 311 tests passed (1 pre-existing
  skip), production build compiled including `/feed`.
- No auth/token/publish/prompt surface touched by this WP, so skipped
  `/security-review` per the DoD's scoped trigger condition.

## Code review (`/code-review medium`, 8 parallel finder angles)

Ran the full review before opening the PR — it caught two real correctness
bugs and confirmed my own "found, not fixed" note understated the severity
of the `pruneStale` overlap. Fixed both in-boundary bugs; documented the
rest as found-not-fixed below.

**Fixed:**
1. **`pruneStale` almost always beat the new archive cron, so `"archived"`
   was effectively unreachable.** My initial note called this "harmless
   overlap"; three independent review angles (cross-file trace, efficiency,
   line-by-line) confirmed it's worse than that — `pruneStale` runs after
   every scan (~15min, `scannerActions.ts:470`) using the identical 8h
   cutoff as the 30-min archive cron, so it wins the race almost every
   time and flips expired rows to `"dismissed"` before `archiveExpiredAll`
   ever sees them as `"new"`. That made the entire archived/dismissed
   distinction — the actual point of this WP — dead code for
   actively-scanning users. Fixed by making `pruneStale` an alias for
   `archiveExpiredForUser`, so both the per-scan call and the cron funnel
   through the same `archiveExpiredForUserImpl` and always land on
   `"archived"`. Kept the exported name `pruneStale` so `scannerActions.ts`
   (out of my file boundary) needed no changes.
2. **`upsertMany`'s rescan dedupe guard didn't check `"archived"`**
   (`convex/opportunities.ts`, was `existing.status === "analyzed" ||
   existing.status === "dismissed"`), so rescanning a tweet that had
   already been archived would resurrect it to `status: "new"` — undoing
   the auto-archive and re-injecting a stale opportunity into the live
   feed. Added the missing check.
3. **Cleanup:** added `opportunityFreshness()` to
   `shared/feedFreshness.ts` — a combined helper computing age once and
   returning `effectiveScore`/`freshnessLabel`/`windowClosed` together.
   Replaces two independent age computations in the `list` query and
   removes the fragile `freshness === "Window closed"` string-match that
   both feed UI components used to recover a boolean that's now sent
   directly on the wire.

**Found, not fixed (outside WP31's file boundary):**
- `convex/briefings.ts:516` (WP12-owned file) — the overnight-opportunities
  filter is `row.status !== "dismissed"`, which doesn't exclude the new
  `"archived"` status. An auto-archived opportunity (window closed
  unattended) will still show up in the daily briefing as if it were live.
  This directly contradicts what WP31 is for, but `briefings.ts` isn't in
  my ruling's edit list — needs a follow-up WP12/briefings fix.
- `src/components/app/chat/suggestion-chips.tsx` — still renders
  `ScoreBadge value={opp.score}` (raw, undecayed) instead of
  `effectiveScore`. Not in the WP31 feed-UI file boundary
  (`opportunity-row.tsx`/`opportunity-detail.tsx`/`feed-scanner.tsx` only).
  Same opportunity now shows a different score on `/feed` vs. this surface.
- `convex/ranking.ts` and `convex/usage.ts` both independently inline
  `status === "archived" ? "dismissed" : status` with near-identical
  comments. Consolidating this into a shared classifier
  (`shared/opportunityStatus.ts` with something like
  `countsAsDismissed(status)`) would remove the duplication, but doing it
  properly means widening `shared/rankingWeights.ts`'s
  `OpportunityFunnelRow.status` union — that file is explicitly on the
  "do not edit" list in the WP31 ruling. Left as-is; worth a small
  follow-up WP once that boundary is lifted.
- Reviewers also flagged that `effectiveDisplayScore` decays the *entire*
  stored score by the timing factor, even though in `scoreConversation`
  timing is only one weighted component (~0.22–0.3) alongside
  non-decaying factors (relevance, audience, velocity). This is not a bug
  relative to spec — `wp31-stories.md`'s "Defaults (settled)" section
  explicitly rules "multiply stored `score` by the same timing factor" —
  so I did not deviate from an already-settled default. Flagging here in
  case the owner wants to revisit the default itself in a later WP (a
  component-weighted decay would preserve more score for strong,
  non-timing-driven opportunities near the window's end).

All fixes verified: `npm run typecheck && npm run lint && npm test && npm
run build` green after applying them (314 tests passed, up from 311 —
added `opportunityFreshness` coverage).
