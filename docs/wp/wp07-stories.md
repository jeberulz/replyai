# WP7 Stories — Reply-back tracker + outcome agent

Definition of done from `docs/PRODUCT_STRATEGY.md` §14: `responded` populated in prod; response-rate on dashboard.

## Stories

- [x] **WP7-S1 — Tracking model and seed path**
  - Add additive/optional-first tracking persistence for published reply/quote outcomes.
  - Seed tracking from the existing publish result mutation when `publishedTweetId` is stored.
  - Keep demo mode deterministic and non-blocking with zero X credentials.

- [ ] **WP7-S2 — Poller and outcome classification**
  - Add `convex/outcomes.ts` with bounded internal poller functions and retry/backoff scheduling.
  - Poll X for replies to tracked published tweet IDs during a 48h window.
  - Classify observed responses into stable outcome labels, marking matching opportunities as `responded`.
  - Add focused tests for outcome classification/backoff behavior.

- [ ] **WP7-S3 — Cron wiring**
  - Wire a Convex cron that regularly runs the outcome poller.
  - Keep the cron internal-only and safe when no rows are eligible.

- [ ] **WP7-S4 — Dashboard response-rate metric**
  - Add dashboard metric logic for reply response-rate from real observed outcomes.
  - Surface the metric in the existing dashboard stat strip without fake prediction language.
  - Add focused tests for the response-rate calculation.

- [ ] **WP7-S5 — Final verification and docs**
  - Append implementation notes, decisions, and gotchas to `docs/wp/wp07-progress.md`.
  - Run the required checks: `npm run typecheck && npm run lint && npm test && npm run build`, plus `npm run evals`.
  - Run `npm run security:audit` if any new public Convex functions are added.
