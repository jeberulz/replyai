# WP52 Progress - Compose Activation and Evidence

Append-only implementation log. Record decisions, verification, dead ends,
reviewer findings, and DoD evidence. Never record secrets, session tokens,
OAuth tokens, private user content, prompt text, raw provider errors, or
customer-identifying data.

## 2026-07-11 - Registration scaffold

- Assignment source: `tasks/prd-compose-activation-and-evidence.md`, provided
  through the pasted instructions for this run.
- Orchestrator role: writes zero product code. Product implementation is owned
  by a bounded implementation worker after registration sequencing is clean.
- Latest fetched `origin/main`: `b61b5001f2680eaf112cee4fb6adc2fbd5726d3c`
  (`Merge pull request #60 from jeberulz/claude/x-signin-failures-9cqwv8`).
- Dependency state:
  - WP23 branch is merged into `origin/main`.
  - WP40 branch is merged into `origin/main` through S7 plus later cap docs; the
    original WP40 production-gate S8/S9 remain unchecked in the WP40 story file,
    so WP52 treats only the merged private-beta foundation as available.
  - WP41-WP51 are registered in open draft PR #61
    (`docs/wp41-grok-eval-program`) and are not yet on `origin/main`.
- Identifier audit:
  - `origin/main` section 14 currently tops out at WP40.
  - PR #61 reserves WP41-WP51 for the Grok + Evaluation Lab program.
  - WP52 is the next available identifier after that reserved range.
- Branch/sequencing:
  - Registration scaffold branch:
    `docs/wp52-compose-registration`, worktree
    `/Users/jeberulz/Documents/AI-projects/replyai-wp52-registration`.
  - This branch is intentionally stacked on
    `origin/docs/wp41-grok-eval-program` at
    `7ecd2d9e69a81f5a950f925e9e0d554e88b9708f` to avoid colliding with PR #61.
  - Implementation must start from a clean latest `main` after PR #61 and this
    registration are merged or after the owner gives a different sequencing
    ruling.
- Dirty-worktree inventory before registration:
  - Main checkout branch `main` had pre-existing local changes:
    `M convex/_generated/server.d.ts`, untracked `.claude/launch.json`, and
    untracked `tasks/`.
  - The registration worktree started clean.
- Collision ledger:
  - `docs/PRODUCT_STRATEGY.md` conflicts with PR #61 if edited directly on
    `main`; registration is therefore stacked on PR #61.
  - No product-code file ownership assigned yet.
  - Potential WP52 implementation collisions remain navigation, analytics
    catalog, `src/lib/ai.ts`, `convex/schema.ts`, and Compose. The
    implementation worker must re-check active branches before product edits.
- File boundary: see `docs/wp/wp52-stories.md`.
- Initial full-check status:
  - Full app checks were not run in this registration worktree because it is an
    isolated git worktree without `node_modules` and only docs/scaffold files
    are changed.
  - The implementation branch must record the first full check output before
    product-code edits.
- Model-routing ledger resolved against the available sub-agent schema:

| Role | Model | Reasoning effort | Purpose |
|---|---|---|---|
| Orchestrator | inherited current session model | high judgment held locally | Holds product decisions, sequencing, file boundaries, and final go/no-go; writes zero product code |
| WP52 implementation worker | `gpt-5.6-terra` | medium | Sequential S1-S6 implementation with focused tests; raise only if schema/client-server issues stall |
| Eligibility/provenance/security reviewer | `gpt-5.6-sol` | high | Adversarial auth isolation, legacy schema compatibility, provenance truth, and publish-invariant review |
| UI/accessibility/analytics reviewer | `gpt-5.6-terra` | medium | Navigation states, responsive behavior, duplicate events, copy semantics, and Dark Chrome compliance |
| Final gate runner | `gpt-5.6-luna` | low | Mechanical final checks and evidence capture after fixes; no architecture rulings |

- Required docs read by orchestrator before scaffold: `PRD.md`, `AGENTS.md`,
  `docs/AGENT_PLAYBOOK.md`, `docs/PRODUCT_STRATEGY.md`,
  `tasks/prd-compose-activation-and-evidence.md`, `docs/wp/RULINGS.md`,
  WP23 stories/progress, WP40 brief/stories/progress, `design.md`,
  `convex/_generated/ai/guidelines.md`, and relevant local Next docs under
  `node_modules/next/dist/docs/`.

