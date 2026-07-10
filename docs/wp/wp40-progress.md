# WP40 Progress — First-10 Beta Launch Gate

Append-only implementation log. Record decisions, verification, dry-run
inventories, dead ends, and reviewer findings. Never record a secret value,
private invite handle/email, OAuth token, DSN, or user content.

## 2026-07-10 — Scaffold

- Source: 2026-07-10 strategy-to-production audit of
  `https://replyai-three.vercel.app` plus repository, Vercel variable names,
  Convex production variable names, official X pricing/reply restrictions, and
  local gates.
- Product ruling recorded in `docs/wp/RULINGS.md`: ten no-card design partners;
  private allowlist; public production demo off; additive expiring beta
  entitlement; production spend controls fail closed; secrets stay out of git.
- Gate-10 program brief: `docs/wp/WP40-FIRST-10-BETA-LAUNCH-GATE.md`.
- Story checklist: `docs/wp/wp40-stories.md`.
- Launch blockers carried into stories: shared/unlimited production demo;
  unbounded/unmetered X reads; missing PostHog/Sentry/VAPID/Resend production
  configuration; high-severity dependency audit failure; responsive suite not
  required in CI; junk onboarding/trend/angle labels; target-author identity
  confusion; unrelated legal contact/stale privacy; developer-only Settings
  copy; no X disconnect; non-semantic clickable draft row; incomplete Phase 2
  manual gate; no recorded real-X production smoke.
- Start blocker: current checkout is `codex/fix-x-identity-onboarding` with
  uncommitted overlapping auth/schema/action changes. WP40 must branch from a
  clean latest `main` only after that work is merged or explicitly abandoned.
- No implementation or production mutation performed by the scaffold author.

## Required start entry

The first implementation worker appends:

- clean base SHA and branch;
- result of the identity-branch merge/abandon decision;
- initial full-check output;
- current high/moderate audit paths;
- names-only current Vercel/Convex variable inventory;
- tables/row counts affected by proposed additive schema work; and
- owner-input status (allowlist, support/operator details, caps, providers,
  smoke-test accounts/posts) without recording private values.

## 2026-07-10 — WP40-S1 start + security/dependency gate

- Branch/base: `feat/wp40-first-10-beta-gate` in
  `/Users/jeberulz/Documents/AI-projects/replyai-wp40`, based on clean
  `origin/main` SHA `655998844c2f3b2eefb62360d038d9ec51bfdbd9`.
- Identity-branch blocker: resolved before WP40 implementation. Latest
  `origin/main` includes merge PR #54 from `codex/fix-x-identity-onboarding`;
  the dirty original checkout was left untouched.
- Preserved scaffold artifacts from the blocked checkout onto this branch:
  WP40 brief, stories, progress log, WP40 ruling, Product Strategy WP40 row,
  GTM strategy, and production deployment runbook. No production mutation
  performed.
- Initial gate output for the branch after S1:
  - `npm run typecheck` — passed.
  - `npm run lint` — passed with four existing generated Convex
    `eslint-disable` warnings and no errors.
  - `npm test` — passed: 48 files passed, 1 skipped; 434 tests passed,
    1 skipped.
  - `npm run security:audit` — passed: 104 public Convex functions checked,
    3 allow-listed.
  - `npm run build` — passed with Next.js 16.2.10 / Turbopack.
  - `npm audit --audit-level=high` — passed.
- Current high/moderate audit paths:
  - High severity: none. The previously recorded high-severity
    `@vercel/config` / `path-to-regexp` path is absent on this base.
  - Moderate: `postcss <8.5.10` via `node_modules/next/node_modules/postcss`
    under `next@16.2.10`; npm reports the only automatic fix as
    `npm audit fix --force`, which would install `next@9.3.3` and break the
    app. Exposure is CSS stringification inside Next's vendored PostCSS path.
    Upstream status: advisory remains open for the installed Next package
    range; no safe non-breaking package-only fix is available in the current
    audit output. S1 ruling: do not force the breaking downgrade; keep the
    advisory documented and continue to block on high/critical findings.
