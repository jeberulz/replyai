# Product Strategy & PRD: Model Evaluation Lab

**Status:** proposed for implementation  
**Owner:** product  
**Last updated:** 2026-07-11  
**Companion documents:** `PRD.md`, `docs/PRODUCT_STRATEGY.md`, `tasks/prd-grok-assisted-x-discovery.md`

## 1. Introduction

ReplyPilot already supports a per-analysis model comparison: every catalogued
Claude model generates three replies, a stronger Claude model blind-scores the
sets, and the result is stored in `modelEvals`. That is a useful diagnostic, but
it cannot answer the strategic questions introduced by xAI:

- Does Grok discover better X conversations than the existing scanner?
- Given identical normalized context, does Grok generate replies users prefer
  over Claude?
- Does a Grok-discovery/Claude-generation hybrid outperform either provider
  alone?
- What quality, latency, reliability, and cost trade-off is actually observed?

Build a dedicated, authenticated **Model Evaluation Lab** for product operators.
It must support reproducible experiments, provider-aware execution, blind human
review, deterministic guardrail results, discovery evaluation, and aggregation
across a representative case set. LLM judging remains a secondary diagnostic;
human preference and real user editing behavior are the decision evidence.

## 2. Product decision

- Route: `/evals` with generation and discovery experiment types.
- Audience: authenticated, server-authorized product operators only.
- Initial candidates: Claude Opus 4.8, Claude Sonnet 5, and Grok 4.3.
- Grok 4.5 may appear only after the actual xAI account exposes it and an
  operator deliberately adds it to an experiment.
- Existing per-analysis `modelEvals` remain readable during migration; the new
  lab uses additive experiment tables rather than mutating historical rows.
- The customer product does not expose model names, internal scores, or a model
  picker as part of this project.

## 3. Goals

- Compare providers on the same stored cases with reproducible configuration.
- Evaluate both discovery quality and reply-generation quality.
- Collect blind human judgments without leaking model identity.
- Connect selected outputs to edit distance and eventual sent/no-send outcomes
  where policy and consent permit.
- Report measured sample sizes, uncertainty, latency, failures, and true
  provider usage costs.
- Make promotion or rollback decisions from explicit experiment gates.
- Preserve CI's deterministic, key-free guardrail suite as a separate hard gate.

## 4. Non-goals

- No public benchmark leaderboard.
- No customer-facing engagement predictions or fake precision.
- No use of a single LLM judge score as the model-selection decision.
- No automatic change to production routing when an experiment completes.
- No publishing or scheduling from the evaluation lab.
- No bulk export of raw user data or voice examples.
- No requirement for external API keys in CI or demo mode.
- No attempt to prove a universal "best model"; decisions are workload-specific.

## 5. Experiment types

### 5.1 Generation experiment

Every candidate receives the same normalized `TweetBundle`, conversation
analysis, selected voice examples, negative constraints, option count, and
generation instructions. Each candidate must return exactly three options with
distinct valid categories and grounded reasons.

Measured dimensions:

- Deterministic guardrail pass and repair rate.
- Blind human preference at the option-set and individual-option level.
- Voice fidelity, specificity, novelty, and send-worthiness labels.
- Human edit distance and edit category when a reviewer produces a final draft.
- Latency, input/output/reasoning/cached tokens, estimated or billed cost, and
  provider error rate.
- Actual no/minor-edit use rate for outputs later selected in normal product
  flows; this is reported separately from lab judgments.

### 5.2 Discovery experiment

Each candidate discovery strategy receives the same bounded niche, goals,
off-limits topics, handles, and time window. Strategies may include:

- Existing scanner sources and ranking baseline.
- Grok 4.3 X Search.
- Grok X Search followed by X API hydration and ReplyPilot ranking.
- Future provider or prompt variants.

Measured dimensions:

- Human-rated precision@10 and useful-candidate yield.
- Incremental useful candidates not found by the baseline.
- Topic relevance, freshness, novelty, actionability, and missing-angle quality.
- Citation integrity and X hydration success.
- Source diversity and duplicate rate.
- Time from post creation to discovery when the timestamp is available.
- Latency, tool calls, tokens, total cost, and provider failures.

### 5.3 Pipeline experiment

This compares complete routes, for example:

