# Multi-Agent Orchestrator Prompt: Build Grok Discovery and the Model Evaluation Lab

Copy everything below this line into a new Codex task from the repository root.

---

You are the implementation orchestrator for ReplyPilot AI. Build the two
approved PRDs in this repository using multiple implementation agents:

1. `tasks/prd-grok-assisted-x-discovery.md`
2. `tasks/prd-model-evaluation-lab.md`

Your objective is to deliver a production-quality, provider-neutral Grok 4.3
discovery integration and an internal Model Evaluation Lab. Do not merely write
a plan. Coordinate agents through implementation, verification, review, and
PR-ready completion while respecting every rollout gate in the PRDs.

## Mandatory operating model

You are the orchestrator. Follow `docs/AGENT_PLAYBOOK.md` exactly.

- The orchestrator writes zero product code.
- Use subagents for bounded implementation work packages.
- One work package = one branch = one PR.
- Do not assign two live agents overlapping file ownership.
- Do not merge your own PRs unless the owner explicitly authorizes it.
- Do not enable Grok-assisted production discovery globally. The final state is
  feature-flagged, off or shadow by default, until the documented experiment
  gate is approved by the owner.
- No agent may publish, schedule, inject, or automate an X reply.
- Preserve all user-owned or unrelated workspace changes.

At the start, read these files completely and in this order:

1. `PRD.md`
2. `AGENTS.md`
3. `docs/AGENT_PLAYBOOK.md`
4. `docs/PRODUCT_STRATEGY.md`, especially sections 4 and 14
5. `tasks/prd-grok-assisted-x-discovery.md`
6. `tasks/prd-model-evaluation-lab.md`
7. `docs/wp/RULINGS.md`
8. `design.md`
9. `convex/_generated/ai/guidelines.md` before planning any Convex edits
10. Relevant guides in `node_modules/next/dist/docs/` before planning any
    Next.js route, Server Action, cache, or rendering work

Inspect the current implementation before decomposing work. In particular,
locate and understand:

- `src/lib/ai.ts`
- `src/lib/env.ts`
- `src/app/actions.ts`
- `shared/models.ts`
- `shared/evals.ts`
- `convex/evals.ts`
- `convex/schema.ts`
- `src/components/app/model-eval.tsx`
- Scanner, opportunity, X hydration, spend-limit, analytics, account-export,
  and account-deletion paths

The repository already contains a Claude-only per-analysis model comparison.
Extend and migrate that capability deliberately; do not create a disconnected
duplicate or destroy historical `modelEvals` data.

## Product decisions already made

Do not reopen these decisions unless implementation evidence makes one unsafe or
impossible. If that happens, follow the UNKNOWN/ruling process in the playbook.

- Initial xAI model: pinned `grok-4.3`, not `grok-latest`.
- Initial reasoning effort for X discovery: `low`.
- Verify model entitlement using the authenticated xAI `/v1/models` endpoint.
- Grok's initial production role is X discovery and research.
- Claude remains the default production generation and voice provider.
- X API hydration remains authoritative for post identity, timestamps, metrics,
  personalized sources, and publishing permissions.
- Rollout modes are `off`, `shadow`, and `assisted`.
- Default rollout state is `off` or `shadow`; never globally `assisted`.
- The Model Evaluation Lab is authenticated and server-authorized for product
  operators only.
- The lab supports generation, discovery, and full-pipeline experiments.
- Blind human review and real no/minor-edit behavior outrank LLM-judge scores.
- Existing deterministic evals remain key-free and continue to gate CI.
- No customer-facing provider/model picker is introduced by this program.
- Missing xAI or Anthropic keys must not break demo mode or unrelated flows.

## Phase 0: turn the PRDs into official work packages

Before spawning implementation agents:

1. Audit the current highest work-package number in
   `docs/PRODUCT_STRATEGY.md` section 14.
2. Allocate the next available WP identifiers. Never reuse or renumber an
   existing WP.
3. Add agent-ready rows to section 14 with scope, dependencies, explicit key
   files, and a verifiable Definition of Done.
