# WP15 Stories — PWA + offline drafts

**Definition of done** (`docs/PRODUCT_STRATEGY.md` §14): **Installable** web app;
**drafts survive offline** (local queue synced when back online). Human publish
still requires network + explicit click — no offline auto-publish.

**Product refs:** §5.3 P2 PWA; §9 mobile/PWA notes; Phase 2 §10 item 6.

**Depends on:** WP8 push SW on `main` (`public/push-sw.js`); WP14 variant fields
on drafts (schema stable).

**Parallel-safe with:** WP39 if WP15 does not edit onboarding flow.

## File boundary

**Owns:**

- `public/manifest.webmanifest` (or `manifest.json`) + icons under `public/`
- `src/app/manifest.ts` or layout `<link rel="manifest">` wiring
- Extend `public/push-sw.js` **additively** for app shell cache + offline draft
  queue sync hooks (keep WP8 push/notification handlers intact)
- `src/lib/offlineDrafts.ts` (IndexedDB queue + sync)
- Install prompt UI (optional banner in app shell settings or header)
- `tests/offlineDrafts.test.ts` (pure queue logic; jsdom/idb mock if needed)

**May touch additively:**

- `src/components/app/drafts/**` — offline badge / sync status on draft rows
- `convex/drafts.ts` — idempotent save when syncing queued creates (if needed)
- `next.config.ts` — headers for manifest/SW scope

**Do not touch:** onboarding concierge (WP39), compose generation, billing.

## Defaults

- **Single service worker** at `/push-sw.js` — extend, do not register a second SW
- Offline scope: save draft text locally when `navigator.onLine === false` or
  mutation fails with network error; sync on reconnect + on app focus
- Installability: manifest name, theme_color from Dark Chrome tokens, display
  `standalone`, start_url `/dashboard`
- Do **not** cache Convex WebSocket/API responses aggressively (stale data risk)
- Push notifications (WP8) must still work after SW changes — manual test checklist
- Demo mode: offline queue works without keys; sync no-ops cleanly in demo publish
- No background sync publish — queue **creates/updates drafts only**

## Stories

- [ ] **WP15-S1 — Web app manifest + install metadata**
  - Manifest + icons; linked from root/app layout.
  - Lighthouse installable criteria documented in progress.md.

- [ ] **WP15-S2 — Offline draft queue (client)**
  - IndexedDB store: pending draft saves/edits with client idempotency key.
  - Vitest for enqueue/dequeue/merge logic.

- [ ] **WP15-S3 — Sync layer**
  - On online: flush queue via existing draft mutations; resolve conflicts last-write-wins with toast.
  - Surface sync errors; never drop queued text silently.

- [ ] **WP15-S4 — Service worker shell cache (minimal)**
  - Additive SW: cache static assets only (app icons, fonts) — not API.
  - Verify push + notificationclick still pass manual WP8 regression.

- [ ] **WP15-S5 — UI + verification**
  - Draft list/detail shows offline/synced state; optional install hint in settings.
  - Manual: airplane mode save → reconnect sync; checks green; PR DoD checklist.
