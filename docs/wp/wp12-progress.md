# WP12 Progress — Daily briefing agent

## WP12-S1 — Schema + shared helpers

- Added `briefingSettings` + `briefingRuns` to `convex/schema.ts` (additive).
- Added `shared/briefings.ts`: defaults, hour/day matching, enqueue gate,
  zod artifact schema, `demoBriefingArtifact`, `rankingChangelogSentence`.
- Tests: `tests/briefings.test.ts` (11 passing).
- Verified: `npm run typecheck` + `npm test -- tests/briefings.test.ts`.
