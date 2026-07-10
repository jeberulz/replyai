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
