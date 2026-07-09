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
