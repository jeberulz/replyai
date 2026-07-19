# WP46 stories — Evaluation Lab shell + setup UI

Status source for WP46. Each story maps to the §14 DoD and stays limited to the
operator-only lab shell, setup flow, server actions, and navigation.

## S46-1 — Operator route/action boundary and lab data reads

- [x] Add server-side route gating for `/evals` and `/evals/new` using the
      existing eval-operator authorization, not hidden navigation.
- [x] Add focused server-action helpers for catalog, dataset, experiment,
      runner status, start, and cancel calls; every action resolves the session
      from cookies and delegates to operator-authorized Convex functions.
- [x] Acceptance: non-operators receive a not-found response at routes/actions;
      invalid create/start input fails before Convex mutation side effects.

## S46-2 — Dense experiment table with filters and run controls

- [x] Build `/evals` with a compact Dark Chrome table/list surface, kind/status
      filters, search, candidate/dataset metadata, run progress, failure/
      cancellation states, and explicit cancel/start controls.
- [x] Acceptance: desktop renders as dense rows/tables, mobile remains readable
      without card walls, controls have accessible labels, and status uses
      status dots/tokens rather than fake precision scores.

## S46-3 — Versioned setup flow and explicit start

- [x] Build `/evals/new` with versioned dataset selection, catalog candidate
      selection, budget/concurrency/case-count controls, cost preview, and an
      explicit create/start option.
- [x] Acceptance: setup validates kind/dataset/candidates/caps, previews a
      conservative estimated maximum spend, and never accepts raw provider
      model IDs from the browser.

## S46-4 — Verification docs and focused tests

- [x] Add tests for WP46 validation/authorization helpers and responsive/
      accessibility-relevant markup contracts where current patterns allow.
- [x] Append implementation decisions and command results to
      `docs/wp/wp46-progress.md`.
- [x] Acceptance: focused tests plus full target verification commands are run
      and results are recorded in handoff.
