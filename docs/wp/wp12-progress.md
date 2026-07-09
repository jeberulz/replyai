# WP12 Progress — Daily briefing agent

## WP12-S1 — Schema + shared helpers

- Added `briefingSettings` + `briefingRuns` to `convex/schema.ts` (additive).
- Added `shared/briefings.ts`: defaults, hour/day matching, enqueue gate,
  zod artifact schema, `demoBriefingArtifact`, `rankingChangelogSentence`.
- Tests: `tests/briefings.test.ts` (11 passing).
- Verified: `npm run typecheck` + `npm test -- tests/briefings.test.ts`.

## WP12-S2 — Convex queries/mutations + account cascade

- Added `convex/briefings.ts`: settings get/update, latest/list/get run,
  internal start/complete/fail, `dispatchDueBriefings`, `loadBriefingContext`.
- Account cascade: `briefingSettings` + `briefingRuns` in `accountData` +
  `account.ts` count/list/delete switches; test expectation updated.
- Billing: `briefing` paid feature label/gate message.
- Regenerated `convex/_generated/api.d.ts` for new module.
- Verified: `npm run typecheck` + briefing + accountData tests.

## WP12-S3 — Briefing action (generate artifact)

- Added `convex/briefingActions.ts` (`use node`): LLM structured artifact
  via Anthropic + zod; demo fallback when no key / LLM error.
- Ranking changelog sentence folded into coaching insight when recent.
- `startRun` + `dispatchDueBriefings` schedule `generateBriefing`.
- Usage: no Convex-side `usage.record` (same as research/semantic — public
  mutation needs sessionToken); noted as Found-not-fixed / follow-up.
- Verified: `npx convex codegen`, `npm run typecheck`, unit tests.

## WP12-S4 — Cron dispatcher

- Registered hourly `dispatch daily briefings` →
  `internal.briefings.dispatchDueBriefings` in `convex/crons.ts`.
- Idempotency already in dispatcher (localDay index + shouldEnqueueBriefing).
- Verified: `npm run typecheck`.

## WP12-S5 — Briefing UI surface + nav

- Added `/briefing` page + `BriefingView` (artifact sections, last-run,
  Pro upgrade gate, empty state).
- Nav link in `nav-links.ts` (sidebar + ⌘K).
- Verified: `npm run typecheck`.

## WP12-S6 — Settings + optional email

- Added `BriefingSettingsCard` + settings page section; `saveBriefingSettingsAction`.
- Resend email on complete when `emailOptIn` + `notificationEmail` +
  `RESEND_*` keys; failure → `emailStatus: failed`, run still completes.
- Verified: `npm run typecheck`.

## WP12-S7 — Final verification + PR

- Full suite: `npm run typecheck && npm run lint && npm test && npm run build`
  — pass (lint: 4 pre-existing warnings in `convex/_generated/*` only).
- Tests: 296 passed | 1 skipped.
- PR opened; do not merge.
