# WP43 Stories - Grok X Search + authoritative X hydration

Status legend: [ ] not started, [x] complete

## S1 - Shared X discovery guardrails

- [x] Add pure shared helpers for canonical X status URL parsing, citation validation, bounded search inputs, and normalized candidate validation.
- [x] Reject missing citations, non-X URLs, ambiguous IDs, over-limit handles/results/tool calls, and fake metric language.
- [x] Cover valid, malformed, partial, and bounded-input cases with focused unit tests.

## S2 - Server-only xAI X Search adapter

- [x] Add a server-only xAI Responses API discovery wrapper that uses `x_search`, strict JSON schema instructions, low reasoning, bounded date/handle/media/result/tool settings, timeout, and no storage.
- [x] Normalize output, citations, usage, successful tool calls, latency, response id, and provider errors without leaking raw provider payloads or secrets.
- [x] Missing `XAI_API_KEY`, disabled config, malformed schema, timeout, rate-limit, or failed tool/citation validation fail closed without touching scanner or publishing paths.

## S3 - Authoritative X hydration boundary

- [x] Add a server-only hydration validator that rehydrates candidate IDs through existing X tweet reads before marking them valid.
- [x] Missing X credentials or access token prevents paid xAI search and returns a deterministic zero-key fallback/skip result.
- [x] Hydration verifies canonical ID and author handle when available; failed/ambiguous hydration never produces valid candidates.

## S4 - Verification and handoff docs

- [x] Record official xAI docs consulted, implementation decisions, and verification evidence in `docs/wp/wp43-progress.md`.
- [x] Run focused provider/security tests and as much of the full gate as feasible.
- [x] Ensure WP43 does not write opportunities, alter scanner output, expose UI, or add any publish/schedule path.
