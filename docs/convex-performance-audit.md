# Convex Performance Audit

Date: 2026-07-28

Scope: code-level audit plus reversible, local-only fixes

Deployment safety: local Convex only; no cloud deployment was selected, pushed,
paused, imported, mutated, or otherwise modified.

## Executive summary

The supplied dashboard baseline is 1.82 GB/month of project database I/O,
513K function calls, and 98.6% read I/O. The dominant cause was not one large
write path. It was repeated broad reads:

- `trends.radar` rescanned every opportunity while its React query argument
  changed every 30 seconds.
- `scannerSemantic.nicheContext` loaded every large analysis and every voice
  profile to use ten topics and one profile.
- `usage.stats` scanned every opportunity before filtering to the current
  month and was reactively subscribed on a low-freshness chat surface.
- `usage.pacingCoach` read fixed-size history sets before applying time
  windows in JavaScript.
- `analyses.listRecent` read twice the requested number of large analysis
  documents and the setup checklist opened a second list subscription.
- One successful scan invoked separate reconcile, upsert, prune, and
  result-record mutations even though reconciliation only needs to run when
  settings change.

The implemented changes are expected to bring the measured workload to roughly
**350–480 MB/month**, assuming traffic and document sizes are similar to the
baseline and the already-landed WP57 background scanner eligibility guard
continues preventing demo-account cron fan-out. The estimate must be confirmed
with a full post-release billing window.

Recommended project limit: **400 MB/month**, with a warning at 300 MB. That
leaves 20% headroom under the 500 MB objective.

## Baseline evidence

User-supplied dashboard evidence:

| Signal                                         |      Baseline |
| ---------------------------------------------- | ------------: |
| Project database I/O                           | 1.82 GB/month |
| Project function calls                         |    513K/month |
| Reads as share of team database I/O            |         98.6% |
| `trends.radar` production I/O                  |     745.46 MB |
| `scannerSemantic.nicheContext` development I/O |      160.2 MB |
| `usage.pacingCoach` production I/O             |     106.31 MB |
| `usage.stats` production I/O                   |      89.89 MB |
| `opportunities.upsertMany` development I/O     |      89.13 MB |
| `analyses.listRecent` development I/O          |      81.05 MB |

The development scanner stages each produced about 40K calls:

- `opportunities.reconcileIrrelevant`
- `scanner.scanContext`
- `opportunities.upsertMany`
- `scanner.recordScanResult`
- `scannerActions.scanUser`
- `opportunities.pruneStale`

No CLI insights command was run because the supplied dashboard evidence already
identified production hot functions and this task prohibits cloud deployment
access.

## End-to-end traces

### `trends.radar`

- Entrypoint/callsite: a live `useQuery` in
  `src/components/app/feed-scanner.tsx:68-71`.
- Authorization: `requireUser` in `convex/trends.ts:99-100`.
- Reads: session and user through `requireUser`; one `scannerSettings` row;
  recent `opportunities`.
- Writes/schedules: none. The sibling `recordRun` mutation only inserts a
  `trendRuns` cache row and is not on the page-load path.
- Original root cause: `opportunities.by_user.collect()` followed by status,
  time, sort, and slice in JavaScript. The client changed `nowMs` every 30
  seconds, creating a new query subscription/cache key every tick.
- Fix: query the required non-dismissed statuses with
  `by_user_and_status_and_scannedAt`, apply the seven-day range in storage,
  order descending, and cap each range at 200
  (`convex/trends.ts:63-84`). The client now uses a stable five-minute snapshot
  key while retaining its 30-second UI freshness clock
  (`src/components/app/feed-scanner.tsx:58-70`,
  `shared/trends.ts:26-40`).
- Result equivalence: the three prefiltered status ranges are merged, sorted by
  `scannedAt`, and capped exactly like the legacy visible-row pipeline.

### `scannerSemantic.nicheContext`

- Entrypoints: `scannerActions.scanUser`
  (`convex/scannerActions.ts:430-433`), research curator/run paths in
  `convex/researchActions.ts`, and onboarding/voice-drift callers of
  `scanner.scanContext`.
- Reads: one `scannerSettings` row, the default/fallback `voiceProfiles` row,
  and ten recent `tweetAnalyses`.
- Writes/schedules: none.
- Original root cause: all voice profiles and all analysis documents were
  collected. `tweetAnalyses` contains tweet snapshots, ancestors, top replies,
  summaries, opinions, angles, and score data, although this function uses only
  `topic`.
- Fix: read the default profile with
  `voiceProfiles.by_user_and_isDefault`, fall back to one `by_user` row, and
  read exactly ten analyses through `tweetAnalyses.by_user_and_createdAt`
  (`convex/scannerSemantic.ts:13-42`).