- Vitest worktree proof: added `vitest.config.ts` excluding
  `**/.worktrees/**`. A temporary deliberately failing test under
  `.worktrees/vitest-proof/tests/ignored.test.ts` was ignored by official
  `npm test`; the run still reported the same 49 test files. Temporary files
  were removed.
- Names-only environment inventory found in repo config and env docs:
  `ANTHROPIC_ANALYZE_MODEL`, `ANTHROPIC_API_KEY`,
  `ANTHROPIC_BRIEFING_MODEL`, `ANTHROPIC_GENERATE_MODEL`, `ANTHROPIC_MODEL`,
  `ANTHROPIC_ONBOARDING_MODEL`, `ANTHROPIC_RESEARCH_MODEL`,
  `ANTHROPIC_SEMANTIC_MODEL`, `ANTHROPIC_VOICE_MODEL`, `APP_URL`,
  `CONVEX_SERVER_TOKEN_ACCESS_SECRET`, `NEXT_PUBLIC_APP_URL`,
  `NEXT_PUBLIC_CONVEX_URL`, `NEXT_PUBLIC_POSTHOG_HOST`,
  `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_SENTRY_DSN`,
  `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `POSTHOG_HOST`, `POSTHOG_KEY`,
  `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `SENTRY_DSN`,
  `STRIPE_PRO_PRICE_ID`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
  `VAPID_PRIVATE_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_SUBJECT`, `X_CLIENT_ID`,
  `X_CLIENT_SECRET`, `X_PUBLISH_NATIVE_QUOTES`. Convex typed env currently
  declares `STRIPE_PRO_PRICE_ID`, `STRIPE_SECRET_KEY`, and
  `STRIPE_WEBHOOK_SECRET`.
- Existing schema table inventory on this base: `users`, `accountIdentities`,
  `sessions`, `xTokens`, `voiceProfiles`, `projects`, `tweetAnalyses`,
  `generatedReplies`, `savedDrafts`, `variantGroups`, `replyOutcomeTrackers`,
  `usage`, `opportunities`, `scannerSettings`, `modelEvals`,
  `cachedResponses`, `researchRuns`, `researchProfiles`,
  `notificationSettings`, `pushSubscriptions`, `notificationAlerts`,
  `notificationDailyCounts`, `briefingSettings`, `briefingRuns`,
  `composeRuns`, `authors`, `trendRuns`, `voiceDriftRuns`,
  `onboardingConciergeRuns`.
- Tables/row counts affected by S1: no schema or production data changes;
  0 rows affected. Future additive schema candidates for S3/S5 are beta
  entitlement and spend-ledger rows; no live counts were queried or changed.
- Owner-input status: not supplied in git and not recorded here. Blocking
  production-gate inputs remain the private allowlist handles, real
  support/operator details, approved X/AI caps, observability projects,
  notification sender, and owner-controlled smoke-test accounts/posts.
- Dead end: `npx vitest --showConfig` is not supported by Vitest 4.1.9 in this
  repo, so config verification used the temporary failing-test proof above.

## 2026-07-10 — WP40-S2 responsive critical-flow suite

- Converted Playwright from a single hard-coded 375px mobile run to a required
  Chromium matrix at 375, 768, 1280, and 1728 widths. The same feed,
  analysis, and draft/schedule flow runs in each project and checks for
  horizontal overflow at list, detail, and handoff surfaces.
- CI now installs Chromium with Playwright, runs `npm run test:mobile` in the
  required `checks` job, and uploads `output/playwright` / `playwright-report`
  artifacts on failure.
- CI Playwright environment uses the public Convex dev deployment URL only:
  `NEXT_PUBLIC_CONVEX_URL` name/value is present in workflow config, with no
  X, Anthropic, PostHog, Sentry, VAPID, Resend, token, or DSN secrets. This
  keeps the suite zero external-key while S4 still owns demo isolation from
  shared state.
