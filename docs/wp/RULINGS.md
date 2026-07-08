# WP Rulings

## 2026-07-08 — WP19

- Question: May WP19 edit files outside `convex/scannerActions.ts` and `convex/crons.ts` to satisfy the §14 DoD items for plan/activity-adaptive cadence and plan-aware search budgets?
- Ruling: Yes. WP19 may edit `convex/scanner.ts` only to expose the minimum internal `scanContext` data needed for the §14 DoD: user plan and scan activity fields such as `lastScanAt` and `lastScanCount`. Keep all other runtime work in `convex/scannerActions.ts` and `convex/crons.ts`. Do not edit schema, UI, billing, or generated files unless WP19 stops and escalates again.
