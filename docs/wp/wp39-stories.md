# WP39 Stories — Onboarding concierge MVP

**Definition of done** (Phase 2 program; product §7.2.9 + §2 onboarding review):
From the user's X history at signup, **propose** goal, seed keywords, watch
candidates, and first voice profile — user **reviews and confirms** in ~60
seconds (not a blind form). Static goal keyword lists remain **fallback** when
X read or AI unavailable.

**Product refs:** §2 Onboarding & goals; Phase 1 item 7 "onboarding concierge
groundwork" — this WP ships the MVP agent path.

**Depends on:** Existing onboarding wizard on `main` (`onboarding-flow.tsx`,
`shared/onboarding.ts`, voice build action).

**Parallel-safe with:** WP15 if WP39 avoids service worker / manifest files.

## File boundary

**Owns:**

- `shared/onboardingConcierge.ts` (new — proposal shape + demo fixtures)
- `convex/onboardingConcierge.ts` + optional `onboardingConciergeRuns` schema
- `convex/onboardingConciergeActions.ts` (or extend existing action pattern)
- `src/app/actions.ts` — `runOnboardingConcierge*` / apply-proposal actions only
- Onboarding UI: new **review** step or enhance `niche-step` / `voice-step` with
  proposed chips (orchestrator picks in S1 — document in progress.md)
- `tests/onboardingConcierge.test.ts`

**May touch additively:**

- `src/components/app/onboarding/onboarding-flow.tsx` — wire proposal into flow
- `convex/research.ts` / watch list — one-click accept of proposed handles
- `shared/onboarding.ts` — fallback keyword lists unchanged as default path

**Do not touch:** `public/push-sw.js`, manifest (WP15), compose, variants.

## Defaults

- Run once after X connect (or on niche step entry) — user can skip → static flow
- Proposal fields: `goalId` suggestion, 5–12 keywords, 3–5 watch handles with reasons,
  voice examples snippet (not full auto-train until user confirms)
- X timeline read via existing server token path; demo: `demoOnboardingProposal(...)`
- Zod-validated LLM output when key present; never auto-save without explicit confirm
- Record run in `onboardingConciergeRuns` (status, error, proposal JSON)
- Fair-use: counts as one analysis or generation — document in progress
- No auto-publish; no fake engagement scores

## Stories

- [x] **WP39-S1 — Shared proposal types + demo**
  - Proposal validator + demo fixture from static onboarding data.
  - Vitest: demo shape, fallback when empty input.

- [x] **WP39-S2 — Schema + Convex run API**
  - Additive run table; get latest run for session user.
  - `requireUser` on all public functions; account delete/export.

- [ ] **WP39-S3 — Concierge action**
  - Fetch bio + recent tweets (or demo); LLM or heuristic proposal.
  - Missing keys → demo proposal; failures → failed run row + graceful UI.

- [ ] **WP39-S4 — Onboarding review UI**
  - Show proposal as editable chips/cards; Accept applies goal/keywords/watch seeds.
  - "Use manual setup instead" skips to current wizard behavior.

- [ ] **WP39-S5 — Verification**
  - Demo mode end-to-end; X-connected path manual note in PR.
  - Checks green; PR DoD checklist.
