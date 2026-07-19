# WP47 stories — Blind generation + discovery review UI

## Definition of done from §14

Stored-seed candidate order and labels remain blind until submission; generation
supports A/B/tie/neither plus reason codes, discovery requires relevance with
optional actionability/novelty/unsafe/stale/duplicate labels; independent
reviews are auditable and cannot overwrite each other; keyboard and
mobile/desktop checks pass.

## Stories

- [x] **WP47-S1 — Shared blind assignment contract**
  - Acceptance criteria:
    - Completed generation outputs are grouped by case and assigned A/B labels
      from stored seed + blind keys, without provider/model identifiers.
    - Completed discovery outputs become single-output blind review items.
    - Submission validation enforces generation A/B/tie/neither plus at least
      one reason code, and discovery relevant/not relevant plus optional labels.

- [x] **WP47-S2 — Operator-only Convex review API**
  - Acceptance criteria:
    - Public review functions authorize through `requireEvalOperator`.
    - Queue reads return only blind review payloads and audit counters, not
      candidate/provider/model identity.
    - Submit re-derives the assignment server-side and inserts a new
      `evalJudgments` row with the next reviewer revision.

- [x] **WP47-S3 — Review route/actions/components**
  - Acceptance criteria:
    - `/evals/[experimentId]/review` is operator-only through route actions.
    - Generation forms expose A/B/tie/neither and reason-code checkboxes.
    - Discovery forms require relevance and expose optional actionability,
      novelty, unsafe, stale, and duplicate labels.
    - Native form controls, fieldsets/legends, and `min-h-11` targets support
      keyboard and mobile use.

- [x] **WP47-S4 — Focused tests and docs**
  - Acceptance criteria:
    - Shared blind ordering, validation, and append-only revision helpers are
      covered by Vitest.
    - Source-level tests cover review route/component accessibility and
      blinding contracts.
    - Progress notes document scope, decisions, and verification.