- Existing discovery -> Claude generation.
- Grok discovery -> Claude generation.
- Grok discovery -> Grok generation.

Pipeline experiments are evaluated as two linked stages. A strong generated
reply cannot hide poor discovery, and a strong discovery result cannot hide a
reply nobody would send.

## 6. Dataset and sampling strategy

### 6.1 Generation case set

Start with 100-200 consented or synthetic cases stratified across:

- Reply and quote formats.
- Short standalone posts and posts requiring ancestor-thread context.
- Posts with no media, images/OCR, and video links where available.
- Fresh, mid-window, and saturated conversations.
- Founder, technical, product, design, and general business topics.
- Several measured voice styles, including sparse voice data.
- Easy and difficult missing-angle cases.

Real case snapshots must be immutable for a given dataset version. Store the
normalized inputs or a stable reference plus hash; never refetch a moving thread
during a generation comparison.

### 6.2 Discovery case set

Discovery necessarily queries a changing corpus. Every case therefore records:

- Search intent and niche context.
- Exact start/end time and timezone.
- Allowed/excluded handles and media settings.
- Strategy configuration, model ID, reasoning effort, and tool budget.
- Returned citations, hydration timestamps, and hydrated post snapshot.

Compare discovery strategies concurrently or in randomized order within the
same narrow time window. Results from different days are not treated as a fair
head-to-head comparison.

### 6.3 Privacy and consent

- Default to checked-in synthetic fixtures and product-team-owned accounts.
- Include beta-user snapshots only under the applicable product terms and data
  handling policy.
- Redact session tokens, OAuth tokens, emails, and provider keys before storage.
- Store only the voice examples required for the frozen case; restrict access to
  operators.
- Deletion/export flows must include all new experiment tables.

## 7. Evaluation methodology

### 7.1 Reproducibility

Every run records:

- Experiment and dataset version.
- Provider and exact model ID returned by the API.
- Prompt/template version and schema version.
- Reasoning effort and supported sampling configuration.
- Search/tool settings and tool-call count.
- Start/end timestamps, latency, retry count, status, and normalized error.
- Input, output, reasoning, and cached token usage.
- Estimated cost based on a versioned price snapshot; billed cost if the
  provider exposes it.

Provider settings should be equivalent, not falsely identical. If a model does
not support a parameter, the UI must show `not supported` rather than silently
substitute a value.

### 7.2 Blind human review

- Randomize candidate order independently for each case and reviewer.
- Hide provider/model names, cost, latency, and LLM-judge results until the
  reviewer submits.
- Allow `A`, `B`, `tie`, and `neither` for pairwise reviews.
- Require a short reason code: voice, specificity, novelty, clarity, factuality,
  safety, or other.
- For discovery, reviewers mark each result relevant/not relevant and optionally
  actionable, novel, unsafe, duplicate, or stale.
- Prevent a reviewer from overwriting another review; revisions create a new
  version or an auditable update.

### 7.3 Automated checks

Before human review, run the existing deterministic checks for:

- Output shape and exactly three options.
- Distinct and valid categories.
- Grounded reason present.
- X weighted-length limit.
- No banned engagement bait.
- No fake scores.

Add discovery checks for citation shape, X URL parsing, hydration, freshness,
duplicates, and required provenance. A failed hard guardrail remains visible but
the output is excluded from preference-win calculations unless the experiment
explicitly studies repair behavior.

### 7.4 LLM judge

The existing blind LLM judge may provide diagnostic scores and notes, but:

- The judge must not evaluate its own provider/model without that conflict being
  labeled.
- Judge identity is stored and shown after human submission.
- Human preference and real use are reported separately and take precedence.
- A model cannot be promoted solely because it wins LLM-judge scores.

### 7.5 Statistics and reporting

- Always show numerator, denominator, and excluded/failed cases.
- Report confidence intervals for aggregate preference and precision metrics
  when sample size permits.
- Do not rank candidates with fewer than the configured minimum completed cases.
- Separate lab preference, deterministic pass rate, and production no/minor-edit
  rate; never merge them into one opaque score.
- Slice results by format, voice-data quality, media, topic, and case difficulty
  only when each slice has enough cases to avoid misleading conclusions.

## 8. User stories