4. Record a dependency graph and collision matrix.
5. Keep each WP small enough for one reviewable PR.
6. Treat the strategy update as its own docs-only WP/PR if required by the
   playbook. Do not let implementation agents edit the strategy concurrently.

Use the following decomposition as the default. You may split a package further
after inspecting the code, but do not combine packages in ways that create file
collisions or unreviewable PRs.

### WP-A: Provider foundation

Scope:

- Provider-neutral discovery and generation contracts.
- Server-only xAI configuration.
- Pinned-model catalog and actual `/v1/models` entitlement health check.
- xAI usage, latency, tool-call, reasoning-token, cached-token, and cost
  normalization.
- Deterministic zero-key fallback.
- Provider redaction and normalized error handling.

Do not integrate with the scanner or build UI in this package.

### WP-B: Grok X Search and hydration

Depends on WP-A.

Scope:

- xAI Responses API integration using `x_search` and structured output.
- Bounded date/handle/media settings, timeout, result count, reasoning effort,
  and successful-tool-call budget.
- Prompt-injection hardening for all searched X content.
- Citation collection and canonical X URL/post-ID parsing.
- Existing X API hydration before any result is considered valid.
- Discovery-specific deterministic checks and tests.

Do not write to user-visible opportunities in this package.

### WP-C: Evaluation domain and authorization

Can run after WP-A contracts are stable. Avoid files owned by WP-B.

Scope:

- Additive Convex schema for datasets, cases, experiments, runs, outputs, and
  judgments.
- Immutable/versioned experiment inputs and prompt/schema identifiers.
- Server-side operator authorization for every eval page, action, query,
  mutation, export, and job.
- Account export/deletion coverage.
- Existing `modelEvals` historical compatibility.
- Server-maintained candidate catalog; never accept arbitrary provider model IDs
  from the browser.

Do not build the runner or UI in this package.

### WP-D: Bounded experiment runner

Depends on WP-A and WP-C. Integrate WP-B after it merges.

Scope:

- Generation, discovery, and pipeline experiment execution.
- Frozen inputs and deterministic stored random seed.
- Resumable, idempotent background jobs.
- Bounded concurrency, retries, cancellation, and spend/tool-call limits.
- Per-candidate partial failure without discarding successful peers.
- Existing deterministic generation guardrails and new discovery checks.
- Provider-aware configuration and price snapshots.
- Fixture/demo experiments requiring no external keys.

No production routing changes.

### WP-E: Evaluation Lab shell and experiment setup

Depends on WP-C and stable runner actions from WP-D.

Scope:

- `/evals` and `/evals/new`.
- Dense Dark Chrome/Astryx experiment table and filters.
- Versioned dataset/candidate selection.
- Budget, concurrency, case count, cost preview, and explicit start flow.
- Run progress, failure counts, cancellation, and status.
- Authorization checks at the route and action boundaries.
- Responsive and accessible desktop/mobile behavior.

Follow Astryx discovery commands before writing UI. Landing page remains off
Astryx. Dense data uses rows/tables; do not produce a wall of cards.

### WP-F: Blind review and results

Depends on WP-D and WP-E.

Scope:

- `/evals/[experimentId]` and blind review surface.
- Deterministically randomized candidate labels/order.
- Generation pairwise labels: A, B, tie, neither, plus reason codes.
- Discovery labels: relevance required; actionability, novelty, unsafe, stale,
  duplicate optional.
- Reveal provider identity, cost, latency, and judge results only after review.
- Transparent aggregates with numerator, denominator, failures, exclusions,
  minimum-sample warnings, and confidence intervals when valid.
- Drill-down and redacted export.
- Explicit promote-to-shadow, promote-to-assisted, retest, or reject decision
  record that never mutates production routing.

### WP-G: Shadow discovery integration

Depends on WP-B, WP-C, and WP-D.

Scope:

- Deterministic shadow sampling in the scanner.
- Discovery provenance, costs, citations, hydration status, and eval-lab linkage.
- Existing AI/X spend controls, provider circuit breaker, and typed analytics.
- Shadow results must never affect feed ordering, notifications, or surfaced
  content.
- Operational visibility for xAI availability and fallback rates.

### WP-H: Assisted discovery path

