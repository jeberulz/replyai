# Agent Build Playbook — ReplyPilot AI

**Audience: any agent (or human) assigned a work package.** Read this file
top to bottom before writing code. It defines how work packages from
`docs/PRODUCT_STRATEGY.md` §14 get built, reviewed, and merged. If anything
here conflicts with `PRD.md`, the PRD wins; if it conflicts with
`AGENTS.md`/`CLAUDE.md`, those win — this file adds process, it does not
override product truth.

---

## 0. Your assignment

You own **exactly one work package (WP)** from the table in
`docs/PRODUCT_STRATEGY.md` §14. Your assignment message names it
(e.g. "you own WP7"). If no WP was named, stop and ask — do not pick one
yourself.

Read, in this order, before your first edit:

1. `PRD.md` — the product source of truth.
2. `AGENTS.md` — project notes, permanent constraints, checks.
3. `docs/PRODUCT_STRATEGY.md` — at minimum: §4 (guardrails), your WP's row
   in §14, and every section your WP row or its description references.
   If your WP came from the feature review (WP16–WP23), read that review
   subsection — it contains the code-level rationale for your task.
4. `convex/_generated/ai/guidelines.md` — before touching any Convex code.
5. The relevant guide in `node_modules/next/dist/docs/` — before touching
   Next.js code; this Next version differs from training data.
6. `design.md` — before touching UI.

## 1. Branch & PR protocol

- **One WP = one branch = one PR.** Branch from the latest `main`, named
  `feat/wpNN-short-slug` (e.g. `feat/wp07-reply-back-tracker`). Docs-only
  changes use `docs/` prefix instead of `feat/`.
- Never commit to `main` directly. Never push to another WP's branch.
  Never create integration branches that combine multiple WPs.
- Rebase on `main` before opening the PR and again before merge if `main`
  moved.
- Keep the PR reviewable: if your WP is honestly too big for one PR, split
  it into sequential PRs on the same branch lineage (part 1 merges before
  part 2 opens) — not parallel branches.
- PR description must include: the WP number and its Definition of Done
  copied from §14, what you built, how you verified each DoD item, and any
  deliberate deviations (with reasons).
- Do not merge your own PR unless your assignment explicitly says so.
  Default: a human (or designated reviewer agent) merges.

## 2. Sequencing & file-collision rules

Waves (from the delivery plan — do not start a wave-2 WP while its blocker
is unmerged):

| Wave | WPs | Notes |
|---|---|---|
| 0 (sequential) | WP4 → WP5 | Observability, then the eval CI gate. These are the safety net; they land before everything else. |
| 1 (parallel) | WP1, WP2, WP6, WP16, WP19, WP20 | Mostly disjoint files. |
| 2 (parallel) | WP3, WP7, WP17 (after WP16 merges), WP18, WP22 | |
| 3 | WP8–WP15, WP21, WP23 | Per the phase plan in §10. |

Known collisions — check before you start; if the other WP's branch is
open, coordinate or wait:

- **WP16 and WP17 both edit `src/lib/ai.ts`** — WP16 merges first, WP17
  rebases on it.
- **WP2 and WP3 both touch the settings UI** — whoever opens second
  rebases.
- **WP4 touches instrumentation everywhere** — it merges before wave 1.

Dependencies that override wave order: nothing that consumes outcome data
(`responded`, reply-back rates) ships its user-facing surface before WP7 is
merged and producing data; WP20's edit-distance buckets must exist before
anyone reports north-star numbers anywhere.

Two sequencing principles on top of the table:

- **Risk order beats convenience order.** Within any wave, do reversible
  work first and irreversible work last. Anything touching production
  data, schema, or live user tokens goes at the end of its wave, behind
  its own gate (§7).
- **Explicit file boundaries.** Your assignment's file scope (the "key
  files" column plus what your stories require) is a boundary, not a
  hint. If your WP turns out to need edits outside it, that's an
  escalation (§7), not a judgment call — another agent may own those
  files right now.

## 3. Product guardrails — non-negotiable

These come from `PRD.md`/`AGENTS.md` and apply to every WP. A PR that
violates any of them gets closed, regardless of how good the code is.

1. **No auto-publish path, ever.** A human clicks send on every post.
   Scheduling counts as approval of that exact text at that time. No agent
   tool, cron, or API endpoint may reach a publish mutation without an
   authenticated user click on that specific draft.
2. **3 generated options per request** with a "generate more" button.
   Never 10.
3. **Reasons, not scores.** No fake-precision numbers in the UI. Internal
   ranking weights and heuristic scores are never surfaced as ML
   percentages or engagement predictions. Numbers shown to users must be
   backed by real, observed data.
