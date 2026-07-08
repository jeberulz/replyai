# WP19 Progress

## 2026-07-08

- Read `AGENTS.md`, `PRD.md`, `docs/AGENT_PLAYBOOK.md`, the WP19-related sections of `docs/PRODUCT_STRATEGY.md`, and `convex/_generated/ai/guidelines.md` as required.
- Verified the assigned worktree is `/Users/jeberulz/Documents/AI-projects/replyai-wp19` and the branch is clean before any edits.
- Confirmed there is no existing `docs/wp/RULINGS.md`.
- Found the current scanner boundary issue before code changes:
  - `convex/scannerActions.ts` can only see scan context exposed by `internal.scanner.scanContext`.
  - That query does not expose `users.plan`, `scannerSettings.lastScanAt`, or `scannerSettings.lastScanCount`.
  - WP19 DoD items "plan/activity-adaptive cadence" and "plan-aware search budgets" need those values or an equivalent in-bounds source.
- Per the playbook's scope-discipline rules, stopped at the boundary instead of guessing or editing files outside the assigned scope.
- Scope ruling received and recorded in `docs/wp/RULINGS.md`: WP19 may edit `convex/scanner.ts` only to expose minimal internal plan and scan-activity context required by the scanner runtime.
- WP19-S1 complete:
  - `scanAll` now enqueues per-user `scanUser` jobs through `ctx.scheduler.runAfter(...)` instead of running each scan inline in one action.
  - Added a small deterministic stagger (`250ms`) between enqueued jobs to avoid firing every scheduled scan at the exact same instant.
  - Story checks passed: `npm run typecheck`, `npm test`.
