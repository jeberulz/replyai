# WP44 stories — eval domain, operator authorization, account compatibility

Branch: `feat/wp44-eval-domain-auth`

## S1 — fail-closed operator and catalog foundation

- [x] Add a pure operator-access predicate that defaults to no access and excludes demo accounts.
- [x] Add a Convex helper that composes existing session auth with the operator predicate.
- [x] Add an optional, additive `users.evalOperator` flag; no backfill or required-field migration.
- [x] Add a shared eval candidate catalog helper so future lab calls accept catalog IDs instead of raw provider model IDs.
- [x] Add focused tests for default-deny authorization and catalog validation.
- [x] Confirm existing `modelEvals` schema/query/mutation remains unchanged.

## Deferred from this first story

- [x] Persistent eval lab tables for datasets/cases/experiments/runs/outputs/judgments/decisions.
- [x] Account export/deletion inventory for persistent eval tables.
- [x] Operator-only Convex domain functions for catalog, dataset creation, experiment creation, and experiment listing.
- [ ] Runner, blind review, results, decisions, scanner/shadow integration, or UI.

## S2 — additive persistence and account compatibility

- [x] Add additive new tables only; no existing table is narrowed or backfilled.
- [x] Give every new eval lab row a `userId` owner and `by_user` index for account inventory/deletion.
- [x] Add domain indexes for dataset cases, experiment runs, candidate outputs, review queues, and decisions.
- [x] Update `shared/accountData.ts` and `convex/account.ts` to export/delete eval lab rows before parent records.
- [x] Update account inventory tests for the new table list, ownership isolation, export filtering, and counts.
- [x] Preserve existing `modelEvals` schema/functions unchanged.
