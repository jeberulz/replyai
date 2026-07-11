# WP43 Progress - Grok X Search + authoritative X hydration

## 2026-07-11 - Start

- Dependency base: merged WP42 on `origin/main` at `42fc50a`.
- Scope: server-only Grok/X Search foundation, shared validation helpers, authoritative X hydration boundary, tests, and WP43 working docs only.
- Explicit exclusions: no eval runner/domain/UI, no scanner shadow integration, no opportunity writes, no production routing changes, and no publish/schedule path.
- Task PRDs were present in the primary checkout at `tasks/prd-grok-assisted-x-discovery.md` and `tasks/prd-model-evaluation-lab.md`, not in this worktree; read in place and not copied into WP43.
- Official xAI docs consulted:
  - X Search: https://docs.x.ai/developers/tools/x-search
  - Responses API reference: https://docs.x.ai/developers/rest-api-reference/inference/chat
  - Citations: https://docs.x.ai/developers/tools/citations
  - Tool usage details: https://docs.x.ai/developers/tools/tool-usage-details
  - Grok 4.3 model page: https://docs.x.ai/developers/models/grok-4.3
  - Pricing: https://docs.x.ai/developers/pricing
- Relevant doc facts captured for implementation:
  - Responses API endpoint is `/v1/responses`.
  - X Search tool name is `x_search`.
  - `allowed_x_handles` and `excluded_x_handles` each allow up to 20 handles and cannot be combined.
  - `from_date` and `to_date` are ISO `YYYY-MM-DD`.
  - `enable_image_understanding` is an X Search option.
  - Response-level `citations` are returned by default from successful agent tool executions.
  - `server_side_tool_usage` reports successful billable server-side tool invocations; X Search appears as `SERVER_SIDE_TOOL_X_SEARCH`.
  - Grok 4.3 supports structured outputs and configurable reasoning `none`, `low`, `medium`, and `high`; pricing is $1.25/M input, $0.20/M cached input, and $2.50/M output.

## 2026-07-11 - Implementation

- Added `shared/xDiscovery.ts` as a pure normalization and guardrail boundary:
  canonical X status URL parsing, handle normalization, bounded discovery
  request validation, strict candidate schema validation, X citation matching,
  fake-metric language rejection, and tweet-id dedupe.
- Extended `src/lib/providers/config.ts` with server-only `responsesUrl` and a
  20s xAI discovery timeout.
- Extended `src/lib/providers/xai.ts` with:
  - `runXaiXSearchDiscovery`, a server-only Responses API wrapper that uses
    `x_search`, strict JSON schema instructions, `store: false`,
    `parallel_tool_calls: false`, low configured reasoning, request-side
    `max_tool_calls`/`max_turns`, date/handle/media bounds, timeout, redacted
    provider errors, normalized usage/cost, response citations, response id,
    and fail-closed validation.
  - `runHydratedXaiXSearchDiscovery`, which refuses to invoke paid xAI search
    unless an X access token and configured X app credentials are present, then
    hydrates through the existing X read boundary before returning valid rows.
- Extended `src/lib/x.ts` with `hydrateXDiscoveryCandidates`, an authoritative
  hydration validator. Demo fallback bundles are explicitly rejected as
  non-authoritative for Grok candidates; missing credentials, tweet-id mismatch,
  and author-handle mismatch produce structured failures.
- No opportunity writes, scanner integration, route/UI changes, eval lab work,
  publish path, schedule path, or production routing mutation were added.

## 2026-07-11 - Verification

- `./node_modules/.bin/vitest run tests/xDiscovery.test.ts tests/xDiscoveryHydration.test.ts tests/xaiProvider.test.ts`
  - Passed: 3 files, 25 tests.
- `./node_modules/.bin/tsc --noEmit --pretty false`
  - Passed.
- `./node_modules/.bin/eslint .`
  - Passed with the existing 4 generated Convex unused-disable warnings and
    zero errors.
- `/opt/homebrew/bin/npm test -- --run`
  - Passed: 62 files passed, 1 skipped; 522 tests passed, 1 skipped.
- `/opt/homebrew/bin/npm run build`
  - Passed after replacing the temporary dependency symlink with normal local
    `node_modules`. Initial build attempt failed because Turbopack rejects a
    `node_modules` symlink pointing outside the project root; no product code
    change was needed.
- `npm install` for local verification reported 3 moderate existing dependency
  advisories. No dependency or lockfile changes were kept in WP43.
