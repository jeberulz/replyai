# WP16 Progress - Pipeline & Publish Robustness

Append-only progress log. New entries go at the bottom.

## 2026-07-08 - Start

- Read `PRD.md`, `AGENTS.md`, `docs/AGENT_PLAYBOOK.md`, `docs/PRODUCT_STRATEGY.md` §4 and WP16 materials, and `convex/_generated/ai/guidelines.md`.
- `docs/wp/RULINGS.md` did not exist at start; the user approved a scope ruling for the extra files needed by WP16 and it was recorded in this branch.
- Tried to read the required local Next guide before planned `src/app/actions.ts` edits, but `node_modules/next` and `node_modules/next/dist/docs` are not present in this worktree. This is a local dependency/install limitation, not a product ruling.
- Ran `npm ci`; after dependencies installed, read `node_modules/next/dist/docs/01-app/02-guides/server-actions.md` and `node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md`. Relevant constraint: server actions are direct POST entry points, so auth and ownership checks must stay inside each action.
- Initial story breakdown created before implementation edits.

## 2026-07-08 - WP16-S1

- Added bounded `threadAncestors` to `TweetBundle`, live X fetching for reply parent chains, deterministic demo ancestors, additive `tweetAnalyses.threadAncestors` persistence, and analysis bundle restoration from saved rows.
- Included ancestor context in the cached AI context block before the target tweet, while keeping existing rows and manual text analyses valid with an empty ancestor list.
- Verification: `npm run typecheck && npm test` passed.

## 2026-07-08 - WP16-S2

- Added `enforceGeneratedOptionGuardrails` to normalize valid categories and reject post-parse model output with duplicate/invalid categories or content over X's weighted 280-character budget.
- Wired `generateOptions` to run the guardrail after parsing, make one strict model repair pass when needed, and reject the output if repair still violates the guardrail. Usage accounting includes repair tokens.
- Added focused unit tests for duplicate categories, invalid categories, weighted length, and category normalization.
- Verification: `npm run typecheck && npm test` passed.

## 2026-07-08 - WP16-S3

- Added an additive `tweetAnalyses` index on `status` and `updatedAt`.
- Added bounded internal stale-pipeline sweep logic for rows stuck in `analyzing` or `generating`, marking them failed with a retryable message.
- Scheduled the sweep every five minutes from `convex/crons.ts`.
- Verification: `npm run typecheck && npm test` passed.

## 2026-07-08 - WP16-S4

- Added retry classification for X publish status 429 and 5xx only, with two scheduled retries and jittered exponential delay. 403/policy failures still fail immediately through the existing parsed X error path.
- Kept retry state in scheduler args (`attempt`) instead of adding draft schema, so retries are tied to the originally approved draft text and do not create a new user-facing publish path.
- Added weighted-length validation before all publish sends and weighted-safe URL quote composition before appending a permalink.
- Added focused unit tests for retryability, jitter delay, and weighted URL quote composition.
- Verification: `npm run typecheck && npm test` passed.
