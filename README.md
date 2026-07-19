# ReplyPilot AI

Find the conversations worth joining on X — and reply in your own voice before
the window closes.

Growth on X comes from replies and quote tweets, not original posts. ReplyPilot
surfaces high-opportunity tweets early (discovery + timing), analyzes the
conversation for the angles nobody has taken, and drafts 3 replies / 3 quote
tweets that already sound like you. A human clicks send on every single post —
always.

## Features

- **Analyze tweet** — paste a URL, get the thread context, author profile,
  engagement metrics, top replies, image alt-text, and a breakdown: summary,
  author stance, opinions already voiced, and the missing angles.
- **Conversation score** — a 0–100 "worth replying" heuristic with a
  plain-language reason, built from reply timing, growth velocity, audience
  size, and topic relevance. No fake-precision engagement predictions.
- **Generate replies & quote tweets** — 3 options per request (not 10), each
  with a category (contrarian, educational, story, …) and a short reason it's
  worth sending. A "generate more" button adds 3 clearly-different options.
- **Voice profiles & training** — measured from your recent tweets
  (sentence length, formatting, emoji, punctuation, common phrases, reading
  level) or defined manually. Switchable per tweet; every generation runs
  through the selected profile.
- **Rewrite** — shorter, funnier, more controversial, more educational,
  stronger hook, simpler, more human.
- **Feed scanner** — a lightweight Convex dispatcher checks indexed background
  eligibility every 15 minutes, then applies the configured per-user cadence
  before scanning live accounts. Demo accounts scan only when requested, so
  sample data cannot consume recurring backend usage. Results include author,
  reply count, velocity, and a suggested angle. Suggestions only: publishing
  always requires an explicit click on that specific text.
- **Hot-window notifications (Pro)** — capped web push + optional email digest
  when young opportunities cross your threshold, including a golden-15 lane for
  watched/list authors. Quiet hours (default 22:00–08:00 UTC) and a 5/day cap.
  No auto-publish; no fake engagement percentages. Optional Convex env:
  `VAPID_*` (all three), `APP_URL` (digest absolute links), `RESEND_*`.
- **Research curator (Pro)** — a monthly Convex cron prunes quiet suggested
  accounts and surfaces up to 5 replacement candidates with plain-language
  reasons. Idempotent per UTC calendar month. Suggest-only: every watch change
  needs an explicit human Watch/Pass click — never auto-watch, never auto-publish.
- **Publishing & scheduling** — publish now or schedule for later via Convex
  scheduled functions. Statuses update live on the dashboard (Convex
  reactivity, no polling).
- **Usage tracking** — tokens, requests, analyses, generations per month, plus
  the north-star metric: % of generated replies published with no edits.

## Stack

Next.js 16 (App Router, Server Actions) · React 19 · TypeScript · Tailwind 4 ·
shadcn-style components · Convex (data, reactivity, crons, scheduled publish) ·
Anthropic API (structured outputs + prompt caching) · X API v2 (OAuth 2.0 PKCE).

## Getting started

```bash
npm install

# 1. Start Convex (creates a free dev deployment and writes .env.local)
npx convex dev

# 2. In another terminal
cp .env.example .env.local   # fill in NEXT_PUBLIC_CONVEX_URL if not set by the CLI
npm run dev
```

Open http://localhost:3000 and click **Try the demo**.

### Demo mode (no keys required)

The app is fully testable without any external keys:

| Missing key | Fallback |
|---|---|
| `X_CLIENT_ID`/`X_CLIENT_SECRET` | Demo login + deterministic sample tweets/feed |
| `ANTHROPIC_API_KEY` | Deterministic template generation |

Convex is the only hard requirement (`npx convex dev` is free and local to your
account). Add real keys to `.env.local` and the same flows switch to live X
data and Claude-generated analysis with no code changes.

Demo scanner results are deterministic and on-demand. Demo identities are
never eligible for the recurring background scanner cron.

### Real integrations

- **Anthropic** — set `ANTHROPIC_API_KEY`. Uses structured outputs (zod
  schemas) and marks the shared tweet-context block with `cache_control` so
  analyze → generate → rewrite reuse the cached prefix.
- **X OAuth** — create an app at developer.x.com, enable OAuth 2.0, set the
  callback to `{NEXT_PUBLIC_APP_URL}/api/auth/callback`, and set
  `X_CLIENT_ID`/`X_CLIENT_SECRET`. Publishing posts via `POST /2/tweets` with
  the user's token.
- **X token security** — live X OAuth flows also require server-only token
  hardening secrets. Set `X_TOKEN_ENCRYPTION_KEY` in Convex env so stored
  access/refresh tokens can be encrypted, and set the same
  `CONVEX_SERVER_TOKEN_ACCESS_SECRET` value in both `.env.local` and Convex so
  Next.js server actions can request decrypted tokens from Convex:

  ```bash
  npx convex env set X_CLIENT_ID <value>
  npx convex env set X_CLIENT_SECRET <value>
  npx convex env set X_TOKEN_ENCRYPTION_KEY <long-random-value>
  npx convex env set CONVEX_SERVER_TOKEN_ACCESS_SECRET <long-random-value>
  ```

  Without these secrets, demo mode still works, but live X OAuth/publish paths
  intentionally fail closed instead of storing or returning plaintext tokens.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Next.js dev server |
