# WP02 Stories — Stripe billing + gating

- [x] `WP02-S1` Convex billing model and webhook ingestion
  - Add additive billing fields required to map a user to Stripe test-mode state without breaking existing rows or demo accounts.
  - Implement a dedicated Convex billing module plus HTTP webhook entrypoint that verifies Stripe events and updates `users.plan` from subscription lifecycle changes.
  - Webhook handling remains idempotent for repeated Stripe deliveries and ignores unrelated events safely.

- [x] `WP02-S2` Server-side plan gates for paid discovery features
  - Free users cannot enable or run the feed scanner through public mutations/actions; authenticated Pro users can.
  - Gating logic is centralized enough to reuse for notifications and does not weaken existing `requireUser` checks.
  - Demo mode still works with no Stripe, X, or Anthropic keys configured.

- [x] `WP02-S3` Settings billing UI and test-mode checkout flow
  - Settings shows current plan, billing state, and clear Free/Pro capability copy without broadening the page scope beyond billing.
  - When Stripe env is configured, users can start a test-mode Pro checkout flow and open the billing portal; when it is not configured, the UI degrades cleanly.
  - The settings UI keeps the existing Dark Chrome conventions and does not alter unrelated settings areas.

- [x] `WP02-S4` Verification and regression coverage
  - Add focused tests for any new shared/server logic with meaningful failure cases.
  - `npm run typecheck && npm run lint && npm test && npm run build` pass on the WP2 branch.
  - Manual/demo-path verification confirms missing Stripe keys do not break auth, settings, or scanner-adjacent flows.
