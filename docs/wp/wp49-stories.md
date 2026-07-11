# WP49 stories — Shadow Grok discovery integration

Definition of done: deterministic capped sampling records cited/hydrated
provenance, usage/cost/failures, and eval-run linkage under existing AI/X
spend controls and a provider circuit breaker; default is `off` or `shadow`;
shadow output never changes feed ordering, surfaced content, or notifications;
fallback/availability are observable.

- [ ] **WP49-S1 — Shadow configuration, sampling, and non-interference**
  - Acceptance: Grok discovery is disabled by default unless an operator/env or
    additive setting enables `shadow`.
  - Acceptance: sampling is deterministic from a stable scan key and capped to
    a small request/result budget.
  - Acceptance: the scanner still writes opportunities only from the existing
    feed pipeline; shadow candidates are never merged into ranking, surfaced
    content, or notification paths.

- [ ] **WP49-S2 — Provenance persistence and eval linkage**
  - Acceptance: every sampled/blocked shadow attempt records a run row with
    mode, sample key, provider/model, citations, hydration failures, candidate
    provenance, usage, cost, and availability/failure reason.
  - Acceptance: runs can link to the latest explicit `promote_to_shadow`
    eval decision/run when one exists, without mutating routing decisions.
  - Acceptance: account export/deletion inventory includes user-owned shadow
    provenance rows.

- [ ] **WP49-S3 — Spend controls, circuit breaker, and observability**
  - Acceptance: paid Grok sampling is preflighted through the existing AI-spend
    ledger/kill-switch/fail-closed path, extended narrowly for discovery.
  - Acceptance: provider failures update an `xai/discovery` circuit breaker;
    open-circuit scans record observable blocked availability without a paid
    provider call.
  - Acceptance: typed analytics/Sentry capture shadow availability/failure
    without throwing or changing scanner success.

- [ ] **WP49-S4 — Verification and handoff**
  - Acceptance: focused tests cover default off/shadow non-interference, spend
    cap blocking, provenance persistence shape, and circuit/fallback
    observability.
  - Acceptance: `npm run typecheck`, `npm run lint`, `npm test -- --run`,
    `npm run build`, and `git diff --check origin/main...HEAD` are run and
    recorded in `docs/wp/wp49-progress.md`.