| `npx convex dev` | Convex dev deployment (functions, crons, data) |
| `npm run build` | Production build |
| `npm test` | Unit tests (scoring, voice analysis, demo data, eval gate) |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript, app + convex |
| `npm run evals` | Deterministic eval gate — guardrails + voice fidelity vs `evals/fixtures/`, no keys |
| `npm run security:audit` | Convex auth/token surface audit + high/critical dependency audit |
| `npm run evals:llm` | Optional LLM-judged eval pass — needs `ANTHROPIC_API_KEY`, skips without it |
| `npm run extension:build` | Build the Chrome MV3 extension into `extension/dist` (load unpacked) |

## Architecture notes

- **Sessions** — X OAuth 2.0 with PKCE handled by route handlers
  (`src/app/api/auth/*`). Sessions live in a Convex `sessions` table; the token
  is stored in an httpOnly cookie and passed to Convex queries/mutations, which
  authorize every call server-side.
- **Reactivity** — the dashboard, feed, voice, and results screens subscribe
  via `useQuery`; scanner results and scheduled-publish status updates stream
  in live. No polling layer.
- **Scanner cost control** — the user-visible scanner toggle is separate from
  indexed background eligibility. Demo identities are always excluded from
  background fan-out. Operators can raise the live-account cadence floor
  without a redeploy by setting `SCANNER_MIN_CADENCE_MINUTES` in Convex; use
  `1440` for a once-daily safety floor on idle side-project deployments.
- **Shared logic** — `shared/scoring.ts` (worth-replying heuristic, URL
  parsing) and `shared/voice.ts` (voice measurement) are imported by both the
  Next.js app and Convex functions, and unit-tested in `tests/`.
- **Eval gate & CI** — `.github/workflows/ci.yml` is CI. Its required job runs
  typecheck/lint/test/build with **no external keys**. `shared/evals.ts` holds
  the deterministic regression checks — generation guardrails (3 options,
  distinct/valid categories, a real reason, weighted ≤280 chars, no
  engagement-bait, no fake-precision scores) and a voice-fidelity metric built
  on `shared/voice.ts` — run against readable fixtures in `evals/fixtures/`
  (synthetic, no real user data). A regression fails a fixture and fails CI. The
  deeper LLM-judged pass is optional and key-gated (`npm run evals:llm`); it
  never blocks the merge gate. Run `npm run evals` locally for the deterministic
  gate.
- **`convex/_generated`** — checked in (standard Convex practice); regenerated
  automatically by `npx convex dev`.
- **Browser extension** — `extension/` is a Chrome MV3 package (see
  `extension/README.md`). It shows a read-only conversation-score badge on
  x.com status pages and deep-links to
  `/dashboard?url=…&auto=1`. It never posts, never fills X's composer, and
  never automates replies.

## Platform risk (X ToS)

Automated engagement can get accounts suspended, which ends user trust faster
than any competitor could. Design decisions, permanent:

- A human clicks send on **every** post. There is no auto-publish path in the
  codebase; the scanner only suggests.
- Scheduling counts as explicit approval of that specific text at that time.
- The browser extension is **read + deep-link only** — no DOM automation of
  posting on X.
- Review X's current API terms on automated monitoring before shipping the
  feed scanner to production; reading timelines requires a paid API tier.

## Monetization

Deliberately not built yet — per the PRD the pricing model (usage credits vs.
flat subscription vs. freemium) must be decided before launch since it shapes
which features sit behind a paywall. Usage is already metered per user per
month (`usage` table) so any of the three options can be wired up quickly.

## Success metrics (instrumented)

- **North star:** % of generated replies used with no edits
  (`usage.stats.noEditRate` — manual edits set `editedBeforeSend`, AI rewrites
  don't).
- Time from URL to copy/send (client flows are single-screen).
- Published count and reply-back ratio (publish results stored per draft;
  reply-back tracking is a natural next step once real X reads are enabled).

## Observability

Error tracking (Sentry) and product analytics (PostHog) for the north-star
funnel — see `docs/observability.md` for the full event catalog, PostHog
funnel/insight definitions, and setup steps. Both are optional: with no keys
configured (Next.js `.env.local` and Convex env, mirroring the X OAuth
pattern above), every event/error call is a no-op and the app runs exactly
as before. The typed event helper lives in `src/lib/analytics/` (one source
of truth for event names — `events.ts` — with separate server/client
adapters); the Convex-side equivalent is `convex/lib/analytics.ts` and
`convex/lib/sentry.ts`.
