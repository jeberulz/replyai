# WP02 Progress

## 2026-07-08 — review pass (S4 continuation)

- Ran the playbook §6 PR pass on the branch: /security-review (no HIGH/MEDIUM
  findings) and /code-review at high effort (8 finder angles + verification).
- Confirmed and fixed: `current_period_end` read from the top-level Stripe
  Subscription, a field removed in the SDK's pinned API version
  (2025-08-27.basil) — now read per subscription item; dead
  `checkout.session.completed` webhook branch (only `subscription_data.metadata`
  was set) — checkout now also sets session-level metadata so the re-link
  safety net actually fires; missing out-of-order guard in
  `applySubscriptionSnapshot` (a retried `updated(active)` after `deleted`
  resurrected Pro) — canceled subscription ids are now ignored;
  `scanner.updateSettings` threw on stale `enabled: true` echoes from open
  tabs after a plan lapse — gate now only fires on a genuine enable attempt;
  `unpaid` removed from Pro-active statuses (past_due stays as grace) —
  flagged in the PR for owner sign-off; webhook now reports unmatched
  customer events via `captureConvexException`; unenforced "3 analyses/day"
  and "1 voice profile" copy replaced with claims the code actually enforces.
- Cleanups: shared `convex/lib/stripe.ts` (configured check + cached client,
  both runtimes); `replaceUserWithoutStripeSnapshot`+`db.replace` collapsed
  into `db.patch` with explicit-undefined clears; `enabledSettings` filters
  before fetching users and parallelizes; `ensureDefaults` batches its three
  login-path queries in `Promise.all`; typed `env` from `_generated/server`
  replaces `process.env.STRIPE_*` per Convex guidelines; unused
  `scanContext.plan` and a whitespace drive-by removed; `stripeConfigured()`
  computed once in `billing.status`.
- Note: `feat/wp02-stripe-billing-gating-wave1` (sibling worktree) is this
  branch plus WP1 merged in — an integration branch the playbook forbids; it
  carries no WP2 work beyond this branch and should be discarded once WP1 and
  WP2 merge independently.

## 2026-07-07

- Read required docs in order: `PRD.md`, `AGENTS.md`, `docs/AGENT_PLAYBOOK.md`, `docs/PRODUCT_STRATEGY.md` (§4, §6, §10, §14 WP2), `convex/_generated/ai/guidelines.md`, Next App Router docs, and `design.md`.
- Confirmed `docs/wp/RULINGS.md` is not present.
- Confirmed current branch scope can stay centered on `convex/billing.ts`, Convex HTTP routing, `users.plan`, scanner gating, and a narrow billing section in settings.
- Identified an implementation ambiguity to resolve in code: notifications are referenced in WP2 DoD, but no notification feature surface exists yet. Plan is to centralize a reusable paid-feature gate now and apply it to scanner paths plus settings billing copy, without inventing WP8 UI.
- Added Stripe billing persistence fields on `users`, a new billing/query module, a Node-only Stripe action module, and a Convex HTTP webhook route for subscription lifecycle sync.
- Centralized plan access helpers in `shared/billing.ts`, then applied them to scanner mutations, background scan eligibility, onboarding defaults, and the `/feed` locked-state surface so demo accounts still work without Stripe.
- Added a billing card to `/settings` with test-mode checkout and billing-portal actions plus Stripe configuration status; documented the new env vars in `.env.example`.
- Regenerated Convex bindings with `npx convex codegen`.
- Verification on the final tree: `npm run typecheck` passed; `npm run lint` passed with existing warnings only (generated Convex files and pre-existing `src/components/app/drafts-list.tsx` unused import); `npm test` passed (`45` files, `430` tests); `npm run build` passed.
