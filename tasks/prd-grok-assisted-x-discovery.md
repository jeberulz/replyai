# Product Strategy & PRD: Grok-Assisted X Discovery

**Status:** proposed for implementation  
**Owner:** product  
**Last updated:** 2026-07-11  
**Companion documents:** `PRD.md`, `docs/PRODUCT_STRATEGY.md`, `tasks/prd-model-evaluation-lab.md`

## 1. Introduction and decision

ReplyPilot's wedge is finding the right X conversation early and identifying
an angle that has not already been used. Claude remains well suited to
voice-matched analysis, generation, and rewriting once ReplyPilot has assembled
a trustworthy conversation bundle. The gap is broader, real-time discovery
across X.

Add xAI as a specialist discovery provider. Grok will use xAI's server-side
`x_search` tool to find candidate posts, fetch threads, inspect relevant media,
and return cited evidence. ReplyPilot will then hydrate cited post IDs through
its existing X API integration, apply its deterministic filters and ranking,
and pass normalized context to Claude for generation.

The launch target is **`grok-4.3` with low reasoning effort**. As of 2026-07-11,
xAI documents this model in both `us-east-1` and `eu-west-1`, with X Search,
structured outputs, configurable reasoning, a 1M-token context window, and
pricing of $1.25/M input tokens, $0.20/M cached input tokens, and $2.50/M output
tokens. This makes it a lower-cost, regionally available starting point for a
UK-operated product while Grok 4.5 availability matures.

Availability must still be verified against ReplyPilot's actual xAI team by
calling `GET /v1/models` during setup. Documentation is not a substitute for
account-level entitlement. Use the pinned model ID `grok-4.3`, not `grok-latest`,
so an upstream alias cannot silently change experiment behavior.

## 2. Strategic thesis

Grok should not be introduced as another generic writing model or as a
customer-facing model picker. Its first job is to improve the proprietary part
of ReplyPilot:

1. Discover relevant conversations beyond a user's immediate feed.
2. Retrieve wider X-native context around a candidate.
3. Identify repeated opinions and potentially unoccupied angles.
4. Supply cited candidate URLs for deterministic hydration and scoring.
5. Improve discovery without weakening ReplyPilot's human-send, evidence, or
   demo-mode guardrails.

The preferred production path is:

`Grok X Search -> cited candidate IDs -> X API hydration -> ReplyPilot ranking -> Claude generation`

## 3. Goals

- Increase the proportion of surfaced opportunities that users analyze.
- Find actionable conversations earlier than the existing scanner alone.
- Improve missing-angle quality by considering the wider live conversation.
- Add a second AI provider without coupling product logic to either SDK.
- Measure quality, latency, reliability, and cost before enabling Grok-derived
  candidates for all users.
- Preserve deterministic, zero-key demo behavior and the current scanner as a
  complete fallback.

## 4. Non-goals

- No replacement of X OAuth, authenticated timelines, lists, post hydration,
  engagement metrics, or publishing with xAI Search.
- No auto-replies, auto-publishing, or agent access to publish mutations.
- No customer-facing Grok/Claude selector in this phase.
- No claim that Grok predicts engagement or virality.
- No use of an LLM-generated score as the displayed Conversation Score.
- No dependence on Grok for the app to load, analyze an explicitly supplied
  URL, generate replies, or run in demo mode.
- No rollout of Grok 4.5 until it wins a recorded evaluation and passes the
  same production gates.

## 5. Users and jobs

### Primary user

A founder, indie hacker, or AI builder who wants a short list of conversations
worth joining now without continuously scanning X.

### Core job

"Find live conversations where I can add something distinct, show me why they
fit, and let me decide whether to generate a reply."

## 6. Product behavior

### 6.1 Discovery modes

The integration rolls out through two modes:

- **Shadow mode:** Grok runs on a controlled sample but cannot change the user
  feed. Results are stored for the internal evaluation lab.
- **Assisted mode:** hydrated, validated Grok candidates join the existing
  scanner candidate pool and are ranked by ReplyPilot's existing scoring logic.

