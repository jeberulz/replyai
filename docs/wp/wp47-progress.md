# WP47 progress — Blind generation + discovery review UI

## 2026-07-11 — Start

- Assignment: WP47 blind generation + discovery review UI in the isolated
  `replyai-wp47` worktree on branch `feat/wp47-blind-review-ui`.
- Required docs read before editing: `AGENTS.md`,
  `docs/AGENT_PLAYBOOK.md`, `PRD.md`, the WP47 row in
  `docs/PRODUCT_STRATEGY.md`, `design.md`, WP45/WP46 progress notes,
  `docs/wp/RULINGS.md`, `convex/_generated/ai/guidelines.md`, and local Next
  App Router/Server Actions/accessibility docs under `node_modules/next/dist/docs/`.
- Ran required Astryx discovery before UI work:
  `npm run astryx -- build "Blind Evaluation Lab review UI with stored-seed A/B candidate comparison and discovery relevance labeling"`,
  `npm run astryx -- search "review form radio group keyboard mobile labels"`,
  and `npm run astryx -- component Card`.
- Scope boundary: no results/statistics/reveal/decision UI, no pipeline review,
  no scanner/shadow/assisted integration, no production routing, no customer
  provider picker, and no X publish/schedule automation.

## 2026-07-11 — Implementation

- Added `shared/evalReview.ts` for pure review contracts: stored-seed/blind-key
  ordering, generation pair assignments, discovery single-output assignments,
  submission validation, assignment IDs, and append-only reviewer revision
  calculation.
- Added `convex/evalReview.ts` with operator-only public `queue` and `submit`
  functions. Queue returns blind payloads plus audit counters; submit re-reads
  stored outputs, re-derives the assignment server-side, validates the submitted
  labels, and inserts a new `evalJudgments` row instead of overwriting.
- Added `/evals/[experimentId]/review` route/actions/components using native
  form controls, fieldsets/legends, Dark Chrome surfaces, and mobile-safe
  `min-h-11` controls. The UI renders only blind labels/keys and output
  content; provider/model/candidate identities stay out of the route payload.
- Added a `Review` link from the existing eval table once a run exists.

## 2026-07-11 — Gotchas

- `npm install` was needed locally to read `node_modules/next/dist/docs`, but it
  caused package-lock peer metadata churn. The lockfile churn was reverted
  because WP47 does not require dependency changes.
- Pipeline experiments are explicitly shown as deferred in the review route.
  WP47 covers generation and discovery review only; pipeline aggregation belongs
  with later results/decision work.

## 2026-07-11 — Verification

- Focused: `npx vitest run tests/evalReview.test.ts tests/evalLabUi.test.ts tests/evalRunner.test.ts` — passed, 3 files / 15 tests.
- Typecheck: `npm run typecheck` — passed.
- Lint: `npm run lint` — passed with the existing generated-file unused
  `eslint-disable` warnings only.
- Full tests: `npm test -- --run` — passed, 68 files passed, 1 skipped, 544
  tests passed, 1 skipped.
- Build: `npm run build` — passed; `/evals/[experimentId]/review` is dynamic
  in the route output.
- Whitespace: `git diff --check` — passed.

## 2026-07-11 — Review fix: blind queue payload

- Removed the top-level `judgments` array from `convex/evalReview.queue`.
  Queue still reads judgment rows internally to compute per-item
  `judgmentCount`, `reviewerRevisionCount`, and the current reviewer’s latest
  metadata, but it no longer returns peer choices, labels, reason codes, or
  reviewer IDs in the blind review payload.
- Added a regression assertion to `tests/evalReview.test.ts` so the queue source
  cannot reintroduce the peer judgment mapping.
- Focused verification: `npx vitest run tests/evalReview.test.ts tests/securityAudit.test.ts` — passed, 2 files / 6 tests.
- Typecheck: `npm run typecheck` — passed.
- Whitespace: `git diff --check` — passed.
