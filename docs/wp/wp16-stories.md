# WP16 Stories - Pipeline & Publish Robustness

Definition of done from `docs/PRODUCT_STRATEGY.md` §14:

Thread-ancestor context in analysis; weighted 280-char validation + category-distinctness enforcement post-parse; stale-pipeline sweep; retry-with-jitter on 429/5xx publishes.

## Stories

- [x] WP16-S1 - Thread ancestors in analysis context
  - Acceptance criteria:
    - `TweetBundle` carries a bounded list of ancestor tweets for live and demo/manual flows without breaking deterministic demo mode.
    - `tweetAnalyses` persists ancestor snapshots additively, and saved analyses rebuild bundles with that context.
    - The analysis prompt includes ancestors as delimited conversation context before the target tweet.
    - Existing single-tweet analyses continue to work when no ancestors are present.

- [x] WP16-S2 - Post-parse generation guardrails
  - Acceptance criteria:
    - `generateOptions` enforces distinct categories after parsing, using the valid category set for the requested kind.
    - `generateOptions` enforces the X weighted 280-character budget after parsing.
    - Violating model output is recovered with a shorter/different-category rewrite when possible, and rejected instead of saved when recovery fails.
    - Demo mode still returns exactly 3 options with reasons, no fake scores.

- [x] WP16-S3 - Stale pipeline sweep
  - Acceptance criteria:
    - Analyses stuck in `analyzing` or `generating` beyond the configured stale threshold are marked failed with a retryable user-facing message.
    - The sweep is bounded and scheduled from `convex/crons.ts`.
    - The implementation uses Convex indexes or bounded reads and does not require user credentials.

- [x] WP16-S4 - Publish retry with jitter
  - Acceptance criteria:
    - X publish responses with status 429 or 5xx schedule one or two retries with jitter instead of immediately failing.
    - Non-retryable policy/auth failures, including 403 reply/quote restrictions, still fail with the parsed X error and preserve the standalone fallback behavior.
    - Retry state is idempotent across re-entry and cannot create an auto-publish path beyond the originally approved draft text.
    - Demo publish behavior remains deterministic and key-free.

- [x] WP16-S5 - Final gate
  - Acceptance criteria:
    - Focused tests/eval fixtures cover the new guardrail behavior where needed.
    - `npm run typecheck && npm run lint && npm test && npm run evals && npm run build` passes locally.
    - The final report lists commits, files changed, DoD evidence, check summaries, demo-mode notes, and blockers.
