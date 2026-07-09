# WP35 Progress — Engagement-window prediction

## 2026-07-09 — Scaffold

- WP7 outcome data on `main`; WP32 ranking separate — do not conflate timing copy with ranking changelog.

## 2026-07-09 — WP35-S1

- Chose `shared/engagementWindow.ts` (not `timing.ts`) — name matches product language.
- Buckets = author follower band (same cutoffs as scoring velocity bands) × optional topic tag.
- Peak = original post → respondedAt when available; else reply publish → respondedAt.
- Also emit band-only curves when topic-tagged groups don't cover the band key.
- Demo fixtures: medium/AI agents n=5 median 40m; small band sparse.
- Round step = 10 min (inside 5–15 default).
- Isolated worktree `replyai-wp35` after parallel workers kept switching the shared checkout.

## 2026-07-09 — WP35-S2

- New `convex/timing.ts` query `engagementWindow` (not extending usage.ts — keeps analytics surface separate).
- Auth via `requireUser`; args+returns validators.
- Index `by_user_and_publishedAt` + `.take(400)` — no unbounded collect.
- Demo users get `demoEngagementWindowSnapshot()` deterministically.
- Joins opportunity/analysis for followers, postedAt, topic — read-only, no schema change.

## 2026-07-09 — WP35-S3

- Surface: chat-home sibling card `EngagementWindowCard` (below ReplyPacingCard, above PersonalAnalyticsCard).
- Hook `useEngagementWindow` → `api.timing.engagementWindow`.
- Sparse buckets show "—" + need-n copy; sufficient buckets show rounded median minutes.
- Demo badge + fixture copy when `isDemo`.
