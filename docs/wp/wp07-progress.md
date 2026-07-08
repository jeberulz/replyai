# WP7 Progress — Reply-back tracker + outcome agent

## 2026-07-08 — WP7-S1

- Added additive `replyOutcomeTrackers` persistence with indexes for per-user lookup, idempotent draft seeding, published tweet lookup, and due-poll ordering by `status + nextPollAt`.
- Added `convex/outcomes.ts` with internal `seedPublishedDraft`, called from `drafts.markResult` immediately after `publishedTweetId` is stored. This keeps publish seeding at the single existing success point and preserves the no-auto-publish invariant.
- The tracker stores opportunity/analysis links when available, plus target author metadata for later response classification.
- `npx convex codegen` could not run in this worktree because no `CONVEX_DEPLOYMENT` is configured. `convex/_generated/dataModel.d.ts` derives table types from `schema.ts`; manually added the new `outcomes` module to `convex/_generated/api.d.ts` so TypeScript can reference `internal.outcomes.seedPublishedDraft`.
- Story checks passed: `npm run typecheck && npm test`.

## 2026-07-08 — WP7-S2

- Added a bounded internal outcome poller: `internal.outcomes.pollDue` asks `dueTrackers` for active rows whose `nextPollAt` is due, then records response, no-response, or expiry through internal mutations.
- Polling uses the user's stored X token. If the access token is expired and a refresh token exists, the action refreshes in the default Convex runtime with `fetch`/`btoa` and updates `xTokens`. Missing credentials or token errors never break publish; they record an error on the tracker and back off until the 48h window closes.
- Demo users get deterministic response data from the poller (`conversation_continued`) so zero-key demo mode can exercise the outcome loop.
- Outcome classification is deterministic in `shared/outcomes.ts`: target author reply wins, high-reply/low-like posts classify as `got_ratioed`, any observed reply or public reply count becomes `conversation_continued`.
- Search strategy: fetch public metrics for the published tweet, and search recent replies in `conversation_id:${targetTweetId ?? publishedTweetId}` filtered to `referenced_tweets.replied_to === publishedTweetId`. Public metrics provide a fallback when recent search is unavailable.
- Story checks passed: `npm run typecheck && npm test`.

## 2026-07-08 — WP7-S3

- Wired `convex/crons.ts` with `crons.interval("poll reply outcomes", { minutes: 15 }, internal.outcomes.pollDue, {})`.
- Left existing unrelated cron definitions unchanged to preserve scope.
- Story checks passed: `npm run typecheck && npm test`.