### US-EL-001: Secure the evaluation route

**Description:** As a product owner, I want only explicitly authorized operators
to access expensive experiments and sensitive snapshots.

**Acceptance criteria:**

- [ ] `/evals` requires a valid ReplyPilot session and a server-side operator
  authorization check.
- [ ] Direct server-action and Convex calls enforce the same permission; hiding
  navigation is not treated as security.
- [ ] Unauthorized users receive a not-found or access-denied result without
  experiment metadata.
- [ ] Operator access is auditable and disabled by default in demo/public beta.
- [ ] Browser verification covers authorized and unauthorized sessions.

### US-EL-002: Create a versioned experiment

**Description:** As an operator, I want to choose the workload, dataset, models,
and budget so the resulting comparison is reproducible.

**Acceptance criteria:**

- [ ] The form supports generation, discovery, and pipeline experiment types.
- [ ] Operators select a dataset version, candidates, case count, reasoning
  effort, concurrency, and maximum spend.
- [ ] Unsupported provider combinations are rejected before execution.
- [ ] The estimated maximum cost and case count are shown before confirmation.
- [ ] Creating an experiment does not automatically start it.
- [ ] UI is verified in the browser using the project's UI verification flow.

### US-EL-003: Execute bounded provider runs

**Description:** As an operator, I want experiments to run safely in the
background so navigation or a provider failure cannot corrupt the comparison.

**Acceptance criteria:**

- [ ] Starting a run requires an explicit operator click.
- [ ] Cases execute as resumable, idempotent jobs with bounded concurrency.
- [ ] Budget, provider rate-limit, cancellation, and global AI spend controls
  are enforced before scheduling more cases.
- [ ] One candidate/provider failure does not discard successful peers.
- [ ] Progress, completed, failed, excluded, and remaining counts are queryable.
- [ ] Re-running creates a new run; it never overwrites prior outputs.

### US-EL-004: Review generation output blindly

**Description:** As a reviewer, I want model identity hidden while comparing
replies so my preference is not biased by provider reputation.

**Acceptance criteria:**

- [ ] Candidate order is randomized and model identity remains hidden until
  review submission.
- [ ] Reviewer can choose a winner, tie, or neither and record reason codes.
- [ ] All three options and reasons are visible, along with deterministic
  guardrail findings.
- [ ] Cost, latency, and judge output are revealed only after submission.
- [ ] Keyboard navigation and mobile/desktop browser verification pass.

### US-EL-005: Review discovery results blindly

**Description:** As a reviewer, I want to label candidate conversations so we
can measure whether Grok improves discovery rather than merely returning more
posts.

**Acceptance criteria:**

- [ ] Results are deduplicated for review while retaining which strategies found
  each candidate.
- [ ] Reviewer can inspect the hydrated X snapshot and citation.
- [ ] Relevance is required; actionability, novelty, safety, stale, and duplicate
  labels are optional structured fields.
- [ ] Strategy identity is hidden until the case review is submitted.
- [ ] Broken citations and hydration failures are visibly classified, not
  silently removed from reliability metrics.

### US-EL-006: View aggregate experiment results

**Description:** As a product owner, I want a transparent results page so I can
decide whether to promote, retest, or reject a model strategy.

**Acceptance criteria:**

- [ ] Results show sample size, failures/exclusions, guardrail pass rate, human
  preference, latency, tokens/tool calls, and cost per candidate.
- [ ] Discovery experiments additionally show precision@10, incremental useful
  yield, hydration rate, citation integrity, diversity, and duplicate rate.
- [ ] Generation experiments additionally show repair rate, edit distance, and
  production no/minor-edit outcomes when available.
- [ ] Each aggregate can drill down to cases and raw normalized outputs.
- [ ] Model identity is revealed only to reviewers who completed the relevant
  review or operators not participating in blind review.
- [ ] CSV/JSON export excludes secrets and respects operator authorization.

### US-EL-007: Record an explicit decision

**Description:** As a product owner, I want the experiment conclusion and
evidence recorded so production routing never changes implicitly.

**Acceptance criteria:**

- [ ] An operator may record `promote to shadow`, `promote to assisted`, `retest`,
  or `reject` with rationale.
- [ ] The decision references the exact experiment/run versions and reviewer
  sample size.
