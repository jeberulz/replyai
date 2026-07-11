# WP46 progress — Evaluation Lab shell + setup UI

## 2026-07-11 — Start

- Assignment: WP46 Evaluation Lab shell + experiment setup UI in the isolated
  `replyai-wp46` worktree on branch `feat/wp46-eval-lab-shell`.
- Read before editing: `AGENTS.md`, `docs/AGENT_PLAYBOOK.md`, `PRD.md`,
  `docs/PRODUCT_STRATEGY.md` WP46 row, `design.md`,
  `docs/wp/WP41-GROK-EVAL-PROGRAM.md`, `docs/wp/wp45-progress.md`,
  `docs/wp/wp45-stories.md`, `docs/wp/RULINGS.md`, and
  `convex/_generated/ai/guidelines.md`.
- Loaded local Next 16 docs after restoring dependencies with `npm install`:
  App Router layouts/pages, Server Actions/forms, `use server`, data fetching,
  and accessibility guidance. The initial worktree had no `node_modules`, so
  the first local docs lookup failed before install.
- Ran Astryx discovery before UI work:
  `npm run astryx -- build "Evaluation Lab shell with dense experiment table filters and experiment setup form"`,
  `npm run astryx -- search "table data rows filters"`, and
  `npm run astryx -- component Table`. The recommended pattern is a compact
  table/filter toolbar plus form-layout controls; implementation maps that to
  existing `src/components/ds/` adapters and Dark Chrome tokens.
- Scope boundary: no blind review/results UI, no scanner/shadow/assisted
  integration, no production routing changes, no customer provider picker, no
  X publish/schedule automation.

## 2026-07-11 — Implementation

- Added `convex/evalLab.listDatasets` as a bounded operator-authorized query so
  the setup screen can choose existing versioned datasets without scanning.
- Added `shared/evalLabUi.ts` for pure WP46 UI contracts: setup validation,
  catalog/dataset/kind checks, raw-provider-ID rejection, conservative cost
  preview, progress reconciliation, and table filtering.
- Added route-local server actions under `src/app/(app)/evals/actions.ts`.
  Every action resolves the session from the httpOnly cookie and delegates to
  WP44/WP45 operator-authorized Convex functions. Route loaders call the same
  public eval functions and return `notFound()` on authorization failure.
- Added `/evals` with a dense Dark Chrome experiment table, kind/status/search
  filters, dataset/candidate metadata, progress bars, failure/error copy, and
  explicit start/cancel forms. Mobile uses compact row summaries rather than a
  broad card wall, with ≥44px primary action targets.
- Added `/evals/new` with experiment identity, versioned dataset selection,
  catalog candidate checkboxes, budget/concurrency/case controls, conservative
  cost preview, and an explicit "Create and start now" checkbox.
- Added the app nav link for `Evals`. The route remains operator-only; nav
  visibility is not treated as authorization.
- Added `tests/evalLabUi.test.ts` covering validation/caps/catalog behavior,
  progress/filter helpers, and source-level accessibility/responsive contracts
  used by the current Vitest test style.

## 2026-07-11 — Verification

- Focused: `npx vitest run tests/evalLabUi.test.ts tests/evalLab.test.ts tests/evalRunner.test.ts` — passed, 3 files / 13 tests.
- Typecheck: `npm run typecheck` — passed.
- Lint: `npm run lint` — passed with the existing generated-file unused
  `eslint-disable` warnings only.
- Full tests: `npm test -- --run` — passed, 66 files passed, 1 skipped, 537
  tests passed, 1 skipped.
- Build: `npm run build` — passed; `/evals` and `/evals/new` are dynamic routes
  in the build output.

## 2026-07-11 — Review fix: nav visibility

- Review found `/evals` was present in the static signed-in nav for every user.
  Kept all route/action `requireEvalOperator` boundaries intact and added UI
  visibility gating instead.
- `convex/users.me` now returns a safe boolean `evalOperator` field, which is
  carried through `src/lib/session.ts` into the app shell.
- Sidebar and command-palette page navigation both use `visibleNavLinks()` so
  regular signed-in users do not see `/evals`; eval operators do.
- Added `tests/evalNavVisibility.test.ts`.
- Focused verification: `npx vitest run tests/evalNavVisibility.test.ts tests/evalLabUi.test.ts tests/evalAuth.test.ts` — passed, 3 files / 8 tests.
- Typecheck: `npm run typecheck` — passed.
- Lint: `npm run lint` — passed with existing generated-file unused
  `eslint-disable` warnings only.
- `package-lock.json` has no diff.