Depends on WP-G and is owner-gated by completed experiment evidence.

Scope:

- Allow-listed `assisted` mode only.
- Merge hydrated Grok candidates into existing ranking and opportunity paths.
- Apply all existing safety, relevance, deduplication, freshness, source-diversity,
  author-cooldown, saturation, and score-reason integrity rules.
- Existing deterministic ReplyPilot score remains the only user-visible score.
- One-switch rollback to shadow/off.

You may implement the disabled/allow-listed capability, but do not enable it for
general users. If the experiment gate has not been met, stop at a deployable,
off-by-default implementation and report the pending owner decision.

### WP-I: Production outcome bridge

Last package; depends on the eval lab and existing outcome/edit-distance data.

Scope:

- Link consented selected eval outputs to real selection, edit-distance bucket,
  sent, and responded outcomes where permitted.
- Keep lab preference, LLM judge, deterministic pass rate, and production
  outcomes as separate metrics.
- Add shadow-run automation only after budget and privacy controls are verified.

Do not expand data collection beyond the approved PRDs. Escalate consent or
retention ambiguity instead of guessing.

## Multi-agent scheduling

Spawn agents only for concrete, bounded WPs with non-overlapping file ownership.
Use the dependency graph below as the initial schedule:

1. Strategy/WP registration completes first.
2. WP-A begins.
3. After WP-A contracts stabilize:
   - WP-B may begin.
   - WP-C may begin if its file boundaries do not overlap WP-A's remaining diff.
4. WP-D begins after WP-A and WP-C; integrate WP-B only after WP-B merges.
5. WP-E begins after the UI-facing WP-C/WP-D contracts stabilize.
6. WP-F and WP-G may run in parallel only if their file scopes are disjoint.
7. WP-H remains gated on evaluated evidence and owner approval.
8. WP-I runs last.

If agents share one filesystem, do not let them switch the same worktree between
branches. Use isolated worktrees/branches if the environment supports them;
otherwise serialize write agents and use subagents for read-only review or
research in parallel. Repository integrity is more important than concurrency.

## Agent model and reasoning-effort routing

Cost-aware model routing is mandatory. **The orchestrator assigns the model and
reasoning effort before each agent is spawned. Workers do not choose their own
model, and all workers must not silently inherit the orchestrator's expensive
model by default.**

Before spawning the first worker:

1. Inspect the current multi-agent tool schema and available model catalog.
2. Create a routing ledger listing every WP, its risk class, assigned model,
   assigned reasoning effort, and one-sentence justification.
3. Use explicit `model` and `reasoning_effort` spawn parameters when the current
   runtime exposes them.
4. If direct spawn parameters are unavailable, check whether preconfigured
   custom agent roles/config files provide per-agent model and effort settings.
5. Do not edit user-level Codex configuration or invent unsupported model IDs
   without owner approval.
6. If this runtime cannot route subagents independently, report that limitation
   before spawning implementation workers. Do not claim cost routing is active
   when every worker will inherit one model.

Use the cheapest model/effort combination that is adequate for the WP's risk.
Model names differ by account and runtime, so resolve the current catalog first.
The examples below describe capability tiers; use the closest available model.

### Economy tier

Typical assignment: a current mini coding model, low or medium effort.

Use for:

- Repository inventory and read-only research.
- Docs-only WP registration and progress-file maintenance.
- Mechanical fixture creation from an already-fixed schema.
- Straightforward test expansion with explicit expected behavior.
- Copy changes and low-risk analytics/catalog wiring.

Do not use for security boundaries, data migrations, concurrency, provider
contracts, prompt-injection controls, or final architectural review.

### Standard implementation tier

Typical assignment: a current general coding model, medium effort.

Use for:

- Isolated typed adapters after contracts have been fixed by a senior WP.
- Bounded UI implementation against stable server contracts.
- Deterministic validators and pure shared logic with comprehensive tests.
- Cost/usage display, filters, tables, and accessible interaction work.
- Focused integration work with a narrow file boundary and reversible changes.

Raise effort to high when the same WP crosses server/client authorization,
requires non-trivial state recovery, or changes stored data semantics.

### Senior/high-risk tier

