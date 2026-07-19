# Multi-Agent Orchestrator Prompt: Build WP52 Compose Activation and Evidence

Copy everything below this line into a new Codex task from the repository root.

---

You are the implementation orchestrator for ReplyPilot AI. Build the approved
Compose activation and evidence PRD:

- `tasks/prd-compose-activation-and-evidence.md`

Your objective is to deliver WP52 through implementation, verification,
adversarial review, and PR-ready completion. Do not merely write a plan. The
orchestrator writes zero product code; bounded worker and reviewer sub-agents do
the implementation and checks.

## Mandatory operating model

Follow `docs/AGENT_PLAYBOOK.md` exactly.

- One WP52 implementation branch = one implementation PR.
- Use sequential atomic stories on the WP52 branch. Do not split this feature
  into backend and UI implementation PRs.
- The implementation worker owns the branch; the orchestrator does not edit
  product code.
- Use isolated worktrees for write agents. Do not switch a shared dirty
  checkout between branches.
- Do not assign overlapping writable file ownership to two live agents.
- Preserve all user-owned and unrelated workspace changes.
- Do not merge the PR without explicit owner authorization.
- No auto-publish path, new publishing mode, thread API publishing, or
  long-form API publishing may be introduced.
- Compose continues to generate exactly three options with Generate more.
- Demo mode and zero-key CI must remain deterministic and functional.

At the start, read these files completely and in this order:

1. `PRD.md`
2. `AGENTS.md`
3. `docs/AGENT_PLAYBOOK.md`
4. `docs/PRODUCT_STRATEGY.md`, especially sections 4, 5.5, 10, 11, and 14
5. `tasks/prd-compose-activation-and-evidence.md`
6. `docs/wp/RULINGS.md`
7. `docs/wp/wp23-stories.md` and `docs/wp/wp23-progress.md`
8. `docs/wp/WP40-FIRST-10-BETA-LAUNCH-GATE.md`,
   `docs/wp/wp40-stories.md`, and `docs/wp/wp40-progress.md`
9. `design.md`
10. `convex/_generated/ai/guidelines.md` before planning Convex edits
11. Relevant guides in `node_modules/next/dist/docs/` before planning Next.js,
    Server Action, client/server boundary, or rendering changes

Then inspect the latest implementation rather than assuming the PRD's audited
line numbers are current. At minimum inspect:

- `shared/compose.ts`
- `convex/compose.ts`
- `convex/schema.ts` (`composeRuns`, `savedDrafts`, outcome trackers)
- `convex/outcomes.ts`
- `src/lib/ai.ts` compose generation and fallback behavior
- `src/app/actions.ts` compose actions
- `src/components/app/compose-ladder.tsx`
- `src/components/app/sidebar/nav-links.ts`
- `src/components/app/sidebar/sidebar-nav.tsx`
- `src/components/app/command-menu.tsx`
- `src/components/app/nav.tsx` and app-shell composition
- `src/lib/analytics/events.ts`
- `src/lib/analytics/server.ts`
- `src/lib/analytics/client.ts`
- `convex/lib/analytics.ts`
- `docs/observability.md`
- Compose, analytics, navigation, publish, and responsive tests

## Phase 0: establish a clean, official WP52

Before spawning an implementation worker:

1. Fetch and inspect latest `main`; do not implement from a stale checkout.
2. Confirm that WP23 and the relevant WP40 work are merged on the chosen base.
3. Audit the highest WP number in `docs/PRODUCT_STRATEGY.md` section 14.
4. Confirm that the Grok/Evaluation Lab program reserves WP41–WP51. If WP52 is
   available, register the exact row proposed in the PRD. If it is already
   occupied, use the next available identifier consistently and report the
   renumbering to the owner.
5. If the playbook requires the strategy registration to land before the
   implementation branch exists, handle it as a tiny docs-only preparatory PR.
   It does not count as splitting WP52 implementation. Do not let an
   implementation worker edit the strategy concurrently.
6. Create the implementation branch from the resulting clean latest `main`,
   named `feat/wp52-compose-activation-evidence` (adjust the number only if the
   identifier changed).
7. Create and commit `docs/wp/wp52-stories.md` and append-only
   `docs/wp/wp52-progress.md` before product-code edits.
8. Record the base SHA, dependency state, current dirty-worktree inventory,
   file boundary, collisions, initial full-check status, and model-routing
   ledger in the progress file.

If another branch currently edits navigation, the analytics catalog,
`src/lib/ai.ts`, `convex/schema.ts`, or Compose, stop and sequence the work. Do
not improvise around file collisions.

## Locked product decisions

Do not reopen these decisions unless implementation evidence makes one unsafe
or impossible. If that happens, use the playbook's UNKNOWN/ruling process.

- Scope is the full activation package: navigation gating, real-win unlock,
  source/generation provenance, Compose analytics, and immediate-publish copy.
- `/compose` remains directly reachable for every authenticated user.
- Compose is absent from sidebar and command navigation until the authenticated
  user has a real qualifying reply win.
