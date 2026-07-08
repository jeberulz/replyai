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

## 2026-07-08 — WP7-S4

- Added `replyResponseStats` in `shared/outcomes.ts` and wired `usage.stats` to return `replyBackRate`, `replyBackResponded`, and `replyBackSent` for the current month.
- Dashboard metric semantics: completed 48h outcomes only. Numerator is `responded`; denominator is `responded + expired`. Active rows are still under observation and failed rows are excluded so API/token problems do not look like user response outcomes.
- Added `by_user_and_publishedAt` index on `replyOutcomeTrackers` so dashboard stats can query the current month by indexed range.
- Surfaced the metric in `src/components/app/chat/stat-strip.tsx` as `Reply-back`, using the same compact mono treatment as the other dashboard stats and no predictive language.
- Relevant Next.js App Router guide read before UI edit: `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`. `design.md` was read before UI work.
- Story checks passed: `npm run typecheck && npm test && npm run lint`; lint reported only existing generated-file unused-disable warnings. `npm run build` also passed after the UI change.

## 2026-07-08 — WP7-S5

- Final required suite passed: `npm run typecheck && npm run lint && npm test && npm run build`.
- `npm run lint` reports four warnings in existing generated Convex files for unused eslint-disable directives; there are no lint errors.
- Eval gate passed: `npm run evals`.
- Security audit passed: `npm run security:audit` (`60 public Convex functions checked, 3 allow-listed`). No new public Convex functions were added; this was run because WP7 touches token refresh and publish-result seeding.
- `npx convex codegen` remains blocked in this worktree because `CONVEX_DEPLOYMENT` is not configured. The static generated API type list was manually updated for `outcomes`; runtime generated JS already uses `anyApi`.
