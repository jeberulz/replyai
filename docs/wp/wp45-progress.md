# WP45 progress — bounded, resumable experiment runner

## 2026-07-11 — Start

- Assignment: WP45 bounded, resumable experiment runner foundation in the
  isolated `replyai-wp45` worktree on branch
  `feat/wp45-bounded-eval-runner`.
- Read before editing: `AGENTS.md`, `docs/AGENT_PLAYBOOK.md`, `PRD.md`,
  `docs/PRODUCT_STRATEGY.md` WP45 row,
  `docs/wp/WP41-GROK-EVAL-PROGRAM.md`, `docs/wp/RULINGS.md`, and
  `convex/_generated/ai/guidelines.md`.
- The assignment also named `tasks/prd-model-evaluation-lab.md` and
  `tasks/prd-grok-assisted-x-discovery.md`, but no `tasks/` directory or
  matching files exist in this worktree. Continued from the available
  authoritative project docs and will report this in handoff.
- Scope boundary: no UI, no scanner/shadow/assisted integration, no production
  routing changes, no X publish/schedule automation, and no browser-supplied
  raw provider/model IDs.

## 2026-07-11 — Implementation

- Added `shared/evalRunner.ts` as the deterministic, zero-key runner contract:
  caps validation, stable blind-key hashing, normalized usage/cost snapshots,
  generation guardrail checks, discovery citation/hydration validation, and
  fixture-triggered per-candidate failure/exclusion.
- Added `convex/evalRunner.ts` public operator contracts:
  `start`, `resume`, `status`, and `cancel`. All public functions authorize
  with `requireEvalOperator`; browser callers pass experiment IDs and catalog
  selections frozen by WP44, not arbitrary provider/model IDs.
- Added `convex/evalRunnerJobs.ts` internal scheduler jobs. `startOrResume`
  creates exactly one latest run for an experiment, freezes case/candidate
  snapshots onto output rows, and schedules `pump`. `pump` processes at most
  the run concurrency, respects budget/tool/retry caps, preserves completed
  outputs across repeated starts/resumes, and reconciles run counts.
- Added `convex/evalRunnerActions.ts` internal action wrappers for future
  worker orchestration without exposing an unauthenticated public action.
- Schema changes are additive: runner metadata on `evalRuns`, queued/running
  output states plus frozen input/candidate/stage snapshots on `evalOutputs`,
  successful tool-call usage, and an index on
  `["runId", "caseId", "candidateCatalogId"]` for idempotency checks.
- `npx convex codegen --typecheck=disable` was attempted but cannot run in this
  worktree because `CONVEX_DEPLOYMENT` is unset. Updated
  `convex/_generated/api.d.ts` manually for the new modules; `dataModel.d.ts`
  imports the live schema and did not need manual regeneration.

## 2026-07-11 — Verification

- Focused: `npx vitest run tests/evalRunner.test.ts tests/evalLab.test.ts tests/providers.test.ts tests/xDiscovery.test.ts` — passed, 22 tests.
- Full tests: `npm test` — passed, 65 files passed, 1 skipped, 533 tests passed.
- Typecheck: `npm run typecheck` — passed.
- Lint: `npm run lint` — passed with existing generated-file unused
  `eslint-disable` warnings only.
- Build: `npm run build` — passed.
- Whitespace: `git diff --check` — passed.