- [ ] Recording a decision does not mutate production configuration.
- [ ] A separate code/config change is required to alter routing.

## 9. Functional requirements

- **FR-EL-1:** All pages, actions, queries, mutations, and exports must enforce
  operator authorization server-side.
- **FR-EL-2:** Experiments, datasets, prompts, schemas, candidates, runs,
  judgments, and decisions must be versioned or immutable.
- **FR-EL-3:** The runner must support multiple providers without accepting raw
  provider model IDs from untrusted client input.
- **FR-EL-4:** Every generation output must pass through the existing
  deterministic guardrail reporter.
- **FR-EL-5:** Every discovery output must retain citations and hydration status.
- **FR-EL-6:** Execution must be resumable, idempotent, cancellable, and bounded
  by concurrency and spend.
- **FR-EL-7:** Candidate ordering must be blinded and randomized for review.
- **FR-EL-8:** Human, automated, LLM-judge, and production-outcome metrics must
  remain separately identifiable.
- **FR-EL-9:** The lab must show actual sample counts and failures with every
  aggregate.
- **FR-EL-10:** No lab action may call publishing or scheduling code.
- **FR-EL-11:** Missing Anthropic or xAI keys must disable only affected
  candidates and preserve deterministic demo/fixture experiments.
- **FR-EL-12:** All new analytics events must be added to the typed event catalog.

## 10. Information architecture and design

Use Dark Chrome and Astryx adapters according to the repository rules. Dense
experiment data should use rows/tables rather than a wall of cards.

### `/evals`

- Recent experiments table: name, type, dataset, status, progress, spend, owner,
  and date.
- Filters for type, status, dataset, and candidate.
- New experiment action.

### `/evals/new`

- Workload and dataset selection.
- Candidate/provider configuration.
- Budget, concurrency, and case-count controls.
- Cost preview and explicit create confirmation.

### `/evals/[experimentId]`

- Run state, progress, failures, cost, and cancellation.
- Blind review queue entry.
- Transparent aggregate results with minimum-sample warnings.
- Case table and recorded product decision.

### `/evals/[experimentId]/review`

- Focused, one-case-at-a-time blind review.
- Large readable candidate text, source context, keyboard controls, and progress.
- No provider branding before submission.

## 11. Data model

Use additive optional-first Convex tables or equivalent records:

- **evalDatasets:** name, type, version, source policy, case count, hash, creator,
  timestamps.
- **evalCases:** dataset, immutable normalized input/snapshot, strata labels,
  consent/source classification, hash.
- **evalExperiments:** owner, type, dataset version, candidate configs, prompt and
  schema versions, status, budget, concurrency, decision.
- **evalRuns:** experiment, attempt, status, counts, started/completed timestamps,
  cancellation, spend.
- **evalOutputs:** run, case, blinded candidate key, provider/model/config,
  normalized output, guardrails, citations/hydration, usage, latency, cost,
  error.
- **evalJudgments:** run, case, reviewer, blinded ordering, choice, structured
  reasons, optional edited draft, timestamps.

Indexes must support owner authorization, run progress, reviewer queue, per-case
aggregation, and account-data export/deletion. Keep existing `modelEvals` for
historical reads; do not force it to represent discovery experiments.

## 12. Technical considerations

- Read `convex/_generated/ai/guidelines.md` before implementing schema/functions
  and the relevant `node_modules/next/dist/docs/` guides before implementing
  routes or server actions.
- Use internal Convex functions for scheduling/execution surfaces that should not
  be public. Every public function still validates arguments and calls
  `requireUser` plus the operator check.
- Use a server-maintained candidate catalog. Clients submit catalog IDs, never
  arbitrary provider endpoints or model strings.
- Snapshot provider pricing with each experiment; `shared/models.ts` estimates
  alone are insufficient for historical cross-provider reporting.
- Randomization must be deterministic from a stored seed for auditability while
  remaining unknown to the reviewer.
- Do not store provider reasoning text. Store reasoning token counts and any
  provider-supplied summary only if explicitly required and permitted.
- Separate execution from the request lifecycle. The UI starts, polls/subscribes,
  cancels, and resumes a background run.
- Apply CSRF/session protections already used by server actions and never put API
  keys in Convex client-visible data.