- Added keyboard activation coverage for opportunity and draft rows. Rows now
  expose `role="button"`, `tabIndex=0`, accessible labels, Enter/Space
  activation, and visible focus rings.
- The matrix caught two real target-size regressions:
  - Chat composer icon-only Analyze action measured 28px wide; fixed with a
    44px minimum target.
  - Generated-option Copy/Schedule/publish actions measured 28px tall; fixed
    option actions and schedule dialog buttons with 44px minimum targets.
- Verification:
  - `npm run typecheck` — passed.
  - `npm run lint` — passed with the existing generated Convex
    `eslint-disable` warnings and no errors.
  - `npm test` — passed: 48 files passed, 1 skipped; 434 tests passed,
    1 skipped.
  - `NEXT_PUBLIC_CONVEX_URL=... npm run test:mobile` — passed: 12 tests across
    4 viewport projects.
  - `npm run security:audit` — passed.
  - `npm run build` — passed.
- Dead end / dependency note: running the matrix with no Convex URL fails today
  because `/api/auth/demo` and server session lookup require Convex. S4 owns
  isolating or disabling production demo and making local/CI zero-key demo
  deterministic; S2 only wires the current real app flow into CI.

## 2026-07-10 — WP40-S3 private beta access + provisioning boundary

- Added `src/lib/betaAccess.ts` for X-handle normalization, access-mode parsing,
  allowlist checks, and expiring beta-entitlement decisions. Production defaults
  to `allowlist`; missing/empty allowlist in allowlist mode fails closed.
- OAuth callback now fetches the X identity, evaluates the normalized handle,
  and rejects denied identities with `?error=private_beta` before calling Convex
  or persisting any user/session/token row. OAuth verifier/state cookies are
  cleared on denial.
- Added `CONVEX_AUTH_PROVISION_SECRET` to Next env access, `.env.example`, and
  Convex typed env metadata. `users.upsertAndCreateSession` now accepts a
  `provisioningSecret` and rejects non-demo provisioning when the mirrored
  secret is missing, absent from the caller, or invalid.
- Added optional `users.betaAccessExpiresAt`. Approved allowlisted users receive
  this additive expiring entitlement while `plan` remains `free`; Stripe
  subscription snapshot semantics are unchanged.
- Shared billing gates now treat active beta entitlement as feature access for
  scanner, notifications, and briefing without reporting a Stripe Pro plan.
  Settings shows "Private beta", the expiry date, and "no card required" copy.
- Auth/security review notes:
  - Denied OAuth handles are blocked after X profile read and before Convex
    mutation, so denied users persist no ReplyPilot account/session/token rows.
  - Direct non-demo calls to the provisioning mutation fail closed without the
    shared secret.
  - Demo provisioning remains temporarily permissive when the Convex secret is
    absent so the current S2 local/CI demo flow keeps working; S4 owns replacing
    the shared demo with isolated deterministic zero-key demo and disabling
    production public demo.
- Convex generated bindings updated after schema/env changes. The dev Convex
  deployment `shiny-crow-162` was pushed after the validator change so the S2
  Playwright matrix could verify against the current function signature. No
  production deployment or production data mutation performed.
- Verification:
  - `npm run typecheck` — passed.
  - `npm run lint` — passed with the existing generated Convex
    `eslint-disable` warnings and no errors.
  - `npm test` — passed: 50 files passed, 1 skipped; 444 tests passed,
    1 skipped.
  - `npm run security:audit` — passed.
  - `npm run build` — passed.
  - `NEXT_PUBLIC_CONVEX_URL=... npm run test:mobile` — passed: 12 tests across
    4 viewport projects after pushing the dev Convex function update.
