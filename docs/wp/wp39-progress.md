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