## 13. Success criteria and decision rules

The lab is successful when a product owner can run and reproduce a 100-case
cross-provider experiment without manual database work, review it blindly, and
make a decision from transparent quality and cost evidence.

Initial decision rules:

### Promote Grok 4.3 discovery from shadow to assisted

- At least 100 reviewed discovery cases across representative niches.
- Citation integrity >=99% and hydration success >=95%.
- Statistically credible improvement in precision@10 or incremental useful yield
  versus baseline.
- Cost and p95 latency remain inside the experiment's predeclared budget.
- No unresolved privacy, safety, authorization, or feed-quality regression.

### Promote Grok 4.3 generation to limited shadow routing

- At least 150 completed generation cases.
- Deterministic guardrail pass rate is non-inferior to the current Claude route.
- Blind human preference is credibly better or cost-adjusted quality meets a
  predeclared threshold.
- Voice-fidelity and no/minor-edit results do not regress.
- Provider failure and p95 latency are operationally acceptable.

Do not promote based only on LLM-judge score or lower token price.

## 14. Agent delivery slices

Implementation agents must follow `docs/AGENT_PLAYBOOK.md`. Convert these slices
into official work packages in `docs/PRODUCT_STRATEGY.md` before coding:

1. **EL-A — Evaluation domain:** schemas, immutable versions, provider-neutral
   run/output contracts, operator authorization, export/deletion coverage.
2. **EL-B — Runner:** candidate catalog, bounded background execution, provider
   usage normalization, retries/cancellation, spend controls, deterministic
   guardrails.
3. **EL-C — Blind review:** randomized stored assignments, generation and
   discovery labeling, accessibility and browser verification.
4. **EL-D — Results and decisions:** aggregations, uncertainty/sample warnings,
   drill-down, export, product decision record.
5. **EL-E — Production outcome bridge:** consented linkage to selected replies,
   edit-distance buckets, sent/responded outcomes, and shadow-run automation.

EL-B depends on EL-A. EL-C may begin after EL-A contracts are stable. EL-D
depends on EL-B and EL-C. EL-E is last because it touches production behavior and
user-derived outcome data.

## 15. Risks and mitigations

- **Judge bias:** prioritize blinded human and production outcomes; label judge
  conflicts.
- **Moving X corpus:** run discovery candidates concurrently and store snapshots.
- **Small-sample overconfidence:** show denominators, confidence intervals, and
  minimum sample warnings.
- **Prompt/provider mismatch:** record provider-specific configuration instead of
  pretending all APIs expose identical controls.
- **Cost runaway:** preview and hard-cap spend, tool calls, concurrency, and case
  count.
- **Sensitive data exposure:** operator-only authorization, minimal snapshots,
  redaction, export/deletion coverage, and no secrets in client data.
- **Evaluation overfitting:** version and rotate holdout cases; never tune and
  declare victory on the same small set.
- **Production coupling:** experiment decisions never mutate live routing.

## 16. Resolved assumptions and open questions

Resolved for v1:

- The lab is internal-only.
- Grok 4.3 is the initial xAI candidate.
- Both discovery and generation experiments are supported.
- Human review is primary; LLM judging is secondary.
- Existing `modelEvals` data remains available but is not the new canonical
  experiment schema.

Open questions for the product owner before production-outcome linkage:

- Which beta-user data may be included, and what consent language applies?
- How many independent human reviewers are required per case after the initial
  operator-only phase?
- What maximum spend should be allowed per experiment and per day?
- Should exported case text be disabled entirely outside local development?

## 17. Definition of done

- Two operators can independently reproduce the same experiment configuration.
- Unauthorized users cannot read, execute, review, cancel, or export experiments.
- A mixed Claude/Grok generation run and a baseline/Grok discovery run both
  complete with frozen inputs, costs, latency, errors, and guardrails recorded.
- Blind review does not reveal candidate identity before submission.
- Result aggregates reconcile exactly to case-level judgments and failures.
- Cancellation and spend caps stop new work without corrupting completed cases.
- Demo/fixture experiments work with zero external keys.
- Account export/deletion includes all applicable experiment data.
- Full typecheck, lint, tests, build, security review, code review, and desktop/
  mobile browser verification pass.
