# WP7 Progress — Reply-back tracker + outcome agent

## 2026-07-08 — WP7-S1

- Added additive `replyOutcomeTrackers` persistence with indexes for per-user lookup, idempotent draft seeding, published tweet lookup, and due-poll ordering by `status + nextPollAt`.
- Added `convex/outcomes.ts` with internal `seedPublishedDraft`, called from `drafts.markResult` immediately after `publishedTweetId` is stored. This keeps publish seeding at the single existing success point and preserves the no-auto-publish invariant.
- The tracker stores opportunity/analysis links when available, plus target author metadata for later response classification.
- `npx convex codegen` could not run in this worktree because no `CONVEX_DEPLOYMENT` is configured. `convex/_generated/dataModel.d.ts` derives table types from `schema.ts`; manually added the new `outcomes` module to `convex/_generated/api.d.ts` so TypeScript can reference `internal.outcomes.seedPublishedDraft`.
- Story checks passed: `npm run typecheck && npm test`.
