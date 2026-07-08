# Observability

Error tracking (Sentry) and product analytics (PostHog) for the north-star
funnel. See `docs/PRODUCT_STRATEGY.md` §11 (metrics & instrumentation) and
§14 WP4 for why this exists: the PRD's north star is "% of generated replies
used with no/minor edits per active user per week" — you can't see that
metric move without every step of the funnel emitting an event.

**No PostHog/Sentry project exists in this environment.** Everything below
is written so the dashboard described here becomes real the moment someone
sets the keys — this doc *is* the dashboard definition until then. What was
actually verified without live keys: `tests/analytics.test.ts` proves the
typed helpers no-op safely with no keys configured, and route events
correctly (name, distinct id, properties) through an injectable debug sink.

## Event catalog

Single source of truth: `src/lib/analytics/events.ts`. Every call site in
the app and in Convex functions imports event names and property shapes
from there — no ad-hoc event-name strings anywhere else.

| # | Event | Fired from | Distinct id | Key properties |
|---|---|---|---|---|
| 1 | `opportunity_surfaced` | `convex/scannerActions.ts` (`scanUser`, after `opportunities.upsertMany`) | user id | `count` (new opportunities this scan) |
| 2 | `opportunity_opened` | `src/components/app/feed-scanner.tsx` (row/detail select) | user id | `opportunityId`, `source`, `score` |
| 3 | `generation_requested` | `src/app/actions.ts` (`continueAnalysisAction`, `generateMoreAction`) | user id | `analysisId`, `trigger` (`"initial"` \| `"more"`), `kind` |
| 4 | `option_selected` | `src/components/app/option-card.tsx` (copy) + `src/app/actions.ts` (`saveDraftAction`, `publishAction`) | user id | `replyId`, `kind`, `category`, `action` (`"copied"` \| `"saved"` \| `"published"`), `editBucket`, `editDistanceNormalized` |
| 5 | `draft_saved` | `src/app/actions.ts` (`saveDraftAction`) | user id | `analysisId`, `replyId`, `kind` |
| 6 | `published` | `convex/publish.ts` (`run`, every successful branch incl. demo mode) | user id | `draftId`, `kind`, `publishMode`, `scheduled`, `editBucket`, `editDistanceNormalized` |

Distinct id is always the Convex `users._id` string — never the session
token (a bearer credential with no reason to also hand it to a third-party
vendor).

### Design notes (see `docs/wp/wp04-progress.md` for the full reasoning)

- **`opportunity_surfaced` is a per-scan aggregate**, not one event per
  tweet. PostHog funnels are computed per `distinct_id` over an ordered
  sequence of event *presence* — one event per user per scan with a `count`
  property is exactly what a "did this user get opportunities this week"
  funnel step needs, without multiplying event volume by scan batch size.
- **`option_selected` fires from three call sites** (copy, save-draft,
  publish) with one event name and an `action` property, rather than three
  event names — the funnel step ("did the user commit to an option") stays
  unambiguous; `action` is there for breakdown analysis.
- **Edit-extent metadata** now uses WP20's real observed edit distance:
  `editBucket` (`no_edit` / `minor_edit` / `major_edit`) plus
  `editDistanceNormalized`. This keeps funnel breakdowns tied to the PRD's
  actual north-star definition instead of the old boolean proxy.

## PostHog setup

1. Create a PostHog project (self-hosted or PostHog Cloud). Note the
   project API key and host.
2. Set env vars:
   - `.env.local` (Next.js): `NEXT_PUBLIC_POSTHOG_KEY`, optionally
     `NEXT_PUBLIC_POSTHOG_HOST` (defaults to `https://us.i.posthog.com`).
     `POSTHOG_KEY` and optionally `POSTHOG_HOST` for the server-side
     adapter — PostHog projects use the same key for both client and server
     capture, so this is usually the same value duplicated across the two
     names (`NEXT_PUBLIC_*` is what actually reaches the browser bundle;
     Next.js does not expose non-`NEXT_PUBLIC_` vars to client code).
   - Convex (separate env store — mirror the pattern already used for
     `X_CLIENT_ID`/`X_CLIENT_SECRET`):
     ```bash
     npx convex env set POSTHOG_KEY <key>
     npx convex env set POSTHOG_HOST <host>   # optional
     ```
