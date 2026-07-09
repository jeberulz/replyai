# WP10 Stories — Browser extension MVP

Definition of done (§14): Score badge + deep link on x.com; zero DOM
automation. Read-only injection only — no injected posting.

- [ ] `WP10-S1` Extension workspace scaffold
  - Add an `extension/` package (MV3) with its own `package.json`, TypeScript
    build, and `dist/` output loadable as an unpacked Chrome extension.
  - Manifest hosts are limited to `x.com` / `twitter.com` content scripts;
    permissions stay minimal (no broad `<all_urls>`, no scripting that posts).
  - Document load/build steps in `extension/README.md`.
  - Root `package.json` gains a thin `extension:build` script; no unrelated
    dependency churn in the Next app.

- [ ] `WP10-S2` Read-only conversation score badge
  - On a status URL (`/status/{id}`), the content script shows a compact
    ReplyPilot badge with a 0–100 heuristic score derived from visible
    engagement signals + `shared/scoring.ts` (topic relevance defaults to
    neutral — no user keywords in the extension).
  - Badge never mutates the tweet composer, never clicks reply/post, never
    injects text into X inputs.
  - Focused unit tests cover URL→tweetId parsing reuse and metric→score
    mapping helpers used by the content script.

- [ ] `WP10-S3` One-click deep link into pre-analyzed workbench
  - Badge CTA opens `{APP_URL}/dashboard?url={encoded}&auto=1` (configurable
    app origin via extension options; default `http://localhost:3000`).
  - App accepts `auto=1` with a valid `url` and starts the existing analyze
    pipeline once (same path as pasting a URL), so the workbench opens
    without a second Analyze click.
  - `/analyze?url=&auto=1` preserves the query when redirecting to dashboard.
  - No publish path is reachable from the extension.

- [ ] `WP10-S4` Verification + docs
  - `npm run typecheck && npm run lint && npm test && npm run build` pass.
  - `npm run extension:build` produces a loadable `extension/dist`.
  - README / AGENTS note the extension exists and the ToS posture
    (read + deep-link only).
