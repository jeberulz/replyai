# WP40 — First-10 Beta Launch Gate

**Phase:** Launch hardening / Private Proof  
**Target:** ten owner-approved design partners this weekend  
**Branch:** `feat/wp40-first-10-beta-gate`  
**Process:** `docs/AGENT_PLAYBOOK.md` — one WP, one branch, one PR, sequential
stories, one commit per checked story  
**Risk tier:** high — auth, production secrets, external spend, X tokens,
schema, legal copy, and live integrations

## Objective

Move ReplyPilot from “deployed product with working demo flows” to a controlled,
observable, cost-bounded private beta for ten real X users.

The gate is green only when an allow-listed stranger can connect X, finish
onboarding, receive useful scanner opportunities, analyze/generate/save, and
use the human-approved publish/fallback flow without:

- entering a shared demo account;
- creating an account when not invited;
- causing uncapped X or LLM spend;
- relying on unconfigured observability or alert delivery;
- seeing junk onboarding/trend/angle labels;
- seeing developer-only environment or stale legal copy; or
- depending on a check that is red or absent from CI.

This is not a feature-expansion WP. It closes the launch gaps found in the
2026-07-10 production audit and proves the existing discovery-and-timing wedge
with real users.

## Product and process sources

Read before editing, in playbook order:

1. `PRD.md` — especially §§1–5, 9–10.
2. `AGENTS.md` — permanent auth, demo, X-restriction, observability, eval, and
   no-auto-publish constraints.
3. `docs/PRODUCT_STRATEGY.md` — §§4, 8–14 and the WP40 row.
4. `docs/GO_TO_MARKET_AND_BRAND_STRATEGY.md` — Private Proof cohort and exit
   criteria.
5. `docs/wp/RULINGS.md` — WP40 ruling.
6. `convex/_generated/ai/guidelines.md` before any Convex edit.
7. Relevant `node_modules/next/dist/docs/` guides before Next.js edits.
8. `design.md` before UI edits.

Current external constraints must be verified again at implementation time:

- X API pricing/usage: <https://docs.x.com/x-api/getting-started/pricing>
- X self-serve reply restrictions: <https://docs.x.com/x-api/posts/manage-tweets/integrate>

Do not copy a current dollar price into permanent product copy. The owner records
the current console price and approved caps in the private production inventory.

## Dependency and collision gate

At scaffold time the checkout is on `codex/fix-x-identity-onboarding`, with
uncommitted edits to `convex/users.ts`, `convex/schema.ts`, `src/app/actions.ts`,
and account/identity files. Those overlap WP40.

**Do not start WP40 implementation until that branch is either merged into
`main` or explicitly abandoned by the owner.** Then:

1. confirm the main checkout/worktree is clean;
2. branch `feat/wp40-first-10-beta-gate` from latest `main`;
3. preserve the checked-in WP40 stories/progress files; and
4. record the exact base SHA in `wp40-progress.md`.

No parallel implementation workers. Execute the stories in order. A separate
fresh-context reviewer/gate session is allowed after S8.

## Locked product decisions

These are inherited rulings, not implementation choices:

- Ten-user cohort = free/no-card design partners. Paid Stripe activation waits
  for the 50-user founder-beta gate.
- Production access mode = X-handle allowlist.
- Denied users are rejected after X identity is read but before any user/token
  persistence.
- Public production demo = disabled by default.
- Local/CI demo = deterministic, isolated, zero-key, and never paid-model-backed.
- Beta entitlement = additive and expiring; it is not `plan: "pro"` and not a
  Stripe subscription snapshot.
- Missing production spend caps = paid path disabled, never unlimited.
- Every publish remains tied to an explicit click on that exact text.

## Definition of done

WP40 is complete only when every item is evidenced in `wp40-progress.md`:

1. **Private access:** only the ten approved X handles can complete OAuth;
   denied users create no account/token/session and receive a clear private-beta
   message.
2. **Provisioning boundary:** the server-only user/session provisioning mutation
   rejects direct unauthenticated callers without a shared server secret.