4. **Every Convex query/mutation/action authorizes** via
   `requireUser(ctx, sessionToken)` (`convex/helpers.ts`) unless it is an
   internal function or on the explicit public allow-list (OAuth helpers).
5. **Demo mode never breaks.** Missing `X_CLIENT_ID`/`ANTHROPIC_API_KEY`
   must never break a flow. Every new integration ships with a
   deterministic fallback (`shared/demoData.ts` or demo branches in
   `src/lib/ai.ts` / `src/lib/x.ts`) in the same PR.
6. **Respect the X API reply restriction** (Feb 2026): parse publish
   failures via `shared/xErrors.ts`; always offer the standalone fallback.
7. **External content is untrusted input.** Tweet text, bios, and replies
   go into prompts as delimited data, never as instructions; LLM outputs
   are zod-validated; never render fetched content as HTML.

## 4. Scope discipline

- Build your WP. Nothing else. If you find an adjacent bug or improvement,
  write it in the PR description under "Found, not fixed" — do not fix it
  unless it blocks your DoD.
- No schema changes beyond what your WP requires. Schema changes must be
  additive/optional-first (see the Convex migration guidance) — never
  break existing rows.
- No new dependencies without stating why in the PR description. Prefer
  what's already in `package.json`.
- No refactors of code you aren't otherwise touching.
- If your WP's description is ambiguous, or you'd need to make a product
  decision the strategy doc doesn't settle: **stop and ask.** Do not guess
  product behavior. Technical implementation choices within the DoD are
  yours to make.
- **UNKNOWN means stop; rulings get recorded.** When you hit something the
  strategy doc and PRD are silent on, treat it as UNKNOWN: escalate per
  §7, and when the owner rules, **append the ruling to
  `docs/wp/RULINGS.md`** (append-only: date, WP, question, ruling). Check
  that file before escalating — the question may already be answered.
  Rulings are inherited: no later agent re-litigates a recorded ruling.

## 5. The story loop — how to work inside your WP

(Adapted from the Ralph/Antfarm pattern: atomic stories, checked-in state,
fresh-context-safe iterations.)