- Related N+1: `semanticCacheByTweetIds` still performs one indexed unique
  lookup per eligible tweet (`convex/scannerSemantic.ts:55-90`). It is bounded
  by the scanner's 150-candidate cap. Replacing it with a cache digest would be
  migration-heavy and was not attempted.

### `usage.stats`

- Callsites:
  - point-in-time server query on Settings:
    `src/app/(app)/settings/page.tsx:94-101`;
  - point-in-time client query for the low-freshness chat stat strip:
    `src/components/app/chat/stat-strip.tsx:18-45`.
- Authorization: `requireUser` in `convex/usage.ts:140-141`.
- Reads:
  - one monthly `usage` record;
  - all published `savedDrafts`;
  - one `generatedReplies` document for each published draft with a `replyId`;
  - current-month `opportunities`;
  - current-month `replyOutcomeTrackers`.
- Writes/schedules: none. Sibling `usage.record` updates/inserts the monthly
  `usage` record (`convex/usage.ts:33-78`).
- Original root causes:
  - every opportunity for the user was collected and month-filtered in
    JavaScript;
  - the chat stat strip kept the broad aggregate reactive even though it does
    not require live updates;
  - the query derived the month from the wall clock, reducing cache stability.
- Fixes:
  - the caller supplies the UTC month;
  - opportunities use `by_user_and_scannedAt` with exact month bounds
    (`convex/usage.ts:177-202`);
  - the chat stat strip performs one point-in-time read per mount
    (`src/components/app/chat/stat-strip.tsx:27-41`).
- Remaining broad read: all-time published draft/edit-distance and
  time-to-publish metrics intentionally preserve existing product semantics.
  Efficiently replacing that scan requires a summary record and backfill.

### `usage.pacingCoach`

- Callsites: `useReplyPacing` is consumed by the chat pacing card and publish
  warnings in draft/option flows.
- Authorization: `requireUser` in `convex/usage.ts:243-244`.
- Reads: published and due scheduled `savedDrafts`, recent
  `replyOutcomeTrackers`, and today's `opportunities`.
- Writes/schedules: none.
- Original root cause: the query loaded 200 published drafts, 50 scheduled
  drafts, 100 trackers, and 200 opportunities before the 90-day/day/due-time
  filters were applied.
- Fix:
  - caller-supplied, five-minute snapshot time removes `Date.now()` from the
    query without a periodic query loop
    (`src/components/app/reply-pacing/use-reply-pacing.ts:7-16`);
  - indexed 90-day, due-schedule, and local-day ranges are applied before
    bounded reads (`convex/usage.ts:245-289`);
  - local-midnight calculation is centralized and tested in
    `shared/replyPacing.ts`.

### `analyses.listRecent`

- Callsites:
  - reactive sidebar history, limit 30:
    `src/components/app/sidebar/sidebar-history.tsx:165-174`;
  - one-shot manual niche-context builder, limit 10:
    `src/app/actions.ts:328-350`;
  - the setup checklist previously opened a second list subscription.
- Authorization: `requireUser` in `convex/analyses.ts:217-218`.
- Reads: session/user and bounded `tweetAnalyses`; no joins.
- Writes/schedules: none. Sibling `start`, `setAnalysis`, `complete`, `fail`,
  and `setProject` mutations update these large documents and invalidate live
  readers.
- Original root cause: both branches read `limit * 2`, then filtered `since`
  in JavaScript. Limits were not clamped.
- Fix:
  - `by_user_and_createdAt` and
    `by_user_and_project_and_createdAt` perform ordering and optional lower
    bound in storage;
  - the query reads exactly the requested count, capped at 50
    (`convex/analyses.ts:210-247`);
  - the setup checklist uses an authorized one-row `hasAny` existence query
    instead of a list subscription (`convex/analyses.ts:249-262`,
    `src/components/app/setup-checklist.tsx:20-42`).
- Remaining row-size issue: the sidebar still reads full analysis documents to
  render ID, project, topic/tweet label, score, and time. An analysis digest
  table is a migration and was not introduced.

### Scanner pipeline and hot development functions

- Cron: `crons.ts` schedules `scannerActions.scanAll` every 15 minutes.
  `scanAll` reads indexed background-eligible settings, applies
  `shouldEnqueueScan`, and schedules `scanUser`
  (`convex/scannerActions.ts:319-359`, `convex/scanner.ts:214-259`).
- `scanner.scanContext` reads one user by ID, one `scannerSettings` row, and one
  `xTokens` row, then returns only fields needed by scanner/research callers
  (`convex/scanner.ts:314-357`). No writes.
- `scanFilterContext` reads one settings row plus published target tweet IDs.
  Its sibling helper now uses `savedDrafts.by_user_status` instead of reading
  every draft (`convex/opportunities.ts:95-129`).