3. **Safe demo:** production demo is inaccessible by default; local/CI demo is
   isolated and deterministic; no demo request can consume production Anthropic
   spend or expose another visitor's drafts/history.
4. **Truthful beta entitlement:** approved design partners receive time-bounded
   scanner/notification/briefing access without a Stripe Pro status; Settings
   shows beta access and no developer-only configuration copy.
5. **Spend protection:** all X-read and AI-spending entry points are metered;
   per-user/global daily X budgets, per-user hourly AI limits, and independent
   kill switches stop calls before spend; blocked states are user-visible and
   observable.
6. **Wedge-quality regression fixes:** onboarding seeds exclude stopwords;
   trend labels cannot be generic tokens such as “Deleted”/“Everyone”; suggested
   angles cannot emit “missing not angle”; replies never impersonate the target
   author; fixtures fail if any regression returns.
7. **Trust and accessibility:** the real support/operator details are present;
   privacy/terms reflect actual providers and self-serve controls; X disconnect
   removes stored authorization and safely handles scheduled work; draft rows
   are keyboard operable with visible focus and mobile-size targets.
8. **Production integrations:** PostHog and Sentry work in browser, Next.js, and
   Convex; VAPID push and Resend digest are configured; a real notification opens
   the intended opportunity/feed route. Variable values remain outside git.
9. **Green engineering gate:** high/critical dependency audit is green; tests do
   not discover nested `.worktrees`; typecheck, lint, unit tests, evals, security
   audit, extension build, production build, and Playwright critical flows at
   375/768/1280/1728 pass in CI.
10. **Green production gate:** owner-approved real-X smoke flow passes OAuth →
    onboarding → scanner → analysis → 3 replies/3 quotes → save/copy → explicit
    publish or documented X fallback → scheduled standalone post → reply-back
    tracker seed; offline draft, PWA install, push, export, delete, and disconnect
    checks are recorded.
11. **Rollout pack:** ten handles, onboarding-call checklist, feedback questions,
    daily metric review, spend review, incident/kill-switch steps, and rollback
    steps are ready. No private handle, email, key, DSN, or token is committed.
12. **Docs agree with reality:** `README.md`, `.env.example`, `AGENTS.md`,
    `docs/production-deployment.md`, `docs/observability.md`, strategy status,
    legal copy, and Phase 2 manual-gate notes match the shipped system.

## File boundary

### Owns / may create

- `src/lib/betaAccess.ts` — access-mode parsing and normalized allowlist checks.
- `shared/spendLimits.ts` — deterministic limit/budget decisions.
- `convex/spend.ts` and additive spend-ledger tables/indexes if needed.
- `scripts/beta-readiness.mjs` and its package script.
- `tests/betaAccess.test.ts`, `tests/spendLimits.test.ts`, focused eval fixtures.
- `docs/wp/wp40-stories.md`, `docs/wp/wp40-progress.md`.

### May touch, only for WP40 acceptance criteria

- Auth/provisioning: `src/app/api/auth/login/route.ts`,
  `src/app/api/auth/callback/route.ts`, `src/app/api/auth/demo/route.ts`,
  `src/lib/authSecurity.ts`, `src/lib/session.ts`, `convex/users.ts`,
  `convex/helpers.ts`, `convex/schema.ts`, generated Convex files.
- Entitlement/gates: `shared/billing.ts`, `shared/fairUse.ts`, `convex/billing.ts`,
  `convex/scanner.ts`, Settings and gate consumers. Do not alter Stripe webhook
  semantics except where required to keep beta entitlement separate.
- X/AI spend entry points: `src/lib/x.ts`, `src/lib/ai.ts`, `src/app/actions.ts`,
  `convex/scannerActions.ts`, `convex/outcomes.ts`,
  `convex/semanticActions.ts`, `convex/researchActions.ts`,
  `convex/onboardingConciergeActions.ts`, `convex/voiceDriftActions.ts`,
  `convex/briefingActions.ts`, and existing usage helpers. Edits must be limited
  to shared preflight/recording calls and clear blocked-state propagation.
