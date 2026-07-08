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

## 2026-07-08 - VFU-2

- Added optional `bannedPhrases` and `antiPatterns` arrays to `voiceProfiles`; the schema change is additive so legacy rows remain valid.
- Convex `voiceProfiles.create` now derives default negative constraints when callers omit them or pass empty arrays. `voiceProfiles.update` preserves user intent, including clearing a list to empty.
- `learnFromSentText` preserves existing user-edited constraints. For old rows without constraints, it seeds derived defaults while refreshing trained-profile style from learned examples.
- Voice Studio now exposes line-based editors for banned phrases and anti-patterns in the existing create/edit dialog, and cards show a compact summary when constraints exist.
- Verification:
  - `npm run typecheck`
  - `npm test`

## 2026-07-08 - VFU-3

- Replaced the old first-5-example voice prompt with a single exported voice-instruction builder used by generation, repair, model-eval judging, and rewrite.
- The builder selects examples by similarity to the target tweet, includes up to 10 examples, and includes user/derived negative constraints.
- `rewriteText` now receives voice examples and constraints, so rewrite chains no longer collapse to only `voice.tone`.
- Voice training and onboarding now call an optional LLM tone-label refinement pass. It catches failures and returns measured stats unchanged without `ANTHROPIC_API_KEY`, preserving demo mode.
- Verification:
  - `npm run typecheck`
  - `npm test`
