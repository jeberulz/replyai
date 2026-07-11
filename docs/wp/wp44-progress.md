# WP44 progress — eval domain, operator authorization, account compatibility

## 2026-07-11 — S1 foundation

Implemented the smallest safe foundation slice after restart:

- Read the WP playbook, PRD, WP41 program brief, WP44 row, Model Evaluation Lab PRD, Grok discovery PRD, RULINGS ledger, design system, Convex migration helper, and Convex generated AI guidelines.
- Inspected existing `convex/evals.ts`, `convex/schema.ts`, `convex/helpers.ts`, `shared/accountData.ts`, `convex/account.ts`, and `tests/accountData.test.ts`.
- Preserved historical `modelEvals` unchanged.
- Added `shared/evalAuth.ts` with default-deny operator access semantics.
- Added `requireEvalOperator()` in `convex/helpers.ts`; it first requires a valid session, then denies unless the user has `evalOperator === true` and is not a demo user.
- Added optional `users.evalOperator` to the schema. This is widen-only and needs no migration/backfill because unset means denied.
- Added `shared/evalLab.ts` catalog helpers so future lab mutations can accept catalog IDs and freeze server-side provider/model snapshots.
- Added focused unit tests for authorization and catalog validation.

Migration/account notes:

- No new tables were added in this first story, so `shared/accountData.ts` and `convex/account.ts` do not need new table inventory entries yet.
- When persistent eval tables land, they must be added to both the shared account inventory and Convex account count/list/delete switch statements in the same PR.
- Existing `modelEvals` remain readable because this story does not alter their schema, indexes, save mutation, or latest query.

Deferred work:

- Full additive lab persistence tables are still pending: datasets, cases, experiments, runs, outputs, judgments, and decisions.
- Public lab functions should call `requireEvalOperator()` and accept catalog IDs, not raw model IDs.
