# WP8 Stories — Hot-window notifications

Definition of done from `docs/PRODUCT_STRATEGY.md` §14: capped, quiet-hours-aware alerts; open→send rate tracked. Web push SW, notification settings, digest email.

## Defaults (see `wp08-progress.md`)

- Daily cap: 5
- Quiet hours: 22:00–08:00 UTC
- Score threshold: 70
- Young window: 2h
- Golden-15: watched|list + ≤15m + score≥threshold
- Master off until opt-in + browser permission
- Pro/demo via `hasProAccess`; demo/missing VAPID = no network push

## Stories

- [x] **WP8-S1 — Schema**
  - Additive tables: `notificationSettings`, `pushSubscriptions`, `notificationAlerts`, `notificationDailyCounts`.
  - Optional `users.notificationEmail` for digest delivery.

- [x] **WP8-S2 — Shared logic + tests**
  - `shared/notifications.ts`: quiet hours, golden-15 tier, enqueue eligibility, copy (no fake ML %).
  - Vitest coverage for cap, quiet hours, tier classification, source toggles.

- [x] **WP8-S3 — Enqueue on upsert**
  - Minimal hook in `opportunities.upsertMany` scheduling `internal.notifications.evaluateOpportunity` for new rows.
  - Pro gate + settings gate inside evaluation.

- [x] **WP8-S4 — Push + SW + VAPID**
  - `convex/notificationsActions.ts` (`use node`) with web-push delivery; no-op without VAPID keys.
  - `public/push-sw.js` service worker (push only — not full PWA).

- [x] **WP8-S5 — Settings UI**
  - `notification-settings-card` on settings page (ds/ components): master toggle, sources, threshold, quiet hours, push permission, digest toggle, optional notification email.

- [x] **WP8-S6 — Deliver + deeplink + open**
  - Deep link `/feed?opportunity=…&alert=…`; mark alert opened; track `notification_alert_opened`.

- [x] **WP8-S7 — Open→send**
  - Link publish to alert `sent` status; `notification_alert_sent` analytics for open→send rate.

- [x] **WP8-S8 — Digest email**
  - Daily cron composes digest; Resend when env-gated; demo/no-op otherwise; does not block delivery.

- [x] **WP8-S9 — Delete/export + docs + checks**
  - Account delete/export includes notification tables; README/env/observability updates; full CI suite + security audit.