- Loading or availability-query errors fail closed for nav visibility.
- The existing WP23 winning-reply semantics remain unchanged.
- Direct visits before unlock show a clearly labelled example preview; they do
  not redirect or 404.
- Source provenance and generation provenance are separate.
- Persisted generation provenance is based on the actual generation result,
  including deterministic fallback after a model error.
- User-facing fallback copy is provider-neutral and reveals no key names,
  configuration, raw errors, or secrets.
- The standalone CTA communicates immediate posting/queueing. Drafts shows
  status; it is not a second confirmation step.
- No confirmation modal is added.
- Existing `published` remains the authoritative event for actual X publish
  success.
- No paywall, plan, entitlement, scanner, notification, outcome-poller, or
  ranking changes belong in WP52.
- Demo identities never qualify for the real-source navigation unlock.
- Direct/sample preview generation is deterministic, zero-token, and does not
  consume paid-model or generation-allowance budget.
- Real runs resolve their cluster from authenticated server-side data by stable
  ID; client-supplied cluster text, reply text, angles, and draft IDs are not
  authoritative.

## Required story decomposition

Use the PRD's stories as the baseline and preserve their order unless a
dependency discovered on latest `main` requires a recorded change:

1. **WP52-S1 — Register/scaffold and baseline.** Official row, story/progress
   files, initial tests, collision ledger, model-routing ledger.
2. **WP52-S2 — Lightweight authenticated availability.** Shared eligibility
   semantics plus bounded Convex availability query and tests.
3. **WP52-S3 — Earned navigation.** Hide/show Compose consistently in sidebar,
   collapsed rail, mobile drawer, and command menu; direct route remains.
4. **WP52-S4 — Truthful provenance and server-resolved inputs.** Additive run provenance, actual fallback
   propagation, clear preview/live UI, legacy-row compatibility.
5. **WP52-S5 — Typed evidence funnel.** Open, generation outcome, and successful
   option-action events; PostHog insight documentation.
6. **WP52-S6 — Correct immediate-publish semantics.** `Post now`, accurate
   queued/status toast, failure behavior, explicit-click invariant.
7. **WP52-S7 — Full gate and PR evidence.** Checks, responsive verification,
   security review, code review, and DoD mapping.

One implementation worker may execute these stories sequentially on the WP52
branch. Commit only after the story's required checks pass, one commit per
story, then check the story and append learnings to the progress log.

## File ownership

The WP52 implementation worker may own:

- `shared/compose.ts`
- `convex/compose.ts`
- `convex/schema.ts` only for additive Compose provenance
- `src/lib/ai.ts` only within Compose generation/provenance code
- `src/app/actions.ts` only within Compose actions
- `src/lib/analytics/events.ts`
- `src/components/app/compose-ladder.tsx`
- `src/components/app/sidebar/nav-links.ts`
- `src/components/app/sidebar/sidebar-nav.tsx`
- `src/components/app/command-menu.tsx`
- Narrow app-shell/nav files only when proven necessary
- Focused `tests/` files
- `docs/observability.md`
- `docs/wp/wp52-stories.md`
- `docs/wp/wp52-progress.md`

`docs/PRODUCT_STRATEGY.md` is owned only by the registration phase and must not
be edited concurrently by the implementation worker.

Any required edit outside this boundary is an escalation. Do not refactor
unrelated code or fix adjacent findings; record them under `Found, not fixed`.

## Cost-aware model routing — mandatory new practice

The orchestrator must assign model tier and reasoning effort before every
sub-agent is spawned. Workers must not silently inherit an expensive default.

First inspect the current collaboration/spawn tool schema and the available
model catalog. Use actual supported model IDs only. Do not invent model names or
edit user-level Codex configuration.

Create this routing ledger in `wp52-progress.md`, resolved to the closest
available models:

| Role | Capability tier | Reasoning effort | Purpose |
|---|---|---|---|
| Orchestrator | Strongest available / top tier | High | Holds product decisions, sequencing, file boundaries, and final go/no-go; writes zero product code. |
| WP52 implementation worker | Standard general coding tier | Medium, raise to high only for schema/client-server issues | Clear sequential stories with strong tests; a top-tier worker is not cost-justified by default. |
| Eligibility/provenance/security reviewer | Strongest available or senior tier | High | Adversarial review of auth isolation, legacy schema compatibility, provenance truth, and publish invariants. Read-only unless given a scoped fix assignment. |
| UI/accessibility/analytics reviewer | Standard tier | Medium | Review nav states, responsive behavior, duplicate events, copy semantics, and Dark Chrome compliance. Read-only unless given a scoped fix assignment. |
| Final gate runner | Economy/mini tier | Low or medium | Mechanical full checks and evidence collection after fixes; does not make architecture rulings. |

Routing rules:

1. Use explicit `model` and `reasoning_effort` spawn parameters when supported.
2. If spawn-time routing is unavailable, inspect repository/custom agent roles
   for supported per-agent routing.
3. If independent routing is impossible, tell the owner before spawning any
   implementation worker and record that cost routing is unavailable. Do not
   claim this practice is active when all workers inherit one model.