Typical assignment: the strongest available coding model, high effort.

Use for:

- Provider architecture and xAI/Claude contract normalization.
- Authentication, operator authorization, secret handling, and export/deletion.
- Convex schema/migration design and immutable experiment semantics.
- Resumable/idempotent job execution, concurrency, cancellation, and spend caps.
- Prompt-injection defenses, citation integrity, and X hydration gates.
- Shadow/assisted scanner integration and any production-routing change.
- Cross-WP integration review, security review, and final rollout assessment.

Do not use `xhigh` as a default. Reserve it for a documented, unusually difficult
correctness problem after high effort has produced conflicting evidence or a
failed implementation/review cycle.

### Initial WP routing recommendation

Resolve these tiers to actual available model IDs before spawning:

| Work | Model tier | Effort | Reason |
|---|---|---|---|
| Strategy/WP registration | Economy | Low | Docs-only, mechanical decomposition after the PRDs are fixed |
| WP-A provider foundation | Senior | High | Cross-provider contracts, secrets, entitlement and usage semantics |
| WP-B Grok Search/hydration | Senior | High | Untrusted content, citations, external API and hydration security gate |
| WP-C eval domain/auth | Senior | High | Authorization, schema, privacy, export and deletion |
| WP-D experiment runner | Senior | High | Idempotency, concurrency, cancellation and spend enforcement |
| WP-E lab shell/setup UI | Standard | Medium | Bounded UI against stable contracts; escalate auth boundary review separately |
| WP-F blind-review UI | Standard | Medium | Interaction-heavy UI; use Senior/High for statistical aggregation and auth review |
| WP-G shadow integration | Senior | High | Production scanner integration must remain behaviorally invisible |
| WP-H assisted path | Senior | High | User-visible ranking path and rollout safety |
| WP-I outcome bridge | Senior | High | Consent, production outcomes and data semantics |
| Fixture/test expansion | Economy | Medium | Explicit schemas and expected outcomes already defined |
| Final security/integration review | Senior | High | Independent adversarial review across provider and auth boundaries |

Where a row contains both standard UI work and senior backend/statistical work,
split it into separate non-overlapping WPs rather than assigning the strongest
model to the whole mixed package. That split is the preferred cost-saving move.

Start at the recommended tier. Escalate only when one of these is true:

- The agent discovers that the WP crosses a higher-risk boundary than planned.
- A focused implementation fails review for reasoning/correctness, not formatting.
- Two agents produce conflicting technical conclusions that require arbitration.
- The agent reaches a genuine architectural UNKNOWN.

Do not escalate merely because work is long. Do not rerun a completed WP with a
stronger model without identifying the concrete defect being addressed. Record
every escalation in the routing ledger and final cost-control summary.

For every spawned agent, provide:

- Exact WP identifier and objective.
- Explicit assigned model and reasoning effort, plus the risk-based rationale.
- Files/directories it owns and files it must not edit.
- Dependencies and the commit/branch it must start from.
- Definition of Done copied from the official strategy row.
- Required skill/docs to load.
- Required tests and browser flows.
- Explicit instruction to report blockers and UNKNOWNs rather than expand scope.

Every worker must create and maintain:

- `docs/wp/wpNN-stories.md`
- `docs/wp/wpNN-progress.md`

They must implement one atomic story at a time and follow the commit discipline
in `docs/AGENT_PLAYBOOK.md`.

## Hard engineering and product constraints

Enforce these in every WP and review:

- Three generation options per request, with reasons and generate-more support.
- No fake engagement/virality percentages.
- No auto-publish path.
- Every public Convex function validates arguments and authorizes with
  `requireUser`; eval surfaces additionally require operator authorization.
- External posts, bios, replies, citations, and media-derived text are untrusted
  data, never prompt instructions.
- All model outputs are schema-validated.
- Every Grok-discovered post must have a valid X citation and independent X API
  hydration before it can affect a user-visible surface.
- Never send X OAuth tokens, session tokens, provider secrets, private drafts, or
  unnecessary personal data to xAI.
- Never expose provider keys or unrestricted model IDs to the client.
- Missing `XAI_API_KEY`, `ANTHROPIC_API_KEY`, or X credentials must fail soft in
  their respective paths and preserve demo mode.
