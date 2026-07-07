# WP4 — Observability: stories

Source: `docs/PRODUCT_STRATEGY.md` §14 row WP4. DoD: "North-star funnel
visible on a dashboard." Orchestrator's technical interpretation (see WP4
assignment): every funnel step emits a typed event; Sentry captures errors
on both Next.js and Convex sides where supported; since no live PostHog/
Sentry keys exist in this environment, ship a checked-in dashboard
definition doc so the funnel is visible immediately once keys are set;
verify events fire via a debug/no-op sink, not a live dashboard screenshot.

Funnel steps (derived from the PRD flows: paste/analyze → generate →
option → draft/publish, and the feed → opportunity → analyze flow):

1. `opportunity_surfaced` (scanner writes new opportunities)
2. `opportunity_opened` (user opens one to review)
3. `generation_requested` (analysis pipeline runs generation, incl. "generate more")
4. `option_selected` (user copies / saves / publishes a specific option — the
   PRD's "time from URL to copy or send" supporting metric)
5. `draft_saved`
6. `published`

Plus edit-extent metadata (`editedBeforeSend`) attached to `option_selected`
and `published` where available today — no edit-distance buckets (that's
WP20).

## Stories

- [x] S1 — Typed event catalog module
  Acceptance: `src/lib/analytics/events.ts` exports a single source of truth
  for event names (`FUNNEL_EVENTS` / `AnalyticsEvent` union) and a
  `properties` type per event. No side effects, importable from both
  Next.js (`@/lib/analytics/events`) and Convex (relative path) without
  pulling in any Node- or browser-only code.

- [x] S2 — Server-side track/capture adapter
  Acceptance: `src/lib/analytics/server.ts` exports `trackServer(event,
  distinctId, properties)` backed by `posthog-node`, and
  `captureServerException(error, context)` backed by `@sentry/nextjs`. Both
  no-op cleanly (no throw, no network call) when
  `POSTHOG_KEY`/`SENTRY_DSN` are unset. A debug sink can be injected for
  tests.

- [x] S3 — Client-side track/capture adapter
  Acceptance: `src/lib/analytics/client.ts` exports `initAnalyticsClient()`,
  `identifyClient(userId)`, `trackClient(event, properties)` backed by
  `posthog-js`. No-ops when `NEXT_PUBLIC_POSTHOG_KEY` is unset. Never throws
  if called before init.

- [x] S4 — Sentry Next.js wiring
  Acceptance: `@sentry/nextjs` added; `next.config.ts` wrapped with
  `withSentryConfig` (source map upload disabled — no auth token in this
  env); `src/instrumentation.ts` (server/edge init + `onRequestError`),
  `src/instrumentation-client.ts` (client init + calls
  `initAnalyticsClient()`), `src/app/global-error.tsx` added. `npm run
  build` succeeds with zero Sentry/PostHog env vars set.

- [x] S5 — Convex-side event + error capture helper
  Acceptance: `convex/lib/analytics.ts` (fetch-based PostHog capture,
  no-ops without `POSTHOG_KEY`) and `convex/lib/sentry.ts` (fetch-based
  Sentry Store API capture, no-ops without `SENTRY_DSN`) added as plain
  modules (no new npm deps, no `"use node"` requirement — both use `fetch`,
  available in Convex's default runtime). Existing catch blocks in
  `convex/scannerActions.ts`, `convex/researchActions.ts`,
  `convex/semanticActions.ts`, `convex/publish.ts` call
  `captureConvexException` additively (no logic change).

- [x] S6 — Funnel: `opportunity_surfaced`
  Acceptance: `convex/opportunities.upsertMany` returns `{ inserted,
  updated }` counts (additive return-value change only). The scan action in
  `convex/scannerActions.ts` fires `opportunity_surfaced` with `{ count }`
  once per user scan when `inserted > 0`.

- [x] S7 — Funnel: `opportunity_opened` + `generation_requested`
  Acceptance: `opportunity_opened` fires client-side when a feed row/detail
  is opened (`src/components/app/feed/opportunity-row.tsx`,
  `.../opportunity-detail.tsx` or their shared selection handler in
  `src/components/app/feed-scanner.tsx`). `generation_requested` fires
  server-side in `src/app/actions.ts` (`continueAnalysisAction` before
  Stage 2 generation, `trigger: "initial"`; `generateMoreAction`, `trigger:
  "more"`).

- [x] S8 — Funnel: `option_selected` + `draft_saved`
  Acceptance: `option_selected` fires on copy (client,
  `src/components/app/option-card.tsx`), on `saveDraftAction` and
  `publishAction` (server, `src/app/actions.ts`), tagged with `action:
  "copied"|"saved"|"published"` and `editedBeforeSend` when known.
  `draft_saved` fires in `saveDraftAction`.

- [x] S9 — Funnel: `published`
  Acceptance: `convex/publish.ts` fires `published` on every successful
  branch (including the demo-mode short-circuit) with `publishMode`,
  `scheduled`, and `editedBeforeSend` (looked up via an additive field on
  `drafts.getForPublish`).

- [ ] S10 — Dashboard definition doc + env docs
  Acceptance: `docs/observability.md` specifies exact PostHog funnel/insight
  definitions (event names, properties, step order, breakdowns) and Sentry
  project setup notes. `.env.example` documents new env vars.
  `AGENTS.md`/`README.md` updated per playbook §7 doc-drift rule.

- [ ] S11 — Debug-sink verification tests
  Acceptance: `tests/analytics.test.ts` asserts (a) `trackServer`/
  `trackClient`/`captureServerException` no-op without keys (no throw, sink
  not called), and (b) with an injected debug sink, calling `trackServer`
  routes the exact event name + properties through — this is the "assert
  via a debug/no-op sink in demo mode" verification the orchestrator asked
  for, since a live PostHog dashboard can't be checked in this environment.