4. Do not block read-only repository inspection while resolving routing.
5. Escalate the implementation worker one tier only if it repeatedly fails a
   story gate, cannot resolve a correctness issue, or a supposedly additive
   schema change proves architecture-heavy.
6. Spend the strongest model on orchestration and adversarial review, not on
   mechanical tests or documentation formatting.
7. Never put model identifiers in source code, commit messages, code comments,
   or PR descriptions. Model routing belongs only in the private progress
   ledger/task coordination.

## Agent schedule

This is one implementation WP, so do not parallelize writes merely to use all
slots.

1. Orchestrator completes Phase 0 and freezes file ownership.
2. Spawn one standard-tier implementation worker in an isolated worktree to
   execute S1–S6 sequentially.
3. The orchestrator reviews every story commit and progress entry before the
   worker starts the next story. If your runtime makes that cadence too costly,
   review at minimum after S2, S4, and S6.
4. After the implementation diff is complete, spawn two read-only reviewers in
   parallel if slots allow:
   - senior eligibility/provenance/security reviewer;
   - standard UI/accessibility/analytics reviewer.
5. Convert each actionable finding into a bounded fix assignment for the same
   implementation worker. Reviewers do not edit the branch concurrently.
6. After fixes, spawn the economy-tier gate runner for mechanical final checks
   and evidence capture.
7. Orchestrator performs the final DoD mapping and prepares the PR. Do not
   merge.

If agents share one filesystem without safe isolated worktrees, serialize all
write work. Read-only reviewers may inspect in parallel only when they cannot
alter the working tree.

## Implementation constraints

- Availability must be materially cheaper than `listClusters`; it must not
  hydrate full analyses/opportunities or return reply content.
- Demo identities never qualify for real-source availability.
- Direct/sample previews must be deterministic, zero-token, and excluded from
  paid-model and generation-allowance consumption.
- Real generation must resolve and authorize a cluster by stable ID on the
  server; never trust client-submitted cluster content as prompt context.
- Extract/reuse pure eligibility rules so availability and clustering cannot
  drift.
- Every public Convex function authorizes with
  `requireUser(ctx, sessionToken)`.
- Cross-user data isolation must be tested.
- Loading and query errors hide the navigation item without breaking the shell.
- Filter both navigation consumers; do not fix only the sidebar while leaving
  Compose exposed in the command menu.
- Keep `/compose` authenticated and directly reachable.
- Any `composeRuns` schema change is additive/optional-first and compatible with
  historical rows. No unapproved backfill.
- Persist actual generation provenance from `generateComposeOptions`; cluster
  demo state alone is insufficient.
- Demo accounts must remain deterministic even when paid model keys exist.
- Analytics properties contain no reply/generated text, prompts, raw provider
  errors, tokens, secrets, or session credentials.
- Use the canonical typed event catalog; no ad-hoc strings.
- Emit successful save/publish-option events only after mutations succeed.
- A queued standalone action is not the same as the existing successful
  `published` event.
- Analytics no-op behavior must remain safe with zero keys.
- Preserve exactly three options, Generate more, reasons-not-scores, and human
  click on every send.
- Use existing Dark Chrome/Astryx adapters and tokens. Do not invent hex colors.
- Primary mobile actions remain at least 44px.
- Do not add dependencies unless the PR explicitly justifies an unavoidable
  need.

## Verification gates

Per story:

- Run `npm run typecheck && npm test` at minimum.
- Add focused tests before marking the story complete.
- UI stories require browser verification of the actual state, not snapshots
  alone.

Final gate:

```bash
npm run typecheck
npm run lint
npm test
npm run evals
npm run security:audit
npm run extension:build
npm run build
npm run test:mobile
```

Use the exact current package scripts if names changed on latest `main`; record
the command and result honestly. Verify Compose at 375, 768, 1280, and 1728
widths for:

- unavailable/loading/error nav state;
- newly eligible reactive nav state;
- direct preview route;
- real-source route;
- deterministic output badge/copy;
- live-output badge/copy where a safe test harness supports it;
- copy/save action analytics;
- standalone queued success and failure copy using demo/test state, not an
  uncontrolled real X post.

Because WP52 touches authenticated Convex data, model fallback, analytics, and
publishing actions:

- run `/security-review` after implementation and fixes;
- run `/code-review` against the final diff;
- address correctness and security findings before the final gate.

## PR requirements

Prepare, but do not merge, a PR whose description includes:

- WP52 identifier and branch.
- The exact Definition of Done copied from strategy section 14.
- Story-by-story summary.
- Evidence for every DoD item.
- Full command results.
- Browser/responsive verification evidence.
- Security-review and code-review disposition.
- Deliberate deviations with reasons.
- `Found, not fixed` items.
- Confirmation that no auto-publish path, new publish mode, paywall, scanner
  change, or customer-facing provider detail was introduced.
- Confirmation that model identifiers do not appear in commits, source, or PR
  copy.

Stop at PR-ready completion and report the PR URL/branch plus any owner decision
still required. Do not merge without explicit approval.
