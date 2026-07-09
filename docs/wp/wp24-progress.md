# WP24 progress

Append-only. Newest entries at the bottom.

## 2026-07-09 — Kickoff

- Gate 0: PR #19 (CI lockfile) merged; local dirty research/lockfile reset to
  `origin/main` @ `5232f35`.
- Owner rulings recorded in `RULINGS.md` (ds/ strangler, Theme scope, defer WP28).
- Branch: `feat/wp24-astryx-foundation`.
- Next: S1 docs commit, then S2 package install.

## 2026-07-09 — S2–S6 foundation landed

- Installed `@astryxdesign/core`, `theme-neutral`, `cli` @ 0.1.4.
- CLI requires Node >=22.13; app/CI stay on Node 20. Scripts:
  `npm run astryx` / `npm run astryx:theme`. Built theme artifacts committed.
- Source theme: `src/theme/dark-chrome.source.ts` (renamed so built
  `dark-chrome.js` wins module resolution).
- CSS: `astryx.css` + built `dark-chrome.css` + `tailwind-theme.css`. Skipped
  Astryx `reset.css` to avoid fighting Tailwind preflight on the landing page.
- Theme providers on `(app)` + `(onboarding)` only. Landing `page.tsx` diff vs
  main: empty.
- Dev-only `AstryxBrandProof` Banner on dashboard.
- `AGENTS.md` Astryx block rewritten for brand lock (not stock Neutral rules).
- `design.md` mapping table added.
- Checks: typecheck / lint (pre-existing generated warnings) / test 243 pass /
  build green.
- Gotcha: `astryx init` appends Neutral-centric agent rules — always patch for
  Dark Chrome before merge.
- Next wave: WP25 `src/components/ds/` adapters (orchestrator assigns).