- `scannerSemantic.nicheContext` and the bounded per-tweet semantic cache are
  then read before classification.
- `opportunities.upsertMany` performs indexed unique reads by user/tweet,
  inserts new rows or patches active rows, schedules notification evaluation
  only for inserts, archives expired opportunities, and records the successful
  scan result in one mutation (`convex/opportunities.ts:239-350`).
- `scanner.recordScanResult` remains for no-source, fetch-error, and exception
  paths only (`convex/scanner.ts:359-377`).
- `opportunities.reconcileIrrelevant` remains scheduled when scanner settings
  change (`convex/scanner.ts:114-127`), but no longer scans all active
  opportunities on every scan. User-visible lists independently enforce the
  current relevance filter.
- `opportunities.pruneStale` remains as a compatible internal entrypoint, while
  successful scans now archive in `upsertMany`; the separate success call was
  removed.
- The archive-all sibling reader now uses indexed background eligibility plus
  the legacy undefined-field branch instead of collecting every scanner
  setting (`convex/opportunities.ts:175-207`).

For the six named pipeline functions, a normal successful scan now produces
three of those function calls (`scanUser`, `scanContext`, `upsertMany`) instead
of six. `recordScanResult` is retained only for non-success paths;
`reconcileIrrelevant` is settings-change-driven; `pruneStale` is folded into
the successful upsert transaction. Results, notification scheduling, archive
semantics, and last-scan state are preserved.

## Schema/index changes

Added in `convex/schema.ts`:

| Table           | Index                                 | Read paths                            |
| --------------- | ------------------------------------- | ------------------------------------- |
| `voiceProfiles` | `by_user_and_isDefault`               | niche context                         |
| `tweetAnalyses` | `by_user_and_createdAt`               | niche context, recent list, existence |
| `tweetAnalyses` | `by_user_and_project_and_createdAt`   | project recent list                   |
| `savedDrafts`   | `by_user_and_status_and_publishedAt`  | pacing history                        |
| `savedDrafts`   | `by_user_and_status_and_scheduledFor` | due scheduled pacing                  |
| `opportunities` | `by_user_and_scannedAt`               | monthly stats, daily pacing           |
| `opportunities` | `by_user_and_status_and_scannedAt`    | trend radar                           |

All indexed fields used for equality/range correctness already exist on their
relevant documents. There is no optional-field correctness backfill for these
query paths. Local Convex built all seven indexes successfully.

## Expected I/O reduction

These are directional engineering estimates, not measured post-release values:

| Hot path                       |           Baseline |                  Expected after | Assumption                                                                |
| ------------------------------ | -----------------: | ------------------------------: | ------------------------------------------------------------------------- |
| `trends.radar`                 |             745 MB |                        45–90 MB | 10× fewer clock-key refreshes plus indexed 7-day/200-row bounds           |
| `scannerSemantic.nicheContext` |             160 MB |                         8–20 MB | analysis histories are materially larger than 10 rows                     |
| `usage.pacingCoach`            |             106 MB |                        30–55 MB | most historical rows fall outside the 90-day/day ranges                   |
| `usage.stats`                  |              90 MB |                        20–40 MB | chat reactivity was a major repeat caller; published-history scan remains |
| `analyses.listRecent`          |              81 MB |                        20–40 MB | exact limit replaces 2× read and setup uses a one-row probe               |
| Scanner pipeline               | workload-dependent | 20–40% less per successful scan | one full relevance read removed; three success mutations become one       |

The unchanged workload plus these ranges yields an estimated
**350–480 MB/month**. The estimate assumes:

1. traffic and average document sizes remain close to the supplied baseline;
2. WP57 keeps recurring demo-account scan fan-out disabled;
3. radar clients use the five-minute snapshot key;
4. the next deployment builds the new indexes before traffic is evaluated;
5. no new high-frequency subscriber is added to these functions.

Measure after 7 days and again after a full billing month. Alert if the
seven-day projection exceeds 300 MB/month; treat 400 MB as the operating limit.

## Verification

Completed:

- Refreshed stale official Convex AI guidance with
  `npx convex ai-files install`.
- Confirmed `.env.local` selects a local deployment and local loopback URLs.
- `npx convex dev --once ... --local-cloud-port 3220 --local-site-port 3221
--typecheck enable`: passed; local functions and all seven indexes ready.
- Formatting:
  `node node_modules/prettier/bin/prettier.cjs --write <changed files>`:
  passed. The package's `.bin/prettier` is not executable in this checkout, so
  the same installed CLI was invoked through Node.
- `npm run typecheck`: passed.
- `npm run lint`: passed with four pre-existing warnings in checked-in Convex
  generated files and zero errors.