Before your first code edit, decompose your WP's Definition of Done into
**atomic stories** and check them in as `docs/wp/wpNN-stories.md` on your
branch — a checklist where each story has an id, a one-line title, and
concrete acceptance criteria. Size each story to be completable and
verifiable in one sitting ("add the outcome index + query", "wire the
dashboard card") — "build the tracker" is not a story, it's the WP.

Then loop:

1. Pick the highest-priority unchecked story. **One story at a time.**
2. Implement it. Run `npm run typecheck && npm test` (plus lint/build when
   the story warrants).
3. **Commit only when checks pass**, one commit per story, message
   referencing the story id. UI stories: verify the actual flow in the
   running app (`/verify`), not just the compile.
4. Mark the story checked in `wpNN-stories.md` and append what you learned
   to `docs/wp/wpNN-progress.md` (append-only: decisions made, dead ends,
   gotchas the next iteration or a replacement agent needs).
5. Repeat until every story is checked, then do the §6 PR pass.

Why this is mandatory: sessions are ephemeral and context gets compacted.
The branch itself must carry your state — a fresh agent (or you, after a
context loss) must be able to resume from `git log` + the stories file +
the progress file alone, without the chat transcript. The two `docs/wp/`
files are working artifacts: keep them in the PR (they double as the
review map), but they are not product documentation.

Verification is adversarial by design: the `/code-review` pass and the
merging reviewer check your *stories' acceptance criteria against actual
behavior*, not your claims. Write acceptance criteria you'd be willing to
be graded on.

## 6. Definition of done — every PR

1. Your WP row's "Definition of done" from §14 is satisfied, item by item,
   and every story in `docs/wp/wpNN-stories.md` is checked with its
   acceptance criteria actually met.
2. `npm run typecheck && npm run lint && npm test && npm run build` all
   pass locally.
3. New logic in `shared/` has unit tests in `tests/` (this repo's
   convention: scoring, voice, filters, and error parsing are all tested —
   match that bar).
4. Demo mode exercised end-to-end for any flow you touched (the app runs
   with zero external keys; that must still be true).
5. Anything touching auth, tokens, publishing, or prompts: run
   `/security-review` and address findings before requesting review.
6. Run `/code-review` on your diff and address correctness findings.
7. Commits are clean and descriptive. Do not include model identifiers in
   commits, code comments, or PR text.

## 7. Orchestration protocol — parent, workers, gates

(Adapted from the orchestrator/worker program-management pattern: one
session plans and sequences, workers execute, gates run between waves,
humans decide only what requires an owner.)

**The orchestrator.** When multiple WPs run in parallel, one session is
the designated orchestrator. It **writes zero code.** Its job: assign WPs
with explicit file boundaries, track wave state, review worker PRs against
their stories files, run the escalation ledger (`docs/wp/RULINGS.md`),
enforce gates, and surface to the owner only what genuinely needs an owner
— scope rulings and go/no-go on irreversible steps. Keeping the
orchestrator out of implementation keeps its context clean; that is the
point. If you are a worker, you are not the orchestrator: don't reassign
scope, don't merge, don't rule on UNKNOWNs.

**Escalation path (defined now, before the surprises).** When reality
disagrees with your assignment — a file you need is outside your boundary,
the strategy doc's assumption is wrong, a "safe" change turns out to have
live dependents — **stop, report to the orchestrator (or the owner if
there is no orchestrator session), and do not improvise.** The outcome
will be one of: a recorded ruling, your WP re-scoped, or the conflicting
work re-sequenced. Workers never make scope decisions unilaterally.

**Wave gates.** A wave is not done when its PRs merge; it is done when the
gate passes. The gate is its own session (or a dedicated fresh-context
run) that, on post-merge `main`: runs the full check suite, runs the eval
fixtures (once WP5 exists), and walks the three critical flows in demo
mode end to end (analyze→generate→save, feed→opportunity→draft,
draft→publish). A gate failure produces a scoped fix assignment — that is
the system working, not a crisis. The next wave starts only after the
gate is green.

**Irreversible steps: propose the inventory, approve the list.** For
anything destructive or hard to reverse — schema migrations beyond
additive-optional, backfills, data deletion/rewrites, changes to live user
tokens, anything touching production data:

1. Tag a restore point (`git tag` before the change lands; for data,
   confirm what backup/restore path exists and state it).
2. Produce a **dry-run inventory first**: exactly what will change — which
   tables, which fields, how many rows, which code paths. 
3. The owner approves that specific inventory, not the general intention.
4. Execute exactly the approved inventory; re-verify counts after.
5. Follow the widen-migrate-narrow pattern for schema changes (see the
   convex-migration-helper skill) — irreversible narrowing goes last,
   behind its own approval.

**Model routing policy.** Worker sessions inherit the orchestrator's model
unless a model is set at spawn — never leave it to the default. The
orchestrator sets the model per assignment, matching cost to the task's
correctness risk, not its size:

| Task | Tier | Rationale |
|---|---|---|
| Orchestrator itself | top (Fable/Opus-class) | Holds the whole program; judgment-dense, low token volume |
| Security-critical or architecture-heavy WPs (e.g. WP1, WP7, WP16) | high (Opus-class) | Correctness risk outweighs model cost |
| Standard feature WPs with clear stories (e.g. WP2, WP6, WP20, WP22) | mid (Sonnet-class) | Well-specified stories are where mid-tier models perform closest to top-tier |
| Mechanical/low-risk work: docs updates, gate-runner sessions, story scaffolding, event wiring | mid or low (Sonnet/Haiku-class) | Gates and adversarial review catch mistakes |

The story loop (§5) is what makes cheap workers safe: atomic stories,
acceptance criteria, and checks-gated commits reduce the judgment each
worker must exercise. Spend model quality on the orchestrator, reviews,
and gates — not uniformly on workers. If a worker on a cheaper model
stalls or repeatedly fails its gate, the orchestrator re-runs that
assignment one tier up rather than debugging the model choice.

**Docs are load-bearing infrastructure.** In an agent-built repo, stale
instructions produce confidently wrong future agents. Any WP that changes
architecture, conventions, schema shape, or workflows must update the
affected docs (`AGENTS.md`, `README.md`, `design.md`, skills, this file)
**in the same PR** — not as a follow-up. The orchestrator checks this at
the gate. At the end of each phase, one cleanup session re-reads the docs
against the actual codebase and fixes drift.

## 8. Working agreement

- **Small and merged beats big and perfect.** Bias toward the smallest PR
  that satisfies the DoD.
- **Report honestly.** If tests fail, say so with the output. If a DoD
  item is unmet, say which and why. Never claim verification you didn't
  perform.
- **When blocked, surface it** — in the PR or to the user — rather than
  going quiet or working around it silently.
- Update `docs/PRODUCT_STRATEGY.md` only if your WP *changes* the plan
  (e.g. a DoD item proves infeasible); note the change in your PR. Product
  truth changes go to `PRD.md` only via the user.