- Focused tests added:
  - `tests/betaAccess.test.ts` covers allowed, denied, malformed handles,
    missing allowlist fail-closed behavior, and local open-mode behavior.
  - `tests/authProvisioning.test.ts` covers matching, missing, invalid, and
    missing-expected provisioning-secret decisions.
  - `tests/billing.test.ts` now covers active and expired beta entitlement
    without Stripe Pro contamination.

## 2026-07-10 — WP40-S4 demo isolation + AI spend caps

- Public demo is now disabled by default in production via
  `env.publicDemoEnabled`; public CTA/footer demo paths are hidden when the
  switch is off, and no missing-X-credentials production request silently falls
  into demo login. Local/CI remains demo-enabled unless
  `ENABLE_PUBLIC_DEMO=false` is set.
- Demo login now creates an isolated demo identity derived from the session
  token, not the shared `demo-user` row. The isolated demo session gets starter
  defaults and is marked onboarded so zero-key local/CI flows land on the
  dashboard deterministically.
- Demo AI paths now force deterministic zero-token fallbacks by authenticated
  demo identity, even if `ANTHROPIC_API_KEY` is configured. This covers
  semantic relevance, analysis, generation, rewrite, model eval judging, and
  compose generation.
- Added the names-only env controls `ENABLE_PUBLIC_DEMO`,
  `AI_SPEND_KILL_SWITCH`, `AI_SPEND_LIMITS_REQUIRED`,
  `AI_ANALYSIS_HOURLY_LIMIT`, and `AI_GENERATION_HOURLY_LIMIT` to
  `.env.example`; Convex typed env metadata includes the AI spend controls.
- Added shared AI spend-limit logic and an authenticated Convex
  `spend.recordAiSpendAttempt` mutation. Non-demo AI attempts write only
  user/kind/source/hour metadata to `aiSpendLedger`; no prompts, tweet text,
  OAuth tokens, or secrets are stored. Demo users bypass the paid-token ledger.
- Production missing-cap state fails closed by default for non-demo users unless
  `AI_SPEND_LIMITS_REQUIRED=false` is explicitly configured. The operator kill
  switch blocks all non-demo AI spend with user-facing copy.
- AI-spending entry points now check the shared spend gate before model calls:
  analysis continuation, initial reply/quote generation, generate-more,
  rewrite, model eval, and compose generation. Existing fair-use checks remain
  in place.
- `aiSpendLedger` is indexed by user and user/hour/kind and is included in the
  account export/delete inventory contract.
- Convex generated bindings and the dev deployment `shiny-crow-162` were
  updated after the new schema/API. No production deployment or production data
  mutation performed.
- Verification:
  - `npm run typecheck` — passed.
  - `npm run lint` — passed with the existing generated Convex
    `eslint-disable` warnings and no errors.
  - `npm test` — passed: 53 files passed, 1 skipped; 453 tests passed,
    1 skipped.
  - `npm run security:audit` — passed: 105 public Convex functions checked,
    3 allow-listed.
  - `npm run build` — passed with Next.js 16.2.10 / Turbopack.
  - `NEXT_PUBLIC_CONVEX_URL=... npm run test:mobile` — passed: 12 tests across
    4 viewport projects after pushing the dev Convex function update.
- Focused tests added/updated:
  - `tests/env.test.ts` covers production demo default-off, explicit override,
    and local default-on/default-off behavior.
  - `tests/spendLimits.test.ts` covers missing-cap fail-closed behavior,
    hourly boundary blocking, uncapped local allowance, cap parsing, and UTC
    hour-key reset boundaries.
  - `tests/demoAiFallback.test.ts` covers forced demo zero-token fallbacks when
    a model key exists.
  - `tests/accountData.test.ts` now includes `aiSpendLedger` in the explicit
    user-owned table order.
