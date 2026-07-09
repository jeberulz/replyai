# WP10 Progress — Browser extension MVP

Append-only. Decisions, dead ends, gotchas for the next iteration.

## 2026-07-09 - Start

- Assigned WP10 on post-wave-2 `main` (`ad70172`). Worktree
  `/Users/jeberulz/Documents/AI-projects/replyai-wp10` rebased onto
  `origin/main`. Branch `feat/wp10-browser-extension-mvp` is local-only
  (not on origin yet).
- Read `PRD.md`, `AGENTS.md`, `docs/AGENT_PLAYBOOK.md`,
  `docs/PRODUCT_STRATEGY.md` §5.3 + §14 WP10, `design.md`, and mapped the
  existing deep-link surface: `/dashboard?url=` only prefills the composer;
  `/analysis/{id}` opens an existing workbench. No public score API.
- Scope gap: §14 lists `extension/` as the key file boundary, but DoD
  "deep link … pre-analyzed" requires a tiny app change (`auto=1`). Recorded
  in `docs/wp/RULINGS.md`.
- Plan: local heuristic badge via `shared/scoring.ts` (no Convex from the
  content script), deep link with `auto=1`, zero DOM automation / no
  injected posting.

## 2026-07-09 - S1–S4 complete

- Built `extension/` as a Chrome MV3 package (esbuild → `extension/dist`).
  Permissions: `storage` + host permissions for x.com/twitter.com only.
  Content script injects a floating badge; background opens deep links via
  `chrome.tabs.create`. Options popup stores `appOrigin`.
- Shared helpers in `shared/extensionBadge.ts` (parse location, score from
  page metrics with neutral topic relevance, build `/dashboard?url=&auto=1`).
  Unit tests in `tests/extensionBadge.test.ts`.
- App deep-link: `ChatHome` honors `auto=1` once, strips the query param
  before starting analysis (Strict Mode / refresh safe). `/analyze` passes
  `auto` through. No publish path from the extension.
- Verification: typecheck, lint (existing generated warnings only), test
  (252 passed), build, `extension:build`, `extension:typecheck` all green.
- Found on main: `ad70172` imported `research/profile-*` without committing
  those files, breaking typecheck. Added the missing components (and removed
  the orphaned `profile-suggestion-card.tsx`) so the gate can pass. Not part
  of WP10 product scope — unblocker only.
