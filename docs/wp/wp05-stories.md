# WP5 — Eval agent + CI gate — Stories

**DoD (§14):** Regression on voice fidelity / guardrails fails CI.

**Orchestrator DoD interpretation (work to this):**
1. Deterministic-first CI gate — meaningful pass/fail with **zero external keys**.
2. LLM-judged evals available but **optional** — skip cleanly when no key; never gate CI.
3. Fixtures are the contract — small, readable, documented provenance, no real user data.
4. ~2% shadow-sampling only if it fits inside `convex/` as additive; else defer to WP16/WP17.

Each story is atomic, verifiable in one sitting, and committed only when
`npm run typecheck && npm test` are green.

---

- [x] **S1 — Deterministic eval core (`shared/evals.ts`)**
  Pure, dependency-light eval logic importable by both tests and Convex.
  - Zod contract schema for generated-option output shape (`GeneratedOptionsSchema`).
  - `weightedLength(text)` (X weighting: URL = 23, emoji = 2, else 1 codepoint).
  - Guardrail checkers: exactly-N options, distinct categories, valid categories,
    reason present, weighted length ≤ 280, no banned/engagement-bait phrases,
    no fake-precision scores.
  - `runGuardrailChecks(options, {kind, expectedCount})` → structured pass/fail.
  - No `any`, no `console.log`, no runtime key dependency.
  - **Acceptance:** functions exported and typed; `npm run typecheck` green.

- [x] **S2 — Voice-fidelity metric (`shared/evals.ts`)**
  Build on the deterministic `buildVoiceStyleFromTweets` in `shared/voice.ts`
  (no edits to voice.ts).
  - `voiceFidelity(text, target: VoiceStyle)` → 0..1 over comparable style
    dimensions (sentence length, emoji use, formatting, reading level,
    punctuation overlap).
  - `runVoiceFidelityCheck(text, target, threshold)` → pass/fail with score.
  - **Acceptance:** matching text scores high, mismatched text scores low, with
    margin around the threshold; typecheck green.

- [x] **S3 — Fixtures + provenance (`evals/fixtures/`)**
  Checked-in, readable, synthetic (no real user data).
  - Voice-profile fixtures (tweets + expected measured `VoiceStyle`).
  - Generation fixtures: known-good and known-bad option sets, each bad case
    labelled with the single guardrail it is designed to trip.
  - `README.md` documenting schema, provenance, and how untrusted tweet text is
    treated (delimited data, never instructions).
  - **Acceptance:** fixtures load and validate against the S1 zod schema.

- [x] **S4 — Fixture-driven deterministic gate (`tests/evals.fixtures.test.ts`)**
  The CI-blocking regression layer, run by `npm test`, zero keys.
  - Every good case passes all guardrails; every bad case trips exactly its
    intended guardrail and fails the aggregate.
  - Voice regression lock: re-measuring fixture profile tweets equals the stored
    expected `VoiceStyle` (catches drift in `shared/voice.ts`).
  - Good outputs meet the fidelity threshold vs their profile; off-voice outputs
    fall below it.
  - **Acceptance:** `npm test` green; deliberately breaking a checker/threshold
    turns it red (verified locally).

- [x] **S5 — Unit tests for eval logic (`tests/evals.test.ts`)**
  Repo convention: new `shared/` logic gets unit tests in `tests/`.
  - Cover each checker, `weightedLength`, and `voiceFidelity` edge cases.
  - **Acceptance:** `npm test` green.

- [x] **S6 — Convex internal eval-agent surface (`convex/evals.ts`)**
  Extend without breaking `save` / `latestForAnalysis`.
  - Add an **internal** deterministic eval runner (no `requireUser` needed —
    internal-only, no keys) that returns a guardrail report for supplied options.
  - **Acceptance:** typecheck green; existing eval functions unchanged in behavior.

- [ ] **S7 — CI workflow (`.github/workflows/ci.yml`)**
  This repo's first CI. Required job runs the full deterministic suite with no
  secrets: `typecheck → lint → test → build`.
  - Optional LLM-eval job gated on an `ANTHROPIC_API_KEY` secret, `continue-on-error`,
    never blocks merge; documented as such.
  - **Acceptance:** the exact commands the required job runs pass locally in a
    clean state; workflow YAML is valid.

- [x] **S8 — Optional LLM-judged pass (`tests/evals.llm.test.ts` + `npm run evals`)**
  - Vitest block gated with `describe.runIf(ANTHROPIC_API_KEY)`; skipped (with a
    clear skip annotation) when absent, so the default suite and CI stay
    deterministic and never make a paid call.
  - `npm run evals` script to run the deterministic fixture gate locally.
  - **Acceptance:** with no key, block is reported skipped; `npm run evals` runs
    the deterministic gate.

- [ ] **S9 — Docs (`AGENTS.md`, `README.md`)**
  - Document the CI gate (what it checks, zero-keys behavior) and how to run
    evals locally, in the same PR (§7 docs-are-infrastructure).
  - **Acceptance:** docs describe reality; no stale claims.

- [ ] **S10 — PR pass (§6)**
  Full suite `typecheck && lint && test && build`; `/code-review` + `/security-review`
  on the diff; address correctness findings; open PR (do not merge).