- Dead ends / findings:
  - The first Playwright rerun failed because the dev Convex deployment was
    still serving the old `users.upsertAndCreateSession` validator; pushing
    `npx convex dev --once` resolved the auth-validator drift.
  - The next Playwright rerun exposed the expected S4 behavior change: fresh
    isolated demo sessions started on onboarding concierge review instead of a
    previously completed shared demo account. Demo login now completes only the
    isolated demo account's onboarding so CI exercises the app flow
    deterministically.
  - The responsive matrix also exposed feed `Analyze & reply` actions below the
    44px target at tablet/desktop breakpoints; row and detail actions now have
    explicit 44px minimum heights, and the Playwright locator scopes to the
    detail-pane handoff action.

## 2026-07-10 — WP40-S5 X read metering + budget bounds

- Added shared X read budget logic in `shared/xReadLimits.ts` with UTC-day
  reset, per-user cap, global cap, missing-cap fail-closed behavior, and an
  operator kill switch. Low-priority reads respect numeric caps; high-priority
  reads only bypass numeric caps, never the kill switch or missing-cap guard.
- Added `xReadLedger` with indexes by user, day, user/day, and
  user/source/day. Rows store only metadata: user id, source, endpoint,
  priority, request count, raw resource count, locally unique resource count,
  hashed resource keys, status, and timestamps. No tweet text, prompts, OAuth
  tokens, or secrets are stored.
- Added `X_READ_KILL_SWITCH`, `X_READ_LIMITS_REQUIRED`,
  `X_READ_USER_DAILY_LIMIT`, and `X_READ_GLOBAL_DAILY_LIMIT` to
  `.env.example` and Convex typed env metadata.
- Included `xReadLedger` in account export/delete inventory and the explicit
  account-data contract test.
- Metered Next-side X reads:
  - manual URL analysis tweet lookup and reply-settings lookup;
  - voice refresh import;
  - owned-list picker;
  - onboarding voice import.
- Metered Convex-side X reads:
  - scanner following timeline, list tweets, watched-handle search, and keyword
    search;
  - research search and seed-handle reads;
  - voice drift X timeline refresh;
  - onboarding concierge bio/tweets read;
  - reply-back polling metrics and recent-reply search.
- Demo users bypass X-read ledger attempts and keep deterministic local/CI
  behavior. Budget blocks return user-facing pause copy for interactive Next
  paths; scanner/poller paths degrade without touching stored drafts.
- Convex generated bindings and the dev deployment `shiny-crow-162` were
  updated after the schema/API changes. No production deployment or production
  data mutation performed.
- Verification:
  - `npm run typecheck` — passed.
  - `npm run lint` — passed with the existing generated Convex
    `eslint-disable` warnings and no errors.
  - `npm test` — passed: 54 files passed, 1 skipped; 457 tests passed,
    1 skipped.
  - `npm run security:audit` — passed: 107 public Convex functions checked,
    3 allow-listed.
  - `npm run build` — passed with Next.js 16.2.10 / Turbopack.
  - `NEXT_PUBLIC_CONVEX_URL=... npm run test:mobile` — passed: 12 tests across
    4 viewport projects after `npx convex dev --once` pushed the new functions.
- Focused tests added/updated:
  - `tests/xReadLimits.test.ts` covers missing-cap fail-closed behavior,
    per-user cap, global cap, high-priority numeric-cap behavior, kill switch,
    cap parsing, and UTC day-key resets.
  - `tests/accountData.test.ts` now includes `xReadLedger` in the explicit
    user-owned table order.
- Dead ends / findings:
  - `npx convex codegen` updated generated bindings, but the Playwright matrix
    still hit a stale dev deployment missing `spend.recordAiSpendAttempt`.
    Running `npx convex dev --once` pushed functions and added the new ledger
    indexes; the matrix passed afterward.
  - `convex/outcomes.ts` runs in Convex's default runtime, so it cannot import
    `node:crypto`; reply-back resource keys use a small stable local hash
    instead of Node crypto.

## 2026-07-10 — WP40-S6 wedge-quality regression fixes

