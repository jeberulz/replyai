# WP15 Progress — PWA + offline drafts

## 2026-07-09 — Scaffold

- Wave 3 worker W9. Last WP before public launch push per program plan.
- Existing `public/push-sw.js` is WP8 hot-window only — extend additively.

## 2026-07-09 — WP15-S1 manifest + install metadata

- Added `src/app/manifest.ts` (Next MetadataRoute) — name ReplyPilot AI,
  `display: standalone`, `start_url: /dashboard`, `theme_color` / `background_color`
  `#000000` (Dark Chrome chrome-background).
- Icons under `public/icons/` (192, 512, maskable 512). Root layout
  `applicationName` + appleWebApp + icon links; Next auto-links `/manifest.webmanifest`.
- `next.config.ts`: no-store for `/push-sw.js` + `Service-Worker-Allowed: /`;
  short cache for manifest.
- **Lighthouse installable notes (manual):** Chrome DevTools → Lighthouse →
  Progressive Web App. Expect: (1) manifest with name + 192/512 icons,
  (2) `display` standalone/fullscreen/minimal-ui, (3) `start_url`,
  (4) theme_color, (5) registered service worker controlling page (after S4),
  (6) HTTPS or localhost. Installability may still require user engagement /
  beforeinstallprompt — banner lands in S5.

## 2026-07-09 — WP15-S2 offline draft queue (client)

- `src/lib/offlineDrafts.ts`: IndexedDB store `replypilot-offline-drafts` /
  `queue` keyed by `clientId`; memory fallback for SSR/tests.
- Pure helpers: `mergeQueuedOp` (LWW by `updatedAt`, merge same draftId updates),
  `shouldQueueOffline` / `isNetworkError`, `flushOfflineQueue` (draft create/
  update only — never publish).
- `tests/offlineDrafts.test.ts` — 14 cases covering merge, dequeue, offline
  no-op, create/update flush, error retention, network stop.


## 2026-07-09 — WP15-S3 sync layer

- Optional `savedDrafts.clientId` + `by_user_client` index; `drafts.save` dedupes
  offline creates (LWW text patch if already exists).
- Named actions: `syncOfflineDraftCreateAction` / `syncOfflineDraftUpdateAction`
  (WP15 group in `actions.ts` — no concierge collision).
- `offlineDraftSync.ts` + `OfflineDraftSync` in app layout: flush on online,
  focus, visibility, SW message. Toasts on sync/conflict/error; never drops text.
- `saveDraftWithOffline` / `updateDraftWithOffline` wrap save/update for queueing.


## 2026-07-09 — WP15-S4 service worker shell cache

- Extended `public/push-sw.js` additively: install/activate shell cache
  (`replypilot-shell-v1`) for `/icons/*` + manifest only.
- Fetch handler allowlists static shell assets; never intercepts Convex /
  `/api/` / `_next/data`.
- WP8 `push` + `notificationclick` handlers preserved (icon paths updated to
  PWA icons). SW posts `replypilot-sync-drafts` to nudge page flush.
- **WP8 push regression checklist (manual):** enable push in Settings →
  receive hot-window notification → click opens `/feed` (or deep link) and
  focuses existing client; no second SW registration in Application panel.
