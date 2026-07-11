# WP49 progress — Shadow Grok discovery integration

## 2026-07-11 — Setup and scope

- Loaded `AGENTS.md`, `docs/AGENT_PLAYBOOK.md`, `PRD.md`, the WP49 row in
  `docs/PRODUCT_STRATEGY.md`, dependency progress notes for WP43/WP45/WP48,
  `docs/wp/RULINGS.md`, the local Convex skill, and
  `convex/_generated/ai/guidelines.md`.
- Confirmed this work stays inside the requested `replyai-wp49` worktree on
  `feat/wp49-shadow-grok-discovery`.
- Scope lock: shadow-only scanner sampling, additive provenance/storage,
  spend/circuit observability, and tests/docs. Explicit non-goals remain WP50
  assisted discovery, production routing, customer provider picker, UI ranking
  changes, notifications changes, and any X publish/schedule automation.
- Existing `node_modules` is absent in this isolated worktree; full verification
  will require installing dependencies or using an available dependency cache.

## 2026-07-11 — S1/S2/S3 implementation

- Added `shared/shadowGrokDiscovery.ts` for the pure shadow contract:
  default-off mode parsing, deterministic sample keys, capped request/result
  settings, stable non-interference signatures, and bounded discovery requests
  derived from scanner keywords/search terms/watched handles.
- Added additive Convex schema:
  - `scannerSettings.grokDiscoveryMode`, `grokDiscoverySampleRatePercent`,
    optional `grokDiscoveryEvalRunId`, and last shadow status/error fields.
  - `shadowGrokDiscoveryRuns` for mode/sample key, request JSON, cited
    candidates, authoritative hydration failures, usage/cost, provider/model,
    raw provider response id, availability, and eval-run/experiment linkage.
  - `providerCircuitBreakers` for `xai/discovery` failure count/open-cooldown
    state.
  - `aiSpendLedger.kind = "discovery"` and `xReadLedger.source =
    "scanner_grok_shadow"` so the path stays under existing budget ledgers.
- Added `convex/shadowDiscovery.ts` internal functions for latest
  `promote_to_shadow` eval-run linkage, circuit state/result updates, and
  shadow run persistence. A small authenticated `latestStatus` query exposes
  the latest row/circuit state for availability debugging without UI routing.
- Wired `convex/scannerActions.ts` after the existing opportunity upsert,
  stale-prune, and `recordScanResult` calls. Shadow execution is wrapped in its
  own try/catch; it can record skipped/blocked/success/failure availability and
  Sentry/analytics telemetry, but it never feeds `worthSurfacing`, ranking,
  opportunity writes, or notification paths.
- Extended `convex/spend.ts` with an internal user-scoped spend preflight for
  actions and the new `discovery` kind. Missing caps and kill switch behavior
  remain inherited from `shared/spendLimits.ts`.
- Added typed analytics event `shadow_grok_discovery_sampled`; the Convex
  adapter continues to no-op without PostHog keys.
- Added account export/deletion inventory support for
  `shadowGrokDiscoveryRuns`.
- Updated checked-in `convex/_generated/api.d.ts` manually for the new module;
  as with prior isolated WPs, `npx convex codegen` was not used because the
  worktree does not have a configured Convex deployment env.

## 2026-07-11 — Verification

- `npm ci` — passed; installed 670 packages from the lockfile. npm reported 3
  moderate existing dependency advisories.
- Focused:
  `npm test -- --run tests/shadowGrokDiscovery.test.ts tests/spendLimits.test.ts tests/xReadLimits.test.ts tests/scannerActions.test.ts tests/accountData.test.ts`
  — passed, 5 files / 39 tests.
- `npm run typecheck` — passed.
- `npm run lint` — passed with the existing 4 generated Convex unused
  `eslint-disable` warnings only.
- `npm test -- --run` — passed, 70 files passed / 1 skipped, 558 tests passed /
  1 skipped.
- `npm run build` — passed with Next.js 16.2.10 / Turbopack.
- `git diff --check origin/main...HEAD` — passed with no output.

## 2026-07-11 — Residual notes

- Runtime enabling remains operator/internal only:
  `GROK_DISCOVERY_SHADOW_MODE=shadow` plus
  `GROK_DISCOVERY_SAMPLE_RATE_PERCENT`, or additive scanner setting fields.
  Unset values keep the path off.
- The circuit breaker defaults to 3 consecutive failures and a 30-minute
  cooldown, overridable with `GROK_DISCOVERY_CIRCUIT_FAILURE_THRESHOLD` and
  `GROK_DISCOVERY_CIRCUIT_COOLDOWN_MS`.
  `AI_DISCOVERY_HOURLY_LIMIT` is the specific discovery cap; the existing
  `AI_SPEND_LIMITS_REQUIRED` fail-closed rule still applies.
