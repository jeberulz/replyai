# WP42 Stories — Provider-neutral AI foundation

## Status

- [x] WP42-S1 — Provider catalog and contracts
  - Acceptance: shared model catalog represents provider/model IDs, capabilities, reasoning effort, pricing, and preserves the existing Claude generation catalog for UI/eval callers.
  - Acceptance: provider-neutral generation/discovery result, usage, cost, latency, tool, and error contracts exist in shared code with focused unit coverage.
- [x] WP42-S2 — Server-only xAI configuration and entitlement
  - Acceptance: `src/lib/env.ts` exposes server-only xAI API key/base URL/model/reasoning config with `grok-4.3` and low reasoning defaults.
  - Acceptance: xAI `/v1/models` entitlement check is fetch-injected, redacts secrets/errors, fails closed, and has zero-key plus failed-entitlement tests.
- [x] WP42-S3 — Existing Claude generation compatibility
  - Acceptance: existing analyze/generate/rewrite/compose/model-eval behavior remains Claude-first and deterministic in demo mode.
  - Acceptance: provider usage helpers can normalize Anthropic responses without changing the legacy `{ tokensIn, tokensOut }` API consumed by current callers.
- [x] WP42-S4 — Verification and handoff docs
  - Acceptance: full local gate is attempted; failures/blockers are recorded exactly.
  - Acceptance: `docs/wp/wp42-progress.md` records decisions, docs consulted, and residual risks for WP43+.
