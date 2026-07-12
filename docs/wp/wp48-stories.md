# WP48 stories — Evaluation results, statistics + explicit decisions

Definition of done from `docs/PRODUCT_STRATEGY.md` §14:

> Aggregates reconcile to case outputs/judgments and show numerator, denominator, failures, exclusions, minimum-sample warnings and valid confidence intervals; drill-down and redacted authorized CSV/JSON export work; identities reveal only after review; promote-to-shadow/assisted, retest, or reject records evidence without mutating routing.

## Stories

- [ ] WP48-S1 — Shared statistics contract
  - Add pure helpers for output/judgment aggregation by candidate.
  - Aggregates include numerator, denominator, failures, exclusions, minimum-sample warnings, and confidence intervals only when valid.
  - Unit tests cover generation win-rate, discovery relevance-rate, failed/excluded outputs, and low-sample warnings.

- [ ] WP48-S2 — Operator-only Convex results API
  - Add public Convex query/mutation functions guarded by `requireEvalOperator`.
  - Results query reconciles experiment, latest run, cases, outputs, judgments, and prior decisions.
  - Export query returns redacted CSV/JSON data without raw case snapshots or full model outputs.
  - Decision mutation appends an `evalDecisions` row with evidence hash and sample size only; it does not mutate routing or production configuration.

- [ ] WP48-S3 — Results route and UI
  - Add `/evals/[experimentId]` as an operator-only Server Component route.
  - Results page reveals provider/model identities from frozen snapshots only on this route.
  - UI shows transparent aggregate evidence, warnings, export links/actions, decision forms, and case drill-down.
  - Review route remains blind and unchanged.

- [ ] WP48-S4 — Verification and source contracts
  - Add focused tests for stats, route/source safety, exports, and decision behavior.
  - Update lab links so experiments with runs can navigate to Results separately from Review.
  - Run full verification target and record exact results in progress notes.
