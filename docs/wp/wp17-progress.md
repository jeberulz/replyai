# WP17 Progress

## 2026-07-08 - VFU-1

- Added deterministic shared voice primitives:
  - target-similarity selection for prompt examples, capped at 10;
  - sentence splitting that treats each unpunctuated tweet as a sentence boundary;
  - derived negative constraints from measured voice style and examples;
  - normalization for user-edited constraints;
  - tone-label refinement helper that falls back to measured stats when no refined label exists.
- `npm install` was required because this worktree initially had no dependencies, which also made `node_modules/next/dist/docs` unavailable. After install, read `node_modules/next/dist/docs/01-app/index.md` before Next.js edits.
- Verification:
  - `npm test -- --run tests/voice.test.ts`
  - `npm run typecheck`
  - `npm test`