- Focused tests:
  `tests/convexPerformance.test.ts`, `tests/trends.test.ts`,
  `tests/replyPacing.test.ts`, `tests/scannerActions.test.ts`: 40 passed.
- `npm run build`: passed on Next.js 16.2.10.
- `git diff --check`: passed.

Full test result:

- Functional suite excluding the dependency-audit file
  (`npx vitest run --exclude tests/securityAudit.test.ts`): 71 files passed,
  1 skipped; 577 tests passed, 1 skipped.
- `npm test`: 1 file failed, 71 passed, and 1 skipped; 1 test failed, 577
  passed, and 1 skipped.
- The failure is `tests/securityAudit.test.ts`. Its nested
  `npm audit --audit-level=high` now reports existing advisories in
  `brace-expansion`, `dompurify`, `fast-uri`, Next.js/PostCSS, and `sharp`.
  Dependency upgrades were not made because they are outside this Convex
  performance scope and could materially change product behavior.

During the audited implementation and verification phase, no production/cloud
Convex data command, deploy, import, pause, mutation, or configuration command
was executed. The only Convex runtime push in that phase was explicitly to the
loopback local deployment. Any later release requested by the repository owner
is operationally separate from this local-only audit.

## Focused coverage

- Result equivalence and ordering: indexed trend corpus selection is compared
  with the legacy filter/sort/slice result.
- Empty states and bounds: empty/zero trend corpora and recent-query source
  bounds are covered.
- Authorization: source-level assertions cover both new analysis readers;
  the repository security audit still verifies the public Convex surface before
  its separate dependency-audit failure.
- Pagination/bounding: `listRecent` is not cursor-paginated; its public limit is
  clamped to 50 and the storage query takes the exact count. Existing callsites
  request 1/10/30 or use the new existence probe.
- Scheduling idempotency: focused source coverage confirms the cadence guard is
  evaluated before `runAfter`; existing scanner tests cover first run, cadence
  windows, and operator cadence floors.
- Scan finalization: focused coverage confirms successful upsert, archive, and
  result-state updates share one mutation and that the separate success calls
  are absent.

## Remaining migration-heavy opportunities

These were deliberately not implemented.

### 1. Usage/stat summary record

Signal: `usage.stats` still collects every published draft and performs an
N+1 generated-reply lookup for all-time edit-distance and time-to-publish
metrics.

Migration-safe plan:

1. Add an optional per-user/month stats summary and staged indexes.
2. Dual-write summary deltas in every publish/edit-bucket/outcome mutation.
3. Run a bounded, idempotent local dry-run that reports draft/reply counts and
   computed parity without writes.
4. Backfill local in cursor batches; compare the summary with the legacy query.
5. Cut reads over only after parity covers empty, legacy, and mixed rows.
6. Keep the legacy fallback for one release; remove it only after observed
   production parity and separate approval.

### 2. Analysis digest table

Signal: list and niche readers still pay the byte cost of full analysis
documents containing thread/tweet/reply payloads.

Migration-safe plan:

1. Add `analysisDigests` with only user/project/topic/tweet label/score/status/
   created time and staged indexes.
2. Dual-write it from every analysis stage and project move.
3. Backfill locally in cursor batches with per-user count/order parity.
4. Switch sidebar and niche readers with live-document fallback for missing
   digest rows.
5. Verify reactive invalidation behavior, then cut over after a monitored
   release.

### 3. Semantic opportunity-cache digest

Signal: `semanticCacheByTweetIds` performs up to 150 indexed unique reads of
full opportunity documents for three small cache fields.

Migration-safe plan:

1. Add a narrow cache table keyed by user/tweet.
2. Dual-write on opportunity insert/update.
3. Backfill locally and compare hit/miss/fingerprint/TTL behavior.
4. Batch-read the cache with a bounded strategy and retain full-opportunity
   fallback until parity is proven.

### 4. High-churn scanner state split

Signal: successful and failed scans update `lastScanAt`, count, and error on the
widely subscribed `scannerSettings` document, invalidating settings readers.

Migration-safe plan:

1. Add a separate one-row `scannerRunState` document per user.
2. Dual-write run state while reading legacy fields as fallback.
3. Backfill locally and verify scan progress/settings behavior.
4. Switch progress readers, then stop updating high-churn fields on the stable
   settings document in a later approved change.

## Highest-value follow-ups

1. Deploy the indexed code through a staged-index-aware production rollout and
   compare seven-day per-function bytes with this baseline.
2. Build the `usage.stats` summary record first if monthly I/O remains above
   400 MB; it is the largest remaining broad aggregate on a production path.
3. Add analysis digests if `analyses.listRecent` or niche context remains above
   25 MB/month after the new indexes have a full measurement window.