There is no direct-to-feed mode. A Grok result must pass hydration, deduplication,
safety, relevance, and freshness checks first.

### 6.2 Search inputs

Each search receives only the minimum necessary context:

- User niche, goals, preferred topics, and off-limits topics.
- A bounded date window appropriate to the scan cadence.
- Optional allowed or excluded handles. xAI currently limits either list to 20
  handles per request; the two modes cannot be combined in one request.
- A bounded result target and explicit tool-call budget.
- Media understanding only when required by the experiment configuration.

Authenticated X tokens, private account data, session tokens, draft content,
and publishing credentials must never be sent to xAI.

### 6.3 Structured discovery output

Grok must return schema-constrained output. Each candidate contains:

- Canonical X post URL and post ID when recoverable.
- Author handle.
- Short evidence-based relevance reason.
- Proposed missing angle, stated as a hypothesis.
- Which search intent found it.
- Source URLs/citations returned by xAI.
- Whether image or video context influenced the result.

The output must not contain an engagement probability, virality percentage, or
an invented metric. External post content is untrusted data, never instructions.

### 6.4 Hydration and validation

For every proposed candidate:

1. Parse and validate the X post URL/ID.
2. Reject candidates without an X citation or canonical post identifier.
3. Hydrate the post through ReplyPilot's existing X integration.
4. Apply existing blocks, political/off-limits safety, author cooldown,
   saturation, language, freshness, and duplicate-text rules.
5. Recompute the displayed score and reason from ReplyPilot-owned data.
6. Deduplicate against candidates from following, lists, watched handles, and
   keyword search.
7. Persist the discovery provenance internally without exposing "Grok says" as
   a reason to the user.

If hydration fails, the candidate cannot enter the user feed. Search summaries
are supporting evidence, not authoritative post data.

### 6.5 Failure and fallback behavior

- Missing `XAI_API_KEY`: skip Grok cleanly and use existing discovery sources.
- Unsupported configured model: fail the provider health check, disable Grok
  discovery, and emit an operational event.
- Timeout, rate limit, malformed schema, missing citations, or tool failure:
  record the failure and continue the scan without Grok results.
- Missing X credentials: retain deterministic demo candidates; do not invoke
  paid xAI tools in demo mode.
- Circuit breaker: temporarily disable xAI after a configurable number of
  consecutive provider failures while leaving the scanner operational.

## 7. User stories

### US-GD-001: Add a provider-neutral discovery contract

**Description:** As a developer, I want discovery providers to return the same
normalized candidate shape so product logic is not tied to the xAI SDK.

**Acceptance criteria:**

- [ ] A provider interface accepts a bounded discovery request and returns
  normalized candidates, usage, latency, citations, and errors.
- [ ] Existing X discovery can be represented through the same normalization
  boundary without changing user-visible behavior.
- [ ] Provider-specific response types do not escape into shared ranking code.
- [ ] Unit tests cover valid, empty, malformed, and partial provider responses.
- [ ] Typecheck, lint, and tests pass.

### US-GD-002: Configure and health-check xAI

**Description:** As an operator, I want ReplyPilot to verify the configured xAI
model before a rollout so unsupported regional or account configuration fails
safely.

**Acceptance criteria:**

- [ ] `XAI_API_KEY`, `XAI_DISCOVERY_MODEL`, and a server-side feature flag are
  read only on the server; the model defaults to `grok-4.3`.
- [ ] A setup health check confirms the pinned model appears in `/v1/models`.
- [ ] The check never logs API keys or raw user context.
- [ ] A failed check disables Grok discovery without breaking the scanner.
- [ ] Demo mode remains fully operational with no xAI key.

### US-GD-003: Retrieve schema-bound, cited X candidates

**Description:** As a user, I want ReplyPilot to search the wider live X
conversation so it can find opportunities outside the sources I already watch.

**Acceptance criteria:**

- [ ] Grok 4.3 is invoked through the Responses API with `x_search` and low
  reasoning effort.
