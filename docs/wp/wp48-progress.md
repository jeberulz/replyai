# WP48 progress — Evaluation results, statistics + explicit decisions

## 2026-07-11 — Setup and scope

- Loaded `AGENTS.md`, `docs/AGENT_PLAYBOOK.md`, `PRD.md`, WP48 row in
  `docs/PRODUCT_STRATEGY.md`, `design.md`, WP45–47 progress notes,
  `docs/wp/RULINGS.md`, Convex generated guidelines, local Next.js App Router
  docs, and Astryx discovery for a results dashboard/table surface.
- Narrowed implementation to the requested WP48 slice only:
  shared aggregation/stat helpers, operator-authorized results/decision/export
  functions, `/evals/[experimentId]` results UI, redacted drill-down, docs, and
  focused tests.
- Existing WP44 schema already includes `evalDecisions`, so no schema migration
  is planned for this slice. Decisions will be append-only records and will not
  mutate production routing.

## 2026-07-11 — S1/S2/S3 implementation

- Added `shared/evalResults.ts` for pure result reconciliation:
  output/judgment aggregation, latest reviewer revision selection, candidate
  numerator/denominator/failures/exclusions, min-sample warnings, Wilson and
  simple 95% intervals, and stable decision evidence hashes.
- Added `convex/evalResults.ts` public operator-only functions:
  `summary`, `exportRedacted`, and `recordDecision`. Every function calls
  `requireEvalOperator`, verifies experiment ownership, returns bounded data,
  and redacts export/drill-down content. `recordDecision` inserts only into
  `evalDecisions`; it does not patch experiments, runs, routing, scanner, or
  production config.
- Added `/evals/[experimentId]` result page/actions/components, a redacted
  CSV/JSON export route, and a `Results` link beside the existing blind
  `Review` link. Candidate provider/model identity is revealed on the results
  route only; `convex/evalReview.queue` was not changed.
- `npx convex codegen` could not run in this isolated worktree because
  `CONVEX_DEPLOYMENT` is unset. Updated checked-in `convex/_generated/api.d.ts`
  for the new module manually so local typecheck/build can validate references.
- Focused verification:
  `npx vitest run tests/evalResults.test.ts tests/evalReview.test.ts tests/evalLabUi.test.ts tests/evalRunner.test.ts`
  passed, 4 files / 23 tests.

## 2026-07-11 — Final verification

- `npm run typecheck` — passed (`tsc --noEmit`).
- `npm run lint` — passed with 4 warnings in pre-existing generated Convex
  files (`convex/_generated/api.js`, `dataModel.d.ts`, `server.d.ts`,
  `server.js`) for unused eslint-disable directives.
- `npm test -- --run` — passed, 69 files passed / 1 skipped, 552 tests passed /
  1 skipped.
- `npm run build` — passed; Next build lists `/evals/[experimentId]`,
  `/evals/[experimentId]/export/[format]`, and
  `/evals/[experimentId]/review` as dynamic routes.
- `git diff --check origin/main...HEAD` — passed with no output.
