# WP45 stories — bounded, resumable experiment runner

Status source for WP45. Each story is intentionally small enough to verify
with focused tests and the full suite before review.

## S45-1 — Runner contracts, caps, and deterministic provider output

- [x] Add shared runner helpers for validating experiment caps, freezing
      provider/model/price/input/seed snapshots, estimating bounded spend, and
      producing deterministic zero-key generation/discovery/pipeline outputs.
- [x] Acceptance: generation, discovery, and pipeline candidates produce stable
      normalized output, usage, cost, guardrail/citation/hydration artifacts
      with no external keys or network.
- [x] Acceptance: invalid budget, concurrency, retry, tool-call, or case caps
      fail closed before work is enqueued.

## S45-2 — Convex runner state machine and idempotent jobs

- [x] Add operator-authorized Convex start/status/cancel/resume contracts and
      internal job functions that use WP44 eval experiments/runs/outputs.
- [x] Acceptance: repeated start/resume reuses a non-terminal/latest run and
      never duplicates already completed outputs.
- [x] Acceptance: per-candidate failures preserve successful peer outputs,
      counts reconcile, and cancelled runs stop scheduling new work.

## S45-3 — Tests and package documentation

- [x] Add focused unit tests for shared runner helpers and Convex-style
      planning/idempotency behavior.
- [x] Append progress notes that document architecture decisions, exclusions,
      and any missing upstream task docs.
- [x] Acceptance: focused tests, typecheck, lint, test, build, and
      `git diff --check` are run and results recorded in the handoff.
