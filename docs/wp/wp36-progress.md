# WP36 Progress — Voice-drift agent

## 2026-07-09 — Scaffold

- Wave 2 worker W7. Parallel with WP14; owns voice drift only.

## 2026-07-09 — WP36-S1

- Added `shared/voiceDrift.ts`: `compareVoiceStyles`, `measureVoiceDrift`,
  `demoVoiceDriftSuggestion`, `applyDriftSelection`, demo fixtures.
- Severity: 0 = none, 1–2 = minor, 3+ = major (phrase list counts as one field).
- Tests in `tests/voiceDrift.test.ts` (8 cases) green.

## 2026-07-09 — WP36-S2

- Additive `voiceDriftRuns` table + `voiceDriftSuggestion` validator in schema.
- Account delete/export cascade: `voiceDriftRuns` before `voiceProfiles` (order 95).
- Work continues exclusively in `replyai-wp36` worktree (WP14 owns primary checkout).
