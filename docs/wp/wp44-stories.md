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

- [ ] Persistent eval lab tables for datasets/cases/experiments/runs/outputs/judgments/decisions.
- [ ] Account export/deletion inventory for persistent eval tables.
- [ ] Public lab Convex queries/mutations and route/server-action wiring.
- [ ] Runner, blind review, results, decisions, scanner/shadow integration, or UI.
