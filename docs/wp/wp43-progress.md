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
