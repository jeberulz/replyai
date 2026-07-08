# WP03 Account Data Inventory

`convex/account.ts` treats the following tables as user-owned account data.
Every listed child table is selected by the authenticated user's `users._id`;
`users` is deleted last.

| Table | Owner field / index | Relationship fields | Delete order |
|---|---|---|---:|
| `sessions` | `userId` / `by_user` | `userId` | 10 |
| `xTokens` | `userId` / `by_user` | `userId` | 20 |
| `scannerSettings` | `userId` / `by_user` | `userId` | 30 |
| `usage` | `userId` / `by_user_month` | `userId`, `month` | 40 |
| `opportunities` | `userId` / `by_user` | `userId`, `tweetId` | 50 |
| `savedDrafts` | `userId` / `by_user` | `userId`, `analysisId`, `replyId` | 60 |
| `generatedReplies` | `userId` / `by_user` | `userId`, `analysisId`, `voiceProfileId` | 70 |
| `modelEvals` | `userId` / `by_user` | `userId`, `analysisId` | 80 |
| `tweetAnalyses` | `userId` / `by_user` | `userId`, `projectId`, `tweetId` | 90 |
| `voiceProfiles` | `userId` / `by_user` | `userId` | 100 |
| `researchProfiles` | `userId` / `by_user` | `userId`, `runId`, `handle` | 110 |
| `researchRuns` | `userId` / `by_user` | `userId` | 120 |
| `projects` | `userId` / `by_user` | `userId` | 130 |
| `users` | `_id` / direct row | `_id`, `xUserId`, `username` | 140 |

`cachedResponses` is intentionally excluded: it has no `userId` owner field and
is a keyed, expiring external-response cache. It is pruned by `convex/cache.ts`.
