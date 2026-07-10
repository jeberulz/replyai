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
