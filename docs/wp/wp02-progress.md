# WP02 Progress

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
