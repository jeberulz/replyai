# WP48 progress — Evaluation results, statistics + explicit decisions

## 2026-07-11 — Start

- Assignment: WP48 evaluation results, statistics, exports, and explicit
  decisions in the isolated `replyai-wp48` worktree on branch
  `feat/wp48-eval-results-decisions`.
- Required docs read before editing: `AGENTS.md`,
  `docs/AGENT_PLAYBOOK.md`, `PRD.md`, the WP48 row in
  `docs/PRODUCT_STRATEGY.md`, `design.md`, WP45/WP46/WP47 progress notes,
  `docs/wp/RULINGS.md`, and `convex/_generated/ai/guidelines.md`.
- Loaded local Next 16 docs after restoring dependencies with `npm ci`:
  App Router layouts/pages, Server/Client Components, Server Actions/forms,
  and async dynamic params/cookies guidance.
- Ran required Astryx discovery before UI work:
  `npm run astryx -- build "Evaluation results dashboard with operator decisions, statistical warnings, exports, and case drill-down"`,
  `npm run astryx -- search "results table statistics confidence interval decision panel"`,
  and `npm run astryx -- component Card`. The implementation will use dense
  tables/sections for evidence and reserve cards for discrete metric/decision
  widgets, mapped to Dark Chrome tokens.
- Scope boundary: no scanner/shadow/assisted integration, no production routing
  changes, no customer provider picker, no X publish/schedule automation, and
  no changes to the blind review payload that would reveal model identity.

## 2026-07-11 — Implementation notes

- Results should reveal frozen provider/model identities only on the operator
  results route/export after review exists; `/evals/[experimentId]/review`
  remains blind.
- Decisions are append-only evidence records in `evalDecisions`; promote labels
  are recommendations for later WPs and must not mutate routing.