- Wedge quality: `shared/onboardingConcierge.ts`, `shared/trends.ts`,
  `shared/semanticRelevance.ts`, `shared/evals.ts`, `shared/demoData.ts`,
  `evals/fixtures/**`, related focused tests, and the minimum prompt line in
  `src/lib/ai.ts` needed to separate replying user from target author.
- Trust/UI: `src/app/(app)/settings/page.tsx`, notification/settings components,
  drafts row/detail components, `src/app/privacy/page.tsx`,
  `src/app/terms/page.tsx`, `src/components/legal-page.tsx`, landing CTA/copy
  only where needed for private-beta access. Preserve Dark Chrome.
- Gates/config/docs: `.github/workflows/ci.yml`, `playwright.config.ts`,
  `playwright/**`, Vitest config, `package.json`, `package-lock.json`,
  `next.config.ts`, `.env.example`, `README.md`, `AGENTS.md`,
  `docs/production-deployment.md`, `docs/observability.md`,
  `docs/wp/PHASE2-CLOSEOUT.md`, `docs/PRODUCT_STRATEGY.md`.

### Do not touch

- Phase 3 platforms, teams, public API, or MCP.
- Browser-extension posting behavior; it remains read + deep-link only.
- Option count/category contract: exactly three per request plus generate more.
- Publish authorization semantics or any auto-publish path.
- Landing-page visual redesign; only access-state, CTA, trust, and support copy.
- Live Stripe product/price/webhook activation for the ten-user cohort.
- Destructive schema narrowing, production backfills, or existing user/token
  rewrites without a new owner-approved dry-run inventory.

## Data and security design constraints

- Schema additions are optional/additive first. Export and cascade-delete every
  new user-owned row in the same story.
- Spend ledgers store resource identifiers/counts and endpoint/source metadata,
  not tweet bodies, access tokens, prompt content, or secrets.
- X billing deduplication changes over time. Record both raw returned counts and
  locally unique resource counts; label all dollar estimates as estimates.
- Enforce limits before an external request wherever possible. If the final
  returned count crosses a cap, record it and suppress later calls; never throw
  away audit data.
- Auth provisioning secret, allowlist, spend caps, DSNs, VAPID keys, and Resend
  keys are server-only. Only the VAPID public key and approved public PostHog
  key reach the client.
- Denied beta identities must not persist X tokens even transiently.
- X disconnect must be explicit, authenticated, and confirmed. It removes local
  stored tokens, disables X-dependent background work, and explains any
  scheduled-draft consequence before the final click.
- External content remains delimited untrusted data and LLM outputs remain
  schema validated.

## Production environment contract

The implementation may rename variables only if `.env.example` and the
deployment runbook are updated in the same story. Expected shape:

### Vercel / Next.js

