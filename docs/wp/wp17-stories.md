# WP17 Stories - Voice Fidelity Upgrades

Definition of done from `docs/PRODUCT_STRATEGY.md` §14:

- Similarity-selected 8-10 prompt examples.
- User-editable banned-phrases/anti-patterns.
- Rewrite uses full voice block.
- LLM-refined tone labels over measured stats.

## Stories

- [x] VFU-1 - Shared voice fidelity primitives
  - Acceptance criteria:
    - `shared/voice.ts` selects the 8-10 examples most relevant to a target tweet using deterministic similarity, not newest-first order.
    - Sentence length measurement counts tweets that end without punctuation correctly.
    - Voice measurement derives negative constraints such as hashtags, emoji, and stock phrases from examples.
    - Tone/style label refinement has a deterministic no-key fallback that keeps measured metrics as ground truth.
    - Focused unit tests cover selection, sentence splitting, negative constraints, and fallback behavior.

- [x] VFU-2 - Editable negative constraints on voice profiles
  - Acceptance criteria:
    - Voice profiles persist optional banned phrases / anti-patterns without breaking existing rows.
    - Create, train, update, and sent-reply learning paths preserve or refresh the constraints correctly.
    - Voice Studio lets users review and edit the constraints in the existing profile dialog.
    - Existing Convex authorization and demo-mode behavior remain unchanged.

- [x] VFU-3 - Full voice block in generation and rewrite
  - Acceptance criteria:
    - Generation and repair prompts use similarity-selected examples capped at 8-10.
    - The voice instruction block includes editable and derived negative constraints.
    - Rewrite uses the same full voice instruction block as generation, including selected examples and constraints.
    - LLM model-eval judging sees the same voice block used for generation.
    - Demo mode stays deterministic without `ANTHROPIC_API_KEY`.

- [ ] VFU-4 - Regression coverage, docs, and final verification
  - Acceptance criteria:
    - Eval fixtures cover banned phrases / anti-pattern regression behavior.
    - Focused tests prove rewrite receives the full voice block and no-key tone refinement falls back cleanly.
    - `docs/wp/wp17-progress.md` records implementation decisions and any gotchas.
    - Full verification passes: `npm run typecheck && npm run lint && npm test && npm run evals && npm run build`.
