- [x] WP19-S1: Fan out scheduled per-user scan jobs
  - `convex/scannerActions.ts` replaces the serial `scanAll -> runAction(scanUser)` loop with per-user scheduled jobs so one failing scan does not block others.
  - `convex/crons.ts` triggers a dispatcher cadence that can enqueue per-user scan jobs without changing publish behavior or demo mode.
  - The implementation stays inside `convex/scannerActions.ts` and `convex/crons.ts`.

- [x] WP19-S2: Add text-fingerprint dedupe across sources
  - Candidate merging drops near-identical tweets that differ only by tweet id or discovery source by using the existing text fingerprint.
  - Deduping preserves source-priority ordering so watched/list/search/following precedence still holds.
  - Demo-mode candidate collection follows the same dedupe behavior.

- [x] WP19-S3: Apply adaptive scan cadence
  - Scanner dispatch chooses whether a user should be scanned on the current cron tick based on plan tier and user activity signals.
  - Priority users can receive the 15-minute lane described in `docs/PRODUCT_STRATEGY.md`; lower tiers stay on the cheaper cadence.
  - Cadence decisions do not require schema, UI, billing-surface, or generated API changes.

- [x] WP19-S4: Make search budgets plan-aware
  - Discovery search keyword count and/or per-query result budget vary by plan tier instead of the current hardcoded `3 x 10`.
  - Demo mode remains deterministic and continues to work with zero external keys.
  - Any budget change stays inside `convex/scannerActions.ts` and does not alter UI contracts.

- [ ] WP19-S5: Verify WP19 end to end
  - `npm run typecheck`
  - `npm run lint`
  - `npm test`
  - `npm run build`
  - Final review maps each WP19 DoD item to the implemented behavior and notes any demo-mode constraints.
