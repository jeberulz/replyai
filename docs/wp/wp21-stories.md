# WP21 Stories — Research agent tightening

- [x] `WP21-S1` Honest research scoring and posting cadence
  - Replace the current `avgLikes / 500` heuristic with engagement normalization that is relative to the candidate's follower band, so mid-size accounts are not structurally outranked by large accounts on raw like volume alone.
  - Compute research `postFrequency` from tweet timestamps when timestamp data exists; any fallback text must stay explicitly approximate rather than presenting inferred sample-count activity as fact.
  - Add focused unit tests in `tests/` for band-normalized engagement and timestamp-based post-frequency labeling, including at least one case that previously over-favored a large account.

- [ ] `WP21-S2` Watched-handle dedupe and keyword seeding
  - Research results should not re-suggest handles the user is already watching; saved results and live runs both dedupe against the watched-handle list without breaking demo mode.
  - One-click watch from research must keep watched handles deduped and also seed scanner keywords from the selected profile's topic tags without duplicating or exceeding existing scanner limits.
  - Add focused tests for watched-handle dedupe and keyword seeding behavior.

- [ ] `WP21-S3` Research UI reflects the tightened watch flow
  - Research cards and run results should show the timestamp-derived cadence copy without overstating certainty.
  - Already-watched profiles should not present a misleading "Watch" action, and the watch affordance should make the keyword-seeding behavior legible in honest copy.
  - The updated research flow compiles and preserves the existing demo-mode behavior and route structure.