## 2026-07-11 - Registration PR current state and implementation audit

- Current fetched `origin/main`: `01eff2911db69325696b00e213f12cdb67777356`
  (`Merge pull request #61 from jeberulz/docs/wp41-grok-eval-program`).
- PR #61 is now merged; WP41-WP51 are on `origin/main`.
- WP52 registration PR #62 is open, draft, mergeable, and targets `main`.
  Head: `af105840fd0275e090e22865e170926c1e3f9365`.
- The main checkout remains pre-existing dirty and behind `origin/main`, so all
  further work must continue in isolated worktrees.
- Sequencing status:
  - The playbook/PRD path still requires this WP52 registration to land before
    the implementation branch exists.
  - No implementation worker has been spawned and no product code has been
    edited for WP52.
  - Next official branch after #62 lands:
    `feat/wp52-compose-activation-evidence` from clean latest `main`.

Read-only implementation audit against the current code:

- `shared/compose.ts`
  - `isWinningReply` already captures the locked WP23 semantics:
    responded, non-empty reply text, reject `major_edit`, accept legacy missing
    edit bucket.
  - Worker should reuse/extract this pure predicate for availability rather
    than duplicating the rules.
- `convex/compose.ts`
  - `listClusters` currently authorizes with `requireUser`, scans recent
    trackers, hydrates drafts/replies/analyses/opportunities, and returns full
    reply text. This is too expensive and too revealing for nav availability.
  - No lightweight `hasRealSource` availability query exists.
  - Demo fallback is expressed as `demo: true` plus returned demo clusters.
- `src/app/actions.ts`
  - `startComposeAction` re-queries clusters but persists/generates from the
    client-supplied `TopicCluster` object. WP52 must instead accept a stable
    cluster ID and resolve authorized prompt context server-side.
  - The action records fair-use and AI spend before generation. Preview/direct
    deterministic generation must bypass paid-model tokens and generation
    allowance per the PRD.
  - `generateComposeOptions` returns `{ demo: boolean }`, but `completeRun`
    does not persist actual generation provenance.
- `convex/schema.ts`
  - `composeRuns.demo` is required and currently conflates source material and
    generation result.
  - WP52 schema work should be additive/optional-first, e.g. separate source and
    generation provenance fields while keeping legacy rows readable.
- `src/components/app/compose-ladder.tsx`
  - Direct `/compose` already remains authenticated and reachable.
  - Current UI labels only `Demo clusters`; it does not clearly separate
    example source material from deterministic/fallback generation.
  - Standalone CTA currently says `Publish standalone`; success toast says
    `Publishing... confirm in Drafts`. WP52-S6 must change this to immediate
    queued semantics (`Post now`; Drafts shows status).
- Navigation
  - `src/components/app/sidebar/nav-links.ts` statically includes Compose as
    the second primary nav item.
  - `SidebarNav` and `CommandMenu` both consume `navLinks`, so the worker should
    implement a single explicit availability filter/capability and apply it to
    both consumers. Loading/error states must hide Compose.
- Analytics
  - The typed catalog has the main funnel only; no Compose open/generation/
    option-action event family exists.
  - Existing adapters no-op safely with no keys and should be reused.
  - Successful Compose save/publish option events should be emitted only after
    the relevant mutation succeeds; queued standalone publish is not the
    existing authoritative `published` event.
- Tests/docs
  - Existing focused files: `tests/compose.test.ts`,
    `tests/compose-demo.test.ts`, `tests/analytics.test.ts`, `tests/publish.test.ts`,
    and `playwright/mobile-375.e2e.ts`.
  - `docs/observability.md` does not yet define a Compose evidence funnel.

Implementation worker handoff once registration lands:

1. Create isolated worktree/branch `feat/wp52-compose-activation-evidence` from
   clean latest `main`.
2. Re-run collision check for navigation, analytics catalog, `src/lib/ai.ts`,
   `convex/schema.ts`, `convex/compose.ts`, and `shared/compose.ts`.
3. Record the new base SHA and initial full-check status in this file.
4. Execute S1-S6 sequentially, one commit per story after the story checks pass.
5. Do not edit `docs/PRODUCT_STRATEGY.md` on the implementation branch unless
   an owner ruling changes the registered package.
