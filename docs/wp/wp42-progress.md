# WP42 Progress — Provider-neutral AI foundation

## 2026-07-11 — Setup

- Branch: `feat/wp42-provider-foundation`
- Base: `01eff29` (`origin/main`, merged WP41)
- Runtime: inherited current Codex runtime; per-agent model routing not independently enforceable by the collaboration API.
- Required source docs read: `PRD.md`, `AGENTS.md`, `docs/AGENT_PLAYBOOK.md`, `docs/PRODUCT_STRATEGY.md` §14, `docs/wp/WP41-GROK-EVAL-PROGRAM.md`, `docs/wp/RULINGS.md`, `design.md`.
- Assignment referenced `tasks/prd-grok-assisted-x-discovery.md` and `tasks/prd-model-evaluation-lab.md`; those files are not present in this worktree. WP42 used the committed WP41 program brief and §14 row as source of truth.
- External docs consulted:
  - xAI `llms.txt` REST reference: `/v1/models` lists models available to
    the authenticating API key, including model names and pricing.
  - xAI docs navigation currently exposes model, reasoning, and X Search
    sections, but WP42 does not implement Responses/X Search execution.
  - The `grok-4.3` model pin and low reasoning default are from the merged WP41
    program contract.
- Local Next docs under `node_modules/next/dist/docs/` are absent in this worktree, so no Next route/action edits are planned unless unavoidable.

## 2026-07-11 — Implementation decisions

- Added `shared/providers.ts` as the provider-neutral contract layer:
  provider IDs, capabilities, operations, reasoning effort, generation/
  discovery request/result types, normalized usage, normalized errors, cost
  estimation, retryability, and secret redaction.
- Extended `shared/models.ts` additively:
  - `MODELS` remains the existing Claude generation catalog for current UI and
    `modelEvals` behavior.
  - `ALL_MODELS` adds the internal xAI discovery model.
  - `grok-4.3` is cataloged with low default reasoning and discovery/X Search
    capabilities only; it is intentionally not accepted by `isKnownModel()` so
    user model pickers cannot select it for generation.
- Added server-only xAI config in `src/lib/env.ts` and
  `src/lib/providers/config.ts`:
  - `XAI_API_KEY`
  - `XAI_BASE_URL` default `https://api.x.ai/v1`
  - `XAI_DISCOVERY_MODEL` default `grok-4.3`
  - `XAI_DISCOVERY_REASONING_EFFORT` default `low`
- Added `src/lib/providers/xai.ts` for authenticated `/v1/models`
  entitlement verification. It is fetch-injected for tests, does not call the
  network when the key is missing, fails closed when `grok-4.3` is absent, and
  redacts provider errors.
- Added `src/lib/providers/usage.ts` and wired existing Claude calls through
  the legacy adapter. Public `Usage` remains `{ tokensIn, tokensOut }`, so
  current analyze/generate/rewrite/compose/model-eval callers remain compatible.
- Updated `.env.example` with xAI variable names only; no secrets or values.

## 2026-07-11 — Verification

- Focused tests:
  - `./node_modules/.bin/vitest run tests/models.test.ts tests/env.test.ts tests/providers.test.ts tests/xaiProvider.test.ts tests/demoAiFallback.test.ts`
  - Result: 5 files passed, 28 tests passed.
- Typecheck:
  - `./node_modules/.bin/tsc --noEmit`
  - Result: passed.
- Lint:
  - `./node_modules/.bin/eslint .`
  - Result: passed with 4 existing generated-file warnings in
    `convex/_generated/*`, matching the baseline warning class.
- Full test suite:
  - `./node_modules/.bin/vitest run`
  - Result: 60 files passed, 1 skipped; 503 tests passed, 1 skipped.
- Security audit:
  - `node scripts/security-audit.mjs`
  - Result: passed; 110 public Convex functions checked, 3 allow-listed.
- Production build:
  - `./node_modules/.bin/next build --webpack`
  - Result: passed.
  - Note: default Turbopack build failed only when using a temporary
    `node_modules` symlink from the sibling checkout:
    `Symlink [project]/node_modules is invalid, it points out of the filesystem root`.
    The Webpack production build succeeded against the same WP42 code.

## 2026-07-11 — Residual risks / handoff

- No real xAI key was used and no real entitlement smoke test was run. Per WP41,
  real-key provider smoke testing is an operator gate after WP43 zero-key CI,
  not a WP42 merge requirement.
- WP42 does not implement Grok X Search, X hydration, scanner/shadow
  integration, lab domain schema, or lab UI. Those remain WP43+.
- `tasks/prd-grok-assisted-x-discovery.md` and
  `tasks/prd-model-evaluation-lab.md` were unavailable in this worktree; WP42
  followed the merged WP41 program brief and §14 row.
