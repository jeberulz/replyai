# WP40 Stories — First-10 Beta Launch Gate

**Definition of done** (`docs/PRODUCT_STRATEGY.md` §14): Ten allow-listed
design partners can use the real X workflow without shared demo data or
uncapped spend; production telemetry and hot-window delivery are live;
legal/support copy and critical accessibility gaps are corrected;
security/full/mobile checks and the real-X launch runbook are green.

**Program brief:** `docs/wp/WP40-FIRST-10-BETA-LAUNCH-GATE.md`  
**Ruling:** `docs/wp/RULINGS.md` → 2026-07-10 WP40  
**Branch:** `feat/wp40-first-10-beta-gate` from latest clean `main`  
**Execution:** sequential only; one checked story and one passing commit at a
time

**Start blocker:** resolve the active `codex/fix-x-identity-onboarding` branch
first. It overlaps WP40 auth/schema/action files. Do not branch WP40 from its
dirty working tree.

## Stories

- [x] **WP40-S1 — Restore the security and dependency gate**
  - Remove, replace, or safely upgrade the `@vercel/config` dependency path that
    currently causes a high-severity `path-to-regexp` audit finding; preserve
    Vercel → Convex production build wiring.
  - `npm audit --audit-level=high` and `npm run security:audit` pass without an
    allowlist/suppression for the finding.
  - Vitest excludes nested `.worktrees/**`; official `npm test` runs one copy of
    the suite from a worktree-based checkout.
  - Any remaining moderate advisory is documented with package path, exposure,
    upstream status, and owner ruling; no forced breaking downgrade.
  - Verification: typecheck, lint, test, security audit, build.

- [ ] **WP40-S2 — Put the responsive critical-flow suite in CI**
  - Critical feed, analysis, and draft/schedule flows run at 375, 768, 1280, and
    1728 widths with no horizontal overflow.
  - CI installs the required browser and runs the suite in the required checks
    job (or a required dependent job); artifacts are retained on failure.
  - Tests use stable test IDs/accessible names and exercise keyboard focus for
    draft rows and primary mobile actions.
  - Existing 375px behavior remains green; no snapshot-only claim.

- [ ] **WP40-S3 — Enforce private beta access and safe provisioning**
  - Owner-approved normalized X handles are the only identities that can finish
    OAuth in `allowlist` mode; denied identities persist no user/session/token.
  - Server-only account/session provisioning requires a mirrored Vercel/Convex
    secret so direct public Convex callers cannot spoof an OAuth user.
  - Approved users receive an additive expiring beta entitlement, not
    `plan: "pro"`; the entitlement gates scanner, notifications, and briefing
    and appears truthfully in Settings.
  - Missing/invalid allowlist or provisioning secret fails closed in production
    with a clear private-beta message.
  - Tests cover allowed, denied, malformed handles, expired entitlement, secret
    rejection, and Stripe-state separation.
  - Auth/security review required before checking the story.

- [ ] **WP40-S4 — Isolate or disable production demo and cap AI spend**
  - Public production demo is disabled by default and hidden from public CTA
    paths; a production request cannot fall into the shared `demo-user` row.
  - Local/CI zero-key demo still completes onboarding → analyze → generate →
    save deterministically and uses an isolated user/session.
  - Demo identity forces deterministic AI fallbacks even when production model
    keys exist; it cannot consume paid-model tokens.
  - Every AI-spending entry point shares per-user hourly analysis/generation
    limits and an operator kill switch; production missing-cap state fails
    closed with user-facing copy.
  - Block/warning events use the typed analytics catalog; tests cover boundary,
    reset, demo, and kill-switch behavior.

- [ ] **WP40-S5 — Meter and bound X API reads**
  - All X read paths used by onboarding, manual URL analysis, scanner sources,
    research/voice refresh, and reply-back tracking record endpoint/source,
    request count, raw returned resources, and locally unique daily resources.
  - Per-user and global UTC-day budgets are checked before low-priority reads;
    separate kill switch stops all new X reads without affecting stored drafts.
  - Spend ledger stores no tweet text, prompt content, OAuth token, or secret;
    new rows are indexed, bounded, exported, and cascade-deleted.
  - UI distinguishes provider/budget pause from “no good opportunities found.”
  - PostHog/Sentry record warning/block/failure without untyped event strings or
    sensitive payloads.
  - Tests cover dedupe, source attribution, cap boundary, global cap, reset,
    failed requests, demo, and kill switch. Convex/security review required.

