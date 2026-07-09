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

## 2026-07-09 - WP24–WP28 - Astryx adoption program

Question: Approve the Astryx adoption plan (`docs/wp/WP24-ASTRYX-ADOPTION-PLAN.md`) and the §9 owner decisions?

Ruling:

1. **WP24–WP28 are official §14 packages.** Execute per the plan. WP28 is deferred until after WP24–WP27 gate (Phase 1 / with command palette), not in the first foundation wave.
2. **Adapter path:** `src/components/ds/` strangler. Leave `src/components/ui/` shadcn intact until call sites move (WP25+).
3. **Shell strategy:** token-restyle / compose existing sidebar first in WP26; adopt Astryx `AppShell` only if the smaller-diff restyle fails brand/density DoD — escalate before ripping the sidebar.
4. **Gate 0 required:** CI lockfile PR merged; dirty research tree cleaned against `main` before WP24 starts.
5. **Brand lock:** Dark Chrome owns visuals. Stock Neutral/Butter/Gothic aesthetics must not ship. Landing (`src/app/page.tsx`) is out of scope for the entire program.
6. **Theme provider scope:** `<Theme>` only on `(app)` and `(onboarding)` layouts — never root layout.
7. **Mobile primary actions:** even if Astryx density uses 28–36px controls, primary mobile send/copy/dismiss targets must meet ≥44px (PRODUCT_STRATEGY §9) via theme/override.
