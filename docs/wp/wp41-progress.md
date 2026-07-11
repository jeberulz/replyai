# WP41 progress — Grok + Evaluation Lab program registration

Append-only implementation log.

## 2026-07-11 — WP41-S0 — Scope and source audit

- Confirmed the isolated worktree is on `docs/wp41-grok-eval-program` at base
  commit `b61b5001f2680eaf112cee4fb6adc2fbd5726d3c`.
- Read `PRD.md`, `AGENTS.md`, `docs/AGENT_PLAYBOOK.md`, §4 and §14 of
  `docs/PRODUCT_STRATEGY.md`, both approved task PRDs from the primary worktree,
  and `docs/wp/RULINGS.md` before editing strategy content.
- Audited current implementation surfaces read-only: Claude generation and
  judge paths (`src/lib/ai.ts`, `shared/models.ts`, `src/app/actions.ts`), the
  key-free deterministic evaluator (`shared/evals.ts`, `convex/evals.ts`),
  historical `modelEvals` schema/UI, scanner and opportunity pipelines,
  X integration, spend ledgers, typed analytics, and account export/deletion.
- §14 currently ends at WP40. WP34 is also absent historically, but identifiers
  are never reused or backfilled; the next registered sequence therefore starts
  at WP41 as assigned.
- Routing note: the requested Economy-tier/Low-effort route is appropriate for
  a fixed docs-only decomposition, but this runtime cannot select or enforce a
  different model or effort per worker. All workers inherit the current runtime;
  no stronger routing claim will be made.

## 2026-07-11 — WP41-S1 — Official package rows

- Registered WP41 as the docs-only strategy package and WP42–WP51 as the ten
  implementation packages in `docs/PRODUCT_STRATEGY.md` §14.
- Added an explicit dependency column rather than leaving sequencing implicit.
  The implementation chain keeps provider search separate from scanner writes,
  keeps the domain/runner/UI surfaces reviewable, and places assisted routing
  behind both experiment evidence and a recorded owner approval.
- Preserved the approved operating constraints in the rows: pinned
  `grok-4.3`, low discovery effort, authenticated `/v1/models` entitlement,
  Claude as the default production generation provider, `off`/`shadow` default,
  operator-only lab, historical `modelEvals`, key-free deterministic CI/demo,
  no global assisted enablement, and no publish automation.

## 2026-07-11 — WP41-S2 — Program brief

- Added `docs/wp/WP41-GROK-EVAL-PROGRAM.md` with the merge dependency graph,
  eight implementation wave gates, explicit high-collision ownership/order,
  per-package risk-based routing recommendations, rollout/owner gates, and a
  reusable worker handoff checklist.
- Kept schema/account-data changes sequential (WP44 → WP49 → WP51), scanner
  changes sequential (WP49 → WP50), and route/component ownership separated
  across WP46–WP48. WP46 and WP49 may run in parallel only after the runner
  gate because their named files are disjoint.
- Recorded routing honestly: this runtime cannot select or enforce a different
  model or reasoning effort for a subagent. Recommendations are planning data;
  every worker inherits the current runtime unless an orchestrator has an
  independently available routing control and records its actual use.
- Preserved the unresolved owner inputs from the approved lab PRD as gates for
  WP51 rather than inventing consent, reviewer-count, spend, export, or retention
  policy.

## 2026-07-11 — WP41-S3 — Docs reconciliation and verification

- Identifier audit parsed only §14 table rows: there are no duplicate WP row
  identifiers, the new sequence is exactly WP41–WP51, and it contains 11 rows.
  The historical WP34 gap remains untouched.
- Dependency check confirmed the strategy rows and brief both encode the
  required chain: WP41 → WP42; WP42 → WP43/WP44; WP43+WP44 → WP45;
  WP44+WP45 → WP46; WP44+WP45+WP46 → WP47; WP45+WP47 → WP48;
  WP43+WP44+WP45 → WP49; evidence from WP48+WP49 plus owner approval → WP50;
  and WP7+WP20+WP44–WP50 plus privacy/budget approval → WP51.
- Collision review confirmed the sequential owners for provider adapters,
  eval-domain/runner functions, schema/account-data files, eval routes, and
  scanner/opportunity integration match those dependencies.
- Content checks found all five required brief sections and WP41–WP51 package
  coverage. The routing ledger explicitly says per-subagent model/effort routing
  is not supported or enforced and workers inherit the current runtime.
- `git diff --check b61b500..HEAD` passed. The diff contains only the four owned
  documentation files: `docs/PRODUCT_STRATEGY.md`, the WP41 program brief, and
  the WP41 stories/progress artifacts.
- The full package-manager suite was not run: this PR is documentation-only,
  the orchestrator explicitly requested identifier/dependency checks plus
  `git diff --check`, and no install or product build surface changed.
- Remaining owner gates are deliberately unresolved, not implementation
  blockers for WP41: real xAI entitlement/secrets; experiment and daily spend,
  tool, concurrency, sample and circuit-breaker caps; assisted promotion
  evidence/approval; and WP51 consent, reviewer-count, export, retention, and
  privacy policy.
