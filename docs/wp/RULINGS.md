# WP Rulings

Append-only ledger for scope and product rulings that unblock work packages.

## 2026-07-08 - WP16 - Scope boundary

Question: WP16's original file boundary listed only `src/lib/ai.ts`, `convex/analyses.ts`, and `convex/publish.ts`, but the §14 definition of done requires thread-ancestor persistence and a scheduled stale-pipeline sweep, which need files outside that boundary.

Ruling: WP16 may also edit these files, only as needed to satisfy the DoD:

- `src/lib/x.ts` for fetching and deterministic thread ancestor context into `TweetBundle`.
- `convex/schema.ts` for additive persistence of ancestor snapshots on `tweetAnalyses`.
- `src/app/actions.ts` for writing ancestors during analysis and restoring them when rebuilding bundles from saved analyses.
- `convex/crons.ts` to schedule the stale-pipeline sweep.
- `shared/demoData.ts` if needed for deterministic demo-mode ancestor fixtures.
- Focused tests/eval fixtures if needed to verify the WP16 guardrails.

## 2026-07-08 - WP19

- Question: May WP19 edit files outside `convex/scannerActions.ts` and `convex/crons.ts` to satisfy the §14 DoD items for plan/activity-adaptive cadence and plan-aware search budgets?
- Ruling: Yes. WP19 may edit `convex/scanner.ts` only to expose the minimum internal `scanContext` data needed for the §14 DoD: user plan and scan activity fields such as `lastScanAt` and `lastScanCount`. Keep all other runtime work in `convex/scannerActions.ts` and `convex/crons.ts`. Do not edit schema, UI, billing, or generated files unless WP19 stops and escalates again.

## 2026-07-09 - WP10 - App deep-link for pre-analyze

- Question: WP10's §14 key-files column lists only `extension/`, but the DoD
  requires a deep link that opens the workbench pre-analyzed. Today
  `/dashboard?url=` only prefills the composer.
- Ruling: WP10 may make the minimum app-side change to honor `auto=1` with a
  valid tweet `url` on `/dashboard` and `/analyze` (pass-through redirect),
  starting the existing analyze pipeline once. No new Convex APIs, no
  publish paths, no cookie/token access from the extension. All other work
  stays in `extension/` (+ shared scoring helpers/tests as needed).
