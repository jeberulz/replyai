# WP35 Stories — Engagement-window prediction

**Definition of done** (Phase 2 program; product §5.1 P2): From accumulated
reply-back data, show **data-backed** timing guidance (e.g. “window closes in
~40 min”) per niche/author-size bucket — **observed counts only**, never fake ML %.

**Depends on:** WP7 on `main` (`replyOutcomeTrackers`, opportunity ages at send).

**Parallel-safe with:** WP38, WP37, WP23 (disjoint files).

## File boundary

**Owns:**

- `shared/engagementWindow.ts` (or `shared/timing.ts`)
- `convex/timing.ts` or extend `convex/usage.ts` with `engagementWindow` query
- Dashboard/analytics UI card (e.g. `src/components/app/chat/personal-analytics-card.tsx`
  sibling or feed strip — pick one surface in S1)
- `tests/engagementWindow.test.ts`

**Do not touch:** ranking weights (WP32), scanner cadence, compose (WP23).

## Defaults

- Minimum sample size before showing a prediction (e.g. n≥5 completed trackers in bucket);
  below threshold → honest “not enough data yet” copy.
- Buckets: author follower band × optional topic tag from analysis.
- Copy template: “Based on your last N replies in this band, median peak was ~Xm after post.”
- Demo: deterministic fixture curves in shared module.
- No fake precision — round to sensible intervals (5–15 min).

## Stories

- [x] **WP35-S1 — Shared window curve math + tests**
  - Compute median/min/max time-to-response or time-to-peak from tracker rows.
  - Vitest fixtures for sparse vs sufficient data.

- [x] **WP35-S2 — Convex query**
  - Authenticated query returning curves + sample sizes per bucket for current user.
  - Uses indexes on `replyOutcomeTrackers`; no unbounded collect.

- [ ] **WP35-S3 — UI surface**
  - One visible card or feed hint showing window guidance when sample sufficient.
  - Demo mode shows fixture copy.

- [ ] **WP35-S4 — Verification**
  - No numbers when n below threshold; checks green; PR DoD mapped.
