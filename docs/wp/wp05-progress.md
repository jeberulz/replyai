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

## S3 + S4 — fixtures + deterministic gate
- Captured each profile's `expectedStyle` as the real `buildVoiceStyleFromTweets`
  output via a throwaway probe (deleted), so the regression lock is exact.
- Two synthetic personas: `terse-builder` (short, no emoji) and
  `hype-storyteller` (emoji, exclamation-heavy). No real user data.
- 10 generation cases: 2 healthy, 1 off-voice-but-guardrail-clean (the voice
  regression demonstrator), and 7 bad cases each tripping exactly one guardrail.
- The gate asserts fail cases trip EXACTLY their named rule (`failedRules === [trips]`),
  so each check is proven independently.
- Verified the gate is not a no-op: temporarily setting `MAX_WEIGHTED_LENGTH`
  to 99999 flipped `bad-weighted-length` red; restoring returned green.
- Fidelity margins: good/on-voice options ≥ 0.8, off-voice = 0.4, threshold 0.5.

## S5 — unit tests for eval logic
- Per-rule isolation tests, `weightedLength` (ASCII/URL=23/emoji=2), and
  `voiceFidelity` bounds/threshold. Loops over `BANNED_PHRASES` so adding a
  phrase is automatically covered.
- Full suite after S5: 129 → (unit adds) tests green; typecheck + eslint clean.
