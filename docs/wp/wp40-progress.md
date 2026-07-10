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
