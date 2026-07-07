# WP5 — Progress log (append-only)

## Setup
- Branch `feat/wp05-eval-ci-gate` from `origin/main` @ c2f9fee (post-WP04).
- Worker runs in an isolated git worktree; `node_modules` symlinked from the
  main checkout to run checks. Pre-existing unstaged drift in the main checkout
  (`convex/_generated/api.d.ts`, `.agents/*`, `.cursor/*`) is NOT mine and is
  left untouched — only WP5 files are staged.
- Baseline before any edit: `typecheck` clean, `npm test` 111 passing (13 files).

## S1 + S2 — `shared/evals.ts` (deterministic eval core + voice fidelity)
- Combined into one commit: both stories live in the same new file and S2
  builds directly on S1's imports; splitting a single new file is artificial.
- Decisions:
  - Guardrail checkers are pure and key-free so the CI gate works in demo mode.
  - `runGuardrailChecks` takes `unknown` and zod-parses first (`output-shape`),
    so it can be pointed at a raw parsed LLM payload, not just typed fixtures.
  - Eval option/output shape is defined here (`GeneratedOptionsSchema`) rather
    than imported from `src/lib/ai.ts` — that file is out of WP5 bounds and is
    Next-side; duplicating the tiny contract keeps `shared/` free of Next deps.
  - `weightedLength` approximates X weighting (URL=23, CJK/emoji=2) so a fixture
    can catch an option that is ≤280 raw chars but over the weighted budget.
  - `voiceFidelity` is built on the existing `buildVoiceStyleFromTweets` with no
    edit to `shared/voice.ts` (out of scope / no refactor): it re-measures the
    candidate and compares categorical style buckets + punctuation overlap.
    This doubles as a regression lock — if voice measurement drifts, known-good
    fixtures fall below threshold and CI fails.
- Verified: `typecheck` clean, `eslint shared/evals.ts` clean. Tests come in
  S4/S5.