- `BETA_ACCESS_MODE=allowlist`
- `BETA_ALLOWED_X_HANDLES` (private; comma-separated normalized handles)
- `BETA_ACCESS_DAYS`
- `ENABLE_PUBLIC_DEMO=false`
- `CONVEX_AUTH_PROVISION_SECRET` (same value in Convex)
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPPORT_EMAIL` or a server-rendered equivalent
- `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`
- `POSTHOG_KEY`, `POSTHOG_HOST`
- `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`

### Convex production

- `CONVEX_AUTH_PROVISION_SECRET`
- X-read and AI kill switches
- per-user/global X unique-read caps
- per-user hourly analysis/generation limits
- current X unit-cost inputs used only for operator estimates
- `POSTHOG_KEY`, `POSTHOG_HOST`, `SENTRY_DSN`
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`
- `APP_URL`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`
- existing X/Anthropic/token-encryption secrets remain present

`beta-readiness` and progress evidence print names/presence only, never values.

## Production change gate

Before applying any environment value or production mutation, append a
names-only inventory to `wp40-progress.md`:

1. exact Vercel and Convex variable names to add/change/remove;
2. current and proposed enable/disable state, without values;
3. approved per-user/global caps and their worst-case daily-dollar estimate;
4. affected tables and whether existing rows change;
5. rollback action for each live switch;
6. owner-approved test accounts, browsers, email destination, and X post IDs,
   kept outside git when they identify a person.

The owner approves that inventory before execution. Create a restore-point tag
before any approved production-data rewrite. Environment-only changes still
need the inventory and rollback plan but do not require a data tag.

## Gate-10 rollout and metrics

Provision users in two batches: two internal/friendly accounts, then the other
eight only after 24 hours without an unresolved P0 incident or budget alarm.

For each user, the founder onboarding checklist covers:

- niche and primary goal;
- 5–10 watched accounts and 3–5 useful keywords;
- first voice profile review;
- one scanner → analysis → saved/copied reply session;
- notification opt-in/quiet hours;
- safety promise and X reply fallback;
- support/feedback route.

Daily operator review:

- access granted/denied counts;
- onboarding completion and first-value conversion;
- opportunity surfaced → opened → generated → copied/sent;
- median opportunity age at send;
- dismiss rate and bad-angle reports;
- no/minor-edit rate and reply-back outcomes when mature;
- X unique reads and estimated spend per active user;
- Anthropic tokens/cost per active user;
- Sentry errors, X errors, notification delivery/open rate;
- kill-switch state and remaining provider credit.

Private Proof exit criteria remain:

- 6/10 users would be disappointed if ReplyPilot disappeared;
- at least 30% of opened opportunities lead to copied/sent replies;
- at least three consented public or anonymized proof examples;
- no unresolved P0/P1 account-safety, privacy, billing, or spend incident.

## Required verification

Automated:

```bash
npm run typecheck
npm run lint
npm test
npm run evals
npm run security:audit
npm run extension:build
npm run build
npm run test:mobile
npm run beta:readiness -- --url=https://replyai-three.vercel.app
```

Manual production gate:

1. denied non-allowlisted OAuth creates no rows/tokens;
2. allowlisted OAuth receives expiring beta access;
3. `/api/auth/demo` is unavailable publicly while local zero-key demo passes;
4. real scanner results stay inside approved budgets and show useful angles;
5. analysis produces exactly 3 replies + 3 quotes with reasons;
6. copy/save/edit-distance tracking works;
7. explicit standalone publish succeeds; restricted reply offers X/standalone
   fallback; scheduling publishes only the approved text;
8. reply-back tracker is seeded and a controlled response is observed or the
   poller state is evidenced without waiting 48 hours;
9. push and digest arrive, respect quiet hours/cap, and open the correct route;
10. offline draft reconnect, PWA install, export, delete, and X disconnect pass;
11. PostHog receives browser/server/Convex events and Sentry receives safe
    synthetic browser/server/Convex test errors;
12. keyboard-only navigation reaches draft rows and primary actions with visible
    focus; no horizontal scroll at 375/768/1280/1728.

## Rollback / incident rule

If any P0 occurs — cross-user data exposure, unauthorized access, unexpected
publishing, token exposure, runaway spend, or inability to disable an external
path — immediately:

1. turn off X reads and AI generation with the production kill switches;
2. disable new OAuth admission;
3. leave existing drafts readable/exportable;
4. capture the Sentry/PostHog run identifiers without copying user content;
5. notify affected design partners through the approved support channel;
6. roll back the deployment/env change; and
7. do not resume invites until a fresh gate passes.

## PR handoff

The PR description must include:

- the WP40 §14 DoD copied verbatim;
- story-by-story evidence;
- production inventory approval timestamp (no secret values);
- links or IDs for PostHog/Sentry dashboards/events without private payloads;
- X/AI cap values and worst-case estimate approved by the owner;
- real-X/manual gate results;
- remaining moderate dependency advisories with upstream status;
- “Found, not fixed”; and
- explicit statement that Stripe charging remains off for Gate 10 and is a
  separate paid-50 gate.
