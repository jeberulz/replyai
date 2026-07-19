# WP48 stories — Evaluation results, statistics + explicit decisions

Definition of done from `docs/PRODUCT_STRATEGY.md` §14:

> Aggregates reconcile to case outputs/judgments and show numerator, denominator, failures, exclusions, minimum-sample warnings and valid confidence intervals; drill-down and redacted authorized CSV/JSON export work; identities reveal only after review; promote-to-shadow/assisted, retest, or reject records evidence without mutating routing.

## Stories

- [x] WP48-S1 — Shared aggregation/statistics helpers
  - Reconcile output rows and judgment rows into candidate-level summaries.
  - Compute numerator, denominator, failure count, exclusion count, minimum-sample warnings, and confidence intervals only when valid.
  - Cover generation, discovery, ties/neither, failed outputs, excluded outputs, missing judgments, and Wilson/simple interval behavior with focused unit tests.

- [x] WP48-S2 — Operator-only Convex results, export, and decision functions
  - Add public Convex functions that all call `requireEvalOperator` and check experiment ownership.
  - Return bounded redacted result/drill-down payloads and authorized redacted CSV/JSON export strings.
  - Insert decisions into `evalDecisions` only, including evidence hash/sample size, with no production routing mutation.

- [x] WP48-S3 — Results route/actions/components
  - Add `/evals/[experimentId]` as a dynamic operator-only App Router page using server actions.
  - Show Dark Chrome candidate summaries with numerator, denominator, failures, exclusions, sample warnings, valid intervals, and post-review identity reveal.
  - Add redacted case/output/judgment drill-down and explicit decision forms for promote-to-shadow, promote-to-assisted, retest, and reject.
  - Link the existing eval table to the results page without changing the blind review route payload.

- [x] WP48-S4 — Verification, progress notes, and final commit
  - Add `docs/wp/wp48-progress.md` with decisions and verification notes.
  - Run focused tests plus final `npm run typecheck`, `npm run lint`, `npm test -- --run`, `npm run build`, and `git diff --check origin/main...HEAD`.
  - Commit the coherent WP48 slice on `feat/wp48-eval-results-decisions`.