- Added shared content-token hygiene in `shared/contentTokens.ts` and applied
  it to trend clustering and onboarding concierge keyword acceptance. Weak
  labels such as `not`, `all`, `because`, `get`, `Deleted`, `Everyone`, and
  `building` no longer survive as onboarding keywords or trend fallback topics.
- Updated suggested-angle fallback copy so it no longer interpolates weak
  tokens into "missing X angle" phrasing. The fallback now uses either a strong
  niche token or an honest concrete-story/example prompt.
- Tightened generation instructions to explicitly separate the authenticated
  ReplyPilot user from the target tweet author. Generated text is told not to
  claim "my/our tweet" unless the replying user is explicitly the target author.
- Added post-parse generation guardrails that reject generated options claiming
  ownership of the target author's tweet and reject reasons that say the option
  is in the target author's voice.
- Repair-generation prompt now repeats the user/target-author boundary and
  requires reasons to explain why the option is worth sending for the user, not
  as the target author's voice.
- Verification:
  - `npm run typecheck` — passed.
  - `npm run lint` — passed with the existing generated Convex
    `eslint-disable` warnings and no errors.
  - `npm test` — passed: 55 files passed, 1 skipped; 462 tests passed,
    1 skipped.
  - `npm run security:audit` — passed: 107 public Convex functions checked,
    3 allow-listed.
  - `npm run build` — passed with Next.js 16.2.10 / Turbopack.
  - `NEXT_PUBLIC_CONVEX_URL=... npm run test:mobile` — passed: 12 tests across
    4 viewport projects.
- Focused tests added/updated:
  - `tests/contentTokens.test.ts` covers weak-token filtering and onboarding
    keyword sanitization.
  - `tests/semanticRelevance.test.ts` covers weak-token suggested-angle
    fallback behavior.
  - `tests/trends.test.ts` covers trend fallback not clustering on audited weak
    labels.
  - `tests/aiGuardrails.test.ts` covers target-author ownership and voice
    confusion guardrails.

## 2026-07-10 — WP40-S7 trust, legal, settings, disconnect, and draft access

- Removed the unrelated legacy legal contact and replaced legal/support surfaces
  with configured ReplyPilot support/operator fields:
  `REPLYPILOT_SUPPORT_EMAIL` and `REPLYPILOT_OPERATOR_NAME`.
  No invented fallback email is rendered; missing owner contact shows an
  explicit not-configured state and remains a Gate 10 owner-input blocker.
- Expanded Privacy/Terms to describe private beta operation, X, Anthropic,
  Convex, Vercel, PostHog, Sentry, Resend/web push, local offline draft
  storage, reply outcomes, retention, export, deletion, contact path, and X
  disconnect consequences.
- Reworked Settings to remove developer-facing env/key copy. The page now shows
  X connection/reconnect/disconnect, beta/no-card status, notification and
  briefing controls, usage/spend status, support, account export/delete, reply
  quality, and no-auto-publish safety copy.
- Added authenticated `users.disconnectX`:
  - deletes only the current user's stored X token rows;
  - disables that user's scanner settings and X-dependent notification
    settings;
  - marks that user's scheduled X publishes as failed with reconnect copy;
  - returns a bounded summary for the confirmation toast.
- Added authenticated `drafts.scheduledCount` so the disconnect confirmation can
  warn about queued scheduled publishes before the final click.
- Tightened scheduled publishing so queued jobs skip drafts no longer in
  `scheduled` status; this prevents a disconnect-marked draft from being
  revived by an old scheduled job.
- Strengthened the critical Playwright draft-row checks for semantic button
  role, visible keyboard focus, Enter activation, Space activation, and >=44px
  target size across the required viewport matrix.
- Convex generated bindings and the dev deployment `shiny-crow-162` were
  updated after adding the two public authenticated functions. No production
  deployment or production data mutation performed.
