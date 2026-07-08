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
- WP19-S2 complete:
  - Candidate merge now dedupes on both `tweetId` and `fingerprintText(text)`, so reposted or re-discovered duplicate text cannot occupy multiple feed slots.
  - Source priority is preserved because the merge still processes candidates in watched -> list -> search -> following order.
  - Added focused regression coverage in `tests/scannerActions.test.ts`.
  - Story checks passed: `npm run typecheck`, `npm test -- tests/scannerActions.test.ts`.
- WP19-S3 complete:
  - `convex/scanner.ts` now exposes the minimum internal dispatch context needed by WP19: `plan`, `lastScanAt`, and `lastScanCount`.
  - `scanAll` now runs as a 15-minute dispatcher and only enqueues users whose cadence window has elapsed.
  - Cadence is tier- and activity-aware:
    - priority/founder plans stay in the 15-minute lane when scans are yielding opportunities, otherwise 30 minutes
    - pro plans run every 15 minutes when yield is high, 30 minutes when productive, 60 minutes when cold
    - free/default plans back off to 30 / 60 / 120 minute lanes based on recent yield
  - Added focused cadence coverage in `tests/scannerActions.test.ts`.
  - Story checks passed: `npm run typecheck`, `npm test -- tests/scannerActions.test.ts`.
