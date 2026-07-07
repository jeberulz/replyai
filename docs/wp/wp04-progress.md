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
- `captureRouterTransitionStart` isn't exported from `@sentry/nextjs`'s
  shared type entrypoint (`index.types.d.ts`) — only from its
  browser-specific `client/index.d.ts`, which is what actually resolves at
  `import * as Sentry from "@sentry/nextjs"` inside
  `instrumentation-client.ts` (package.json `exports` conditions pick the
  client build there). Confirmed by running `next build`: it emitted an
  explicit "ACTION REQUIRED" warning asking for this export, which is the
  SDK's own way of flagging the gap — added it once the build surfaced it.
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

## Demo-mode verification — what I did and did not do

The shared checkout's `.env.local` (outside this worktree, not committed)
points at a real Convex dev deployment with real `ANTHROPIC_API_KEY` and
`X_CLIENT_ID`/`X_CLIENT_SECRET` already configured — i.e. it is not in demo
mode, and I have no way to check or control what env vars that deployment's
Convex *server* side has been given via prior `npx convex env set` calls.
Copying it into this worktree and clicking through the running app would
risk spending real Anthropic credits and potentially attempting a real X
publish against a live shared dev account — not something to do
incidentally while verifying instrumentation.

I could not start a fresh, isolated demo-only Convex deployment either:
`npx convex dev` requires an interactive browser login on first run, which
isn't available in this non-interactive environment.

What I did instead, and what the PR states plainly:
- Full check suite (`typecheck`, `lint`, `test`, `build`) green after every
  story, including a real `next build` that proves the Sentry wiring
  doesn't break a production build with zero keys set.
- `tests/analytics.test.ts` exercises the actual no-op behavior of every
  new helper with no keys configured — this *is* demo mode for the
  analytics layer specifically (the thing most likely to almost-work
  differently with vs. without keys).
- Manual review of every new event call site confirms: (a) none are gated
  behind `!isDemo` — the demo branches (`convex/publish.ts`'s `isDemo`
  short-circuit, `scannerActions.ts`'s `collectDemoCandidates` path) flow
  through the exact same event-firing code as the real branches; (b) every
  `trackServer`/`trackClient`/`trackConvexEvent`/`captureServerException`/
  `captureConvexException` call is internally try/catch-wrapped and returns
  `void`/`Promise<void>` — none can throw synchronously into a calling
  action, mutation, or component and break the flow it's attached to.

I am not claiming a live dashboard or a live click-through was verified —
it wasn't, for the reasons above.

## Bug caught in self-review (before the PR was opened)

The first version of the `published` event's `scheduled` property computed
`draft.scheduledFor > draft.createdAt + 60_000` inside `convex/publish.ts`
as a heuristic to distinguish a user-scheduled send from an immediate one
(`savedDrafts.scheduledFor` is always populated, even for immediate sends —
see the "Convex mutations cannot call fetch" gotcha above for why this
couldn't just be a stored field instead). That heuristic is wrong for
`drafts.retryAsStandalone`: it patches `scheduledFor: Date.now()` on an
*old* draft whose `createdAt` is from whenever the original (now-failed)
publish attempt was created — often well over a minute earlier — so a
same-second retry-after-failure would have been misreported as
`scheduled: true`.

Fixed by threading an explicit `scheduled: boolean` through the scheduler
call itself instead of inferring it after the fact: `drafts.publish` passes
`scheduled: true` on the `runAt` (future) branch and `false` on the
`runAfter(0, …)` (immediate) branch; `retryAsStandalone` passes `false`
(it's always an immediate retry). `convex/publish.ts`'s `run` action takes
`scheduled` as a required argument instead of computing it. This is an
additive argument on an internal Convex action, not a schema change — still
within the WP4 boundary ("schema changes: none should be needed").
