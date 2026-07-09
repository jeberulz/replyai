# WP39 Progress — Onboarding concierge MVP

## 2026-07-09 — Scaffold

- Wave 3 worker W8. Parallel with WP15.
- Baseline: manual onboarding wizard (goal → niche → voice → building → ready).

## 2026-07-09 — WP39-S1

- Decision: dedicated review step (S4) after goal entry, not niche-chip-only —
  proposal covers goal + keywords + watches + voice snippet in one confirm.
- `shared/onboardingConcierge.ts`: Zod schema, `demoOnboardingProposal`,
  `heuristicOnboardingProposal`, parse helper. Static `suggestedKeywordsForGoal`
  remains pad/fallback.
- Tests: 10 passing in `tests/onboardingConcierge.test.ts`.

## 2026-07-09 — WP39-S2

- Additive `onboardingConciergeRuns` table + Convex validators.
- Public API: `latest`, `startRun`, `skipRun`, `acceptProposal`, `acceptWatch`
  (per-handle only). Internal: `completeRun` / `failRun`.
- Fair-use: one concierge run = one **analysis** bucket (same as voice-drift).
- Account delete/export: `onboardingConciergeRuns` in `ACCOUNT_USER_TABLES`
  + `convex/account.ts` switch arms.
- Action stub in `onboardingConciergeActions.ts` (demo proposal) — filled in S3.

## 2026-07-09 — WP39-S3

- `runConcierge`: X bio+tweets when credentials present; else demo fixtures.
- LLM via Anthropic + Zod (`LlmProposalSchema`); missing key → heuristic;
  empty signal / demo user → `demoOnboardingProposal`.
- Failures write `failed` run row via `failRun`; never throw past the action.
- Server actions: `runOnboardingConciergeAction`, `skipOnboardingConciergeAction`,
  `applyOnboardingConciergeProposalAction`, `acceptOnboardingConciergeWatchAction`.

## 2026-07-09 — WP39-S4

- New first step `concierge` in `onboarding-flow.tsx` (before goal/niche).
- `ConciergeReviewStep`: editable goal radios, keyword chips, per-handle Accept
  for watches, voice snippet preview (not full train until voice step).
- Confirm → `acceptProposal` then jump to voice; Manual → `skipRun` → goal step.
- Watches never auto-added (RULINGS Wave 3).