3. With no keys set anywhere, every event call is a no-op — the app must
   keep working exactly as before (AGENTS.md: demo mode never breaks).

### Funnel insight ("North star funnel")

In PostHog: **Insights → New insight → Funnel**. Add steps in this exact
order:

1. `opportunity_surfaced`
2. `opportunity_opened`
3. `generation_requested`
4. `option_selected`
5. `draft_saved` **or** `published` (see note below)
6. `published`

Note on step 5: not every option goes through `draft_saved` — many are
published directly. If PostHog's "any of these events" step grouping is
available, group `draft_saved` OR `published` as step 5 and keep `published`
as the final step 6 (so a direct-publish path still counts sending, without
forcing every user through the draft step). If step grouping isn't
convenient, a simpler 5-step funnel (drop `draft_saved` entirely, since
`published` is the true terminal event) is a reasonable substitute.

Settings:
- **Conversion window:** 7 days, matching the north star's "per active user
  per week" framing (§11). For a tighter view of the reply-timing wedge
  itself (docs/PRODUCT_STRATEGY.md §5.5 "golden-15"), a second funnel with a
  2-hour window over steps 2→6 is a useful companion, not a replacement.
- **Breakdown:** by `source` (from `opportunity_opened`) to see which feed
  source converts best, and by `action` (from `option_selected`) to see
  copy vs. save vs. direct-publish behavior.

### Companion insights

- **North-star quality breakdown:** Trend of `option_selected` or `published`
  events broken down by `editBucket`, with `no_edit + minor_edit` treated as
  the north-star numerator and `major_edit` as the counter-signal.
- **Opportunity volume:** Sum of `count` on `opportunity_surfaced`, daily,
  per user — a scanner health/volume check.
- **Time-to-send:** Time between `opportunity_opened` and `published` for
  matching sessions — the PRD's "time from URL to copy or send" supporting
  metric (§5 success metrics).

## Sentry setup

1. Create a Sentry project (Next.js platform). Note the DSN.
2. Env vars:
   - `.env.local`: `SENTRY_DSN` (server/edge), `NEXT_PUBLIC_SENTRY_DSN`
     (client — same DSN value, just exposed under the `NEXT_PUBLIC_` prefix
     Next.js requires for browser code).
   - Optional, for source-map upload in CI (not configured in this repo —
     `next.config.ts` disables upload outright since no token exists here):
     `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`.
   - Convex: `npx convex env set SENTRY_DSN <dsn>`.
3. Coverage:
   - **Next.js** — `@sentry/nextjs` auto-instruments server actions, route
     handlers, and the client (`src/instrumentation.ts`,
     `src/instrumentation-client.ts`, `src/app/global-error.tsx`). No DSN
     configured → the SDK is a documented no-op; nothing breaks.
   - **Convex** — `convex/lib/sentry.ts` is a small `fetch`-based client
     against Sentry's store ingestion endpoint (chosen over `@sentry/node`
     — see `docs/wp/wp04-progress.md` for why). Wired into the catch blocks
     of `scannerActions.scanUser`, `researchActions.runResearch`,
     `semanticActions.classifyBatch`, and `publish.run`. It sends a
     minimal-but-valid event (type/message/stack-as-extra) — it does not
     parse the stack into Sentry's frame format, so the stack-trace UI
     won't render, but errors are captured, grouped by type+message, and
     searchable.

## Verifying this without live keys

1. `npm test` — `tests/analytics.test.ts` proves the helpers no-op safely
   and route events correctly through a debug sink.
2. Read each call site listed in the event catalog table above and confirm
   it fires at the right moment relative to the user/system action.
3. Once real keys exist: set them, exercise the three critical flows
   (analyze→generate→save, feed→opportunity→draft, draft→publish) in demo
   mode and in real mode, then check PostHog's **Activity** tab for the six
   event names arriving with the right properties, and build the funnel
   insight per the steps above.
