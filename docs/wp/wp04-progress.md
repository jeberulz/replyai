# WP4 — Observability: progress log

Append-only. Decisions, dead ends, gotchas for the next iteration.

## Setup

- Branch `feat/wp04-observability` created from `origin/main` (bff21c6).
- No `docs/wp/RULINGS.md` exists yet — this is the first WP to run (wave 0),
  nothing to check against.
- Corrected a process mistake early on: the first attempt ran `git checkout
  -b` and `npm install` in the shared checkout
  (`/Users/jeberulz/Documents/AI-projects/replyai`) instead of this agent's
  assigned worktree. Reverted `package.json`/`package-lock.json` there and
  switched that checkout back to `main` before redoing the work correctly
  in the worktree. No lasting effect on the shared checkout.

## Design decisions

- **Distinct ID**: Convex `users._id` string, used as the PostHog
  `distinctId` on both server and client captures. Chosen over the session
  token because the token is a bearer credential — no reason to also hand
  it to a third-party analytics vendor. Client-side, a new
  `AnalyticsProvider` (mounted in `(app)/layout.tsx`) calls
  `identifyClient(userId)` once; `trackClient` calls afterward reuse
  PostHog's own persisted distinct id.

- **`opportunity_surfaced` is a per-scan aggregate, not per-opportunity.**
  Firing one event per newly-surfaced tweet would multiply event volume by
  the scanner's batch size for no funnel benefit — PostHog funnels are
  computed per `distinct_id` over an ordered sequence of event *presence*,
  not by joining a shared entity id across steps. One `opportunity_surfaced`
  event per user per scan run (property: `count`) is exactly what a
  per-user "did they get opportunities this week" funnel step needs, and
  avoids a needless event-volume/cost concern the strategy doc flags
  repeatedly (LLM/API cost discipline extends to instrumentation cost).
  Documented in `docs/observability.md`.

- **`option_selected` fires from three call sites** (copy, save-draft,
  publish) with an `action` property distinguishing them, rather than three
  separate event names. The DoD names one combined step
  ("option selected/copied"); a single event name keeps the funnel step
  unambiguous while the `action` property preserves which path the user
  took, for breakdown analysis.

- **Convex-side capture uses `fetch` directly against the PostHog HTTP
  capture API and Sentry's envelope/store API — no `posthog-node` or
  `@sentry/node` dependency inside `convex/`.** Reasons: (1) both events
  I need to fire from Convex (`opportunity_surfaced`, `published`) already
  happen inside files with `"use node"` OR inside actions where `fetch` is
  available regardless of runtime — a raw HTTP call needs nothing else;
  (2) avoids adding a second server SDK with its own bundling/runtime-
  compatibility risk inside Convex's V8/Node action sandbox, which I can't
  fully verify without a live `npx convex dev` deployment in this
  environment; (3) keeps the Convex side dependency-free, matching "no new
  dependencies without stating why" — I can state why here: not needed.

- **Sentry DSN env vars use the existing repo convention**
  (`process.env.SENTRY_DSN` read directly, no typed Convex `env` app config)
  because there is no `convex.config.ts` in this repo and the existing
  precedent (`shared/xOAuth.ts` reading `process.env.X_CLIENT_ID` directly)
  is the established pattern here — introducing `defineApp({ env: {...} })`
  scaffolding would be an out-of-scope architectural change for an
  observability WP.

- **No live PostHog/Sentry dashboard exists in this environment** (no keys,
  no deployed Convex instance, no way to run an interactive OAuth/dashboard
  flow from this session). Verification is: (a) `tests/analytics.test.ts`
  proves the typed helpers no-op safely without keys and route events
  correctly through an injectable debug sink when keys/sink are present,
  and (b) `docs/observability.md` gives the exact PostHog funnel/insight
  definitions so the dashboard is reconstructable the moment keys are set.
  This PR does **not** claim a live dashboard was verified — it wasn't.

## Gotchas

- `@sentry/nextjs` v10's `withSentryConfig` options are `sourcemaps.disable`
  (not a top-level `disableSourcemaps` flag) and `telemetry` (boolean).
  Verified against the installed package's `.d.ts` before writing
  `next.config.ts` — the public docs prose doesn't always match the current
  major version's option names.
- `captureRouterTransitionStart` is not exported by the installed
  `@sentry/nextjs` version — skipped that optional instrumentation-client
  hook rather than guessing at an API that doesn't exist in this version.
- Convex mutations cannot call `fetch` (no external I/O in transactions) —
  `opportunity_surfaced` has to be captured from the calling action
  (`scannerActions.ts`), not from the `opportunities.upsertMany` mutation
  itself, even though that's where the actual inserts happen. Same
  reasoning applies to `published`: captured from `convex/publish.ts`'s
  `"use node"` action, not from the `drafts.markResult` internal mutation.
- Pre-existing `convex/crons.ts` uses `crons.weekly(...)`, which the current
  Convex guidelines say not to use (only `crons.interval`/`crons.cron`).
  Not touched — out of scope for this WP (not an observability concern, and
  changing cron scheduling is a behavior change, not instrumentation).
  Flagged in the PR under "Found, not fixed."