- [ ] **WP40-S6 — Fix the audited wedge-quality regressions**
  - Shared content-token/stopword logic prevents onboarding or trend labels such
    as `not`, `all`, `because`, `get`, `Deleted`, and `Everyone`.
  - Suggested-angle fallbacks never interpolate stopwords into “missing X
    angle”; empty/weak topics use an honest specific fallback.
  - Generation context explicitly separates replying user from target author;
    a reply cannot claim “my own tweet” unless the authenticated user's X ID is
    the target author.
  - Reasons address the user in second person and never imply the generated text
    is written in the target author's voice.
  - Deterministic demo fixtures present launch-quality examples.
  - Unit/eval fixtures fail on all four production-audit regressions while the
    permanent 3-option/reason/weighted-length/no-fake-score guardrails remain
    green.

- [ ] **WP40-S7 — Correct trust, legal, settings, disconnect, and draft access**
  - Replace the unrelated `hello@switchtoux.com` value with the owner-approved
    ReplyPilot support address; no invented placeholder can pass production
    readiness.
  - Privacy/terms describe the actual operator, beta status, X, Anthropic,
    Convex, Vercel, PostHog, Sentry, Resend/push, local offline storage, reply
    outcomes, retention, export, deletion, and contact path.
  - Settings removes developer-facing env/key copy; shows X connection, beta
    expiry, notification state, usage/spend status, support, export/delete, and
    truthful no-card beta access.
  - Authenticated X disconnect confirms consequences, removes stored X tokens,
    disables X-dependent jobs/settings, and safely handles scheduled drafts;
    reconnect remains available.
  - Draft rows are semantic keyboard controls with visible focus, Enter/Space
    activation, and ≥44px primary mobile targets.
  - Tests cover disconnect ownership/cascade effects and UI accessibility;
    security review required.

- [ ] **WP40-S8 — Activate and prove production observability + alerts**
  - Produce a names-only Vercel/Convex env inventory and rollback plan; owner
    approves it before any value is applied.
  - Configure PostHog and Sentry for browser, Next.js, and Convex; safe synthetic
    events/errors arrive in each plane.
  - Configure VAPID, `APP_URL`, and Resend; a real push and fallback email arrive
    at owner-approved destinations, respect quiet hours/cap, and open the
    correct route.
  - `beta-readiness` reports required name presence and production HTTP checks
    without printing secret values.
  - PostHog dashboard covers access → onboarding → opportunity open → generation
    → copy/save/send → responded, notification open→send, X/AI spend, and error
    rates.
  - Evidence uses dashboard/event IDs or redacted screenshots only.

- [ ] **WP40-S9 — Run the real-X Gate 10 and prepare rollout**
  - From an owner-approved real X account, verify OAuth, onboarding, scanner,
    analysis, exactly 3 replies + 3 quotes with reasons, copy/save, explicit
    standalone publish, restricted-reply fallback, scheduling, and reply-back
    tracker seed.
  - Complete the Phase 2 manual extras: offline save/reconnect with no offline
    publish, onboarding per-handle accept, push deep link, and PWA install.
  - Verify export, delete, X disconnect/reconnect, security headers, manifest,
    and keyboard/mobile behavior.
  - Provision two friendly accounts first; observe 24 hours without unresolved
    P0/budget alarm before enabling the other eight.
  - Create the private onboarding, daily metric/spend review, feedback, incident,
    kill-switch, and rollback checklists. Commit no personal handles/emails.
  - Update `README.md`, `.env.example`, `AGENTS.md`, deployment/observability docs,
    strategy status, and Phase 2 closeout to match reality.
  - Final commands all pass: typecheck, lint, test, evals, security audit,
    extension build, build, mobile matrix, beta readiness.
  - `wp40-progress.md` maps every §14 DoD item to evidence; PR description follows
    playbook §1 and states that live Stripe charging remains off for Gate 10.