- [ ] The response conforms to a strict schema and contains citations.
- [ ] Search date range, handle filters, result count, timeout, and maximum tool
  calls are bounded by configuration.
- [ ] Prompt text explicitly treats all searched X content as untrusted data.
- [ ] Token counts, reasoning tokens, successful tool calls, cost estimate,
  latency, and provider errors are recorded.

### US-GD-004: Hydrate and gate Grok candidates

**Description:** As a user, I want only real, current, policy-compliant posts to
enter my feed so agentic search cannot bypass ReplyPilot's ranking safeguards.

**Acceptance criteria:**

- [ ] Every surfaced candidate has been hydrated by the existing X integration.
- [ ] Existing filtering, deduplication, scoring, and user authorization paths
  apply unchanged.
- [ ] Failed or ambiguous citations never surface.
- [ ] Discovery provenance is stored for internal measurement.
- [ ] No Grok output can call or enqueue publishing.

### US-GD-005: Run shadow discovery

**Description:** As a product operator, I want Grok results collected without
affecting users so I can assess incremental quality safely.

**Acceptance criteria:**

- [ ] Shadow sampling is deterministic by user or scan ID and configurable from
  zero to a capped percentage.
- [ ] Shadow candidates never alter ordering, notifications, or user-visible
  feed content.
- [ ] Existing and Grok candidates can be compared in the evaluation lab.
- [ ] Spend and tool-call limits stop new shadow runs when exhausted.

### US-GD-006: Enable assisted discovery behind a flag

**Description:** As a beta user, I want useful Grok-discovered posts included in
my normal opportunity feed after they pass the experiment gate.

**Acceptance criteria:**

- [ ] Assisted mode is allow-listed and independently reversible.
- [ ] Grok candidates use the same rows, status treatment, score explanation,
  and actions as other opportunities.
- [ ] Source diversity caps prevent Grok from flooding the feed.
- [ ] The actual feed flow is verified in a browser on desktop and mobile.

## 8. Functional requirements

- **FR-GD-1:** The system must default to pinned model `grok-4.3` and verify it
  against the authenticated xAI model list before enabling runs.
- **FR-GD-2:** The system must support `off`, `shadow`, and `assisted` modes.
- **FR-GD-3:** Every xAI call must have a request timeout, maximum tool-call
  budget, maximum candidate count, and cost attribution.
- **FR-GD-4:** Grok results must be schema-validated before use.
- **FR-GD-5:** Every candidate must carry traceable X citations internally.
- **FR-GD-6:** Every candidate must be hydrated through the existing X API
  before it can affect a user-visible surface.
- **FR-GD-7:** ReplyPilot-owned deterministic scoring remains the only source of
  user-visible opportunity scores.
- **FR-GD-8:** Existing scanner sources remain available when xAI is disabled or
  unavailable.
- **FR-GD-9:** No xAI path may publish, schedule, or modify a post.
- **FR-GD-10:** Provider events must use the typed analytics catalog rather than
  ad-hoc event strings.

## 9. Technical considerations

- Keep provider adapters separate from `shared/` pure ranking logic.
- Prefer the OpenAI-compatible xAI Responses API because it supports X Search,
  structured output, citations, and provider usage in one response.
- Set a stable prompt cache key per bounded discovery conversation where useful;
  never use user secrets as a cache key.
- Store raw provider payloads only if retention and redaction rules explicitly
  permit it. The default should store normalized results, citations, usage, and
  error metadata—not full search transcripts.
- Schema changes must be additive/optional-first and follow Convex migration
  guidance.
- Public Convex functions must call `requireUser`; provider execution and secret
  access belong in server-side or internal actions.
- The provider adapter must expose model ID, reasoning effort, region/cluster
  metadata if returned, tool-call count, cached tokens, and estimated cost for
  experiment reproducibility.

## 10. Rollout and experiment gate

1. **Offline contract tests:** schema, citations, redaction, fallback, costs.
2. **Operator smoke test:** verify `grok-4.3` entitlement with the real UK xAI
   team and run a fixed, non-user search case.