- Add new product analytics only through the typed event catalog.
- Schema changes are additive/optional-first.
- Store normalized outputs and necessary provenance by default, not raw provider
  reasoning or full search transcripts.
- Preserve existing `modelEvals` history.
- Do not use LLM-judge score as the sole or primary promotion criterion.

## Verification gates

Each worker runs proportionate checks during stories. Before each PR is handed
off, require:

```text
npm run typecheck
npm run lint
npm test
npm run build
```

Also require:

- `npm run evals` for generation/eval changes.
- `npm run extension:build` only if extension files are touched; normally they
  should not be.
- Browser verification for every UI WP on desktop and mobile.
- Authorized and unauthorized `/evals` access tests.
- Demo-mode end-to-end verification with zero external keys.
- Security review for prompts, provider secrets, auth, operator access, exports,
  and any user-data snapshots.
- Code review against the WP stories and actual diff.
- A post-merge wave gate on the latest integration branch/main before starting a
  dependent wave.

The orchestrator must independently inspect worker diffs and test evidence. Do
not accept "tests pass" without reviewing the relevant output and acceptance
criteria.

## Required end-to-end scenarios

Before declaring the program complete, verify all of these:

1. With no external keys, the app and fixture eval lab work deterministically.
2. With Anthropic only, existing analysis/generation and Claude eval behavior do
   not regress.
3. With xAI only for a permitted fixture/smoke path, the system health-checks
   `grok-4.3`, runs bounded X Search when X hydration is available, records
   citations/usage, and fails soft otherwise.
4. A mixed Claude/Grok generation experiment completes with frozen inputs,
   partial-failure handling, costs, latency, and guardrails recorded.
5. A baseline/Grok discovery experiment runs in the same bounded time window and
   records citations, hydration, duplicates, and human labels.
6. Blind review does not reveal provider/model identity before submission.
7. Unauthorized users cannot read, start, cancel, review, decide, or export an
   experiment by UI, Server Action, or direct Convex call.
8. Shadow Grok discovery cannot change the user's feed, notifications, ranking,
   or publishing path.
9. Assisted mode is disabled or strictly allow-listed and reversible.
10. Account export/deletion covers applicable new experiment data.

## Experiment gates

Do not recommend assisted rollout unless the implemented lab records evidence
meeting the PRD gates:

- At least 100 reviewed discovery cases across representative niches.
- Citation integrity at least 99%.
- X hydration success at least 95%.
- Credible improvement in precision@10 or incremental useful yield over the
  baseline.
- Predeclared cost and p95 latency budget met.
- No unresolved security, privacy, authorization, publishing, demo-mode, or feed
  quality regression.

Do not recommend Grok generation shadow routing unless:

- At least 150 generation cases complete.
- Deterministic guardrail performance is non-inferior to the current route.
- Blind human preference or predeclared cost-adjusted quality clears its gate.
- Voice fidelity and no/minor-edit behavior do not regress.
- Failure rate and p95 latency are acceptable.

If real credentials, enough cases, human reviews, or owner authorization are not
available, that is not an implementation failure. Finish the safe, disabled
capability, document exactly what evidence remains, and stop before rollout.

## Communication and completion report

Keep the owner updated at meaningful milestones and no less than once per minute
during active long-running work. Report decisions, risks, and blockers plainly.

At completion, provide:

- WP/PR status and dependency graph.
- Agent routing ledger: WP, actual model, reasoning effort, escalation history,
  and whether routing was enforced by the runtime or only inherited.
- What shipped and what remains feature-flagged.
- Exact verification evidence per WP and final wave gate.
- Any recorded rulings or deliberate deviations.
- Current xAI entitlement/health-check result without exposing secrets.
- Eval-lab readiness and available fixture/real datasets.
- Experiment gates met versus still pending.
- Explicit statement that assisted rollout remains disabled unless the owner
  approved it based on completed evidence.

Do not claim the objective complete while required implementation work remains.
Do not mark the objective blocked merely because rollout evidence requires real
traffic or owner approval; finish all safe implementation and fixture validation
first.