- Verification:
  - `npm run typecheck` — passed.
  - `npm run lint` — passed with the existing generated Convex
    `eslint-disable` warnings and no errors.
  - `npm test` — passed: 56 files passed, 1 skipped; 464 tests passed,
    1 skipped.
  - `npm run security:audit` — passed: 109 public Convex functions checked,
    3 allow-listed.
  - `npm run build` — passed with Next.js 16.2.10 / Turbopack.
  - `NEXT_PUBLIC_CONVEX_URL=... npm run test:mobile` — passed: 12 tests across
    4 viewport projects.
- Focused tests added/updated:
  - `tests/xDisconnect.test.ts` covers the disconnect cascade patches and
    confirmation consequence copy.
  - `playwright/mobile-375.e2e.ts` now covers draft-row role, target size,
    Enter activation, and Space activation.
- Security review:
  - New public Convex query/mutation both call `requireUser`.
  - Disconnect operates only through `sessionToken` ownership and never accepts
    a user id, token id, or draft id from the client.
  - Disconnect deletes token rows and disables X-dependent settings without
    deleting saved draft text, account export data, or unrelated user records.
- Remaining owner input:
  - Provide the owner-approved ReplyPilot support email and operator identity
    for production env before S8/S9 readiness evidence. The source no longer
    contains `hello@switchtoux.com`, but production readiness cannot be claimed
    until those real values are configured and verified.

## 2026-07-10 — Production change inventory: AI spend caps (unblock generation)

Symptom: non-demo AI generation returns "AI generation is temporarily
unavailable until beta spend caps are configured." This is the intended
fail-closed state (RULINGS #5, DoD #5): kill switch off + no hourly cap set +
`AI_SPEND_LIMITS_REQUIRED` not `false`. Resolution is configuration only — no
source change; the guard and its `tests/spendLimits.test.ts` coverage stay.

Names-only inventory per the WP40 production change gate (values approved by
owner; not committed):

1. Convex production variables to add/change (via `npx convex env set`):
   - `AI_ANALYSIS_HOURLY_LIMIT` — currently unset → set (owner-approved, per
     user per hour).
   - `AI_GENERATION_HOURLY_LIMIT` — currently unset → set (owner-approved, per
     user per hour).
   - `AI_SPEND_LIMITS_REQUIRED` — remains `true` (unchanged; not silently
     unlimited).
   - `AI_SPEND_KILL_SWITCH` — remains `false` (unchanged; operator kill switch
     available for incidents).
2. Enable/disable state: limits required stays ON; kill switch stays OFF; the
   two hourly caps move from "unset (fail closed)" to "set (metered)".
3. Approved caps: analysis and generation hourly caps recorded in the private
   launch inventory. Worst-case daily estimate = per-user hourly cap × 24 ×
   active users × current Anthropic unit cost from the owner-approved launch
   inventory (no dollar figure committed here).
4. Affected tables: none. `aiSpendLedger` rows are written per attempt as
   before; existing rows unchanged.
5. Rollback: for an incident set `AI_SPEND_KILL_SWITCH=true` (blocks all
   non-demo AI spend immediately); to fully revert this change, unset both
   hourly cap variables (returns to fail-closed) — `npx convex env remove
   AI_ANALYSIS_HOURLY_LIMIT` / `AI_GENERATION_HOURLY_LIMIT`.
6. Environment-only change: no production data mutation, so no restore-point
   data tag required.

Operator apply steps (run against the production Convex deployment):

```
npx convex env set AI_SPEND_KILL_SWITCH false
npx convex env set AI_SPEND_LIMITS_REQUIRED true
npx convex env set AI_ANALYSIS_HOURLY_LIMIT <approved-analysis-cap>
npx convex env set AI_GENERATION_HOURLY_LIMIT <approved-generation-cap>
```

Verify: `npx convex env list` shows all four present; a non-demo generation
request now succeeds and each attempt writes one `aiSpendLedger` row until the
hourly cap, after which the user sees "Hourly generation capacity is full."