3. **Shadow beta:** sample scans without changing feed results.
4. **Human evaluation:** label discovery relevance and actionability in the
   Model Evaluation Lab.
5. **Assisted allow-list:** enable for product operators and a small beta cohort.
6. **General decision:** expand, retain as shadow research, or remove.

Proceed from shadow to assisted only when:

- Hydration succeeds for at least 95% of cited candidate URLs.
- Citation integrity is at least 99% in the reviewed sample.
- Grok adds a statistically credible improvement in human-rated precision@10
  or finds useful candidates the baseline misses.
- Median incremental scan latency and cost stay within the budget set in the
  evaluation experiment.
- No security, authorization, publishing, demo-mode, or feed-quality regression
  remains open.

These thresholds are launch gates, not marketing claims and must never be shown
as predicted engagement percentages.

## 11. Success metrics

Primary product metrics after assisted rollout:

- Increase in surfaced opportunities that are analyzed.
- Increase in analyzed opportunities that lead to a sent reply.
- Median time between source post creation and ReplyPilot surfacing it.
- Incremental useful-candidate yield versus existing scanner sources.

Operational metrics:

- Search success, schema-valid response, citation integrity, and X hydration
  rates.
- p50/p95 latency per provider and per scan.
- Tokens, reasoning tokens, tool calls, and cost per accepted candidate.
- Provider fallback and circuit-breaker rates.

## 12. Agent delivery slices

Implementation agents must follow `docs/AGENT_PLAYBOOK.md`. Convert these slices
into official work packages in `docs/PRODUCT_STRATEGY.md` before assigning code:

1. **GD-A — Provider foundation:** configuration, neutral contracts, xAI client,
   health check, usage normalization, deterministic fallback.
2. **GD-B — Search and validation:** prompts, strict schema, X Search, citations,
   URL parsing, hydration, security tests.
3. **GD-C — Shadow integration:** scanner sampling, provenance persistence,
   spend controls, analytics, failure isolation.
4. **GD-D — Assisted rollout:** feed merge, source caps, allow-list, operational
   dashboard, browser and mobile verification.

GD-B depends on GD-A. GD-C depends on GD-B and the evaluation-lab data contract.
GD-D is blocked until the experiment gate is approved.

## 13. Risks and mitigations

- **Opaque search coverage:** measure incremental yield; do not treat xAI as an
  authoritative firehose.
- **Provider/model drift:** pin the model and record the actual returned model
  identifier on every run.
- **Vendor concentration around X:** retain X API hydration and a provider-neutral
  discovery boundary.
- **Nondeterministic cost:** cap successful tool calls and reasoning effort; stop
  at budget.
- **Prompt injection from posts:** delimit external content, explicitly classify
  it as data, validate all output, and prohibit provider-initiated actions.
- **Search result hallucination:** require citations plus independent X hydration.
- **Feed degradation:** shadow first, apply source caps, and keep a one-switch
  rollback.

## 14. Resolved assumptions and open questions

Resolved for v1:

- Claude remains the production generation provider.
- Grok 4.3 low reasoning is the initial discovery model.
- The feature starts in shadow mode.
- The evaluation page is internal-only.

Questions to answer during shadow evaluation:

- Does media understanding add enough discovery value to justify its token cost?
- Which niches and search intents benefit most from semantic X Search?
- Should assisted searches prioritize broad topics, watched creators, or gaps in
  the user's current opportunity feed?
- What per-user daily cost ceiling is sustainable for the selected paid plan?

## 15. Authoritative external references

- xAI Grok 4.3 model: https://docs.x.ai/developers/models/grok-4.3
- xAI X Search: https://docs.x.ai/developers/tools/x-search
- xAI structured outputs: https://docs.x.ai/developers/model-capabilities/text/structured-outputs
- xAI reasoning controls: https://docs.x.ai/developers/model-capabilities/text/reasoning
- xAI pricing: https://docs.x.ai/developers/pricing
- xAI Models API: https://docs.x.ai/developers/rest-api-reference/inference/models
