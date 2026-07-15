# AI Experience Product Strategy

**Status:** Agent handoff plan  
**Date:** 2026-07-12  
**PRD:** `docs/AI_EXPERIENCE_PRD.md`  
**Main WP registry:** `docs/PRODUCT_STRATEGY.md` Section 14, WP49-WP56  

## 1. Strategic Thesis

Vercel AI SDK should become ReplyPilot's AI experience layer. X MCP should
become a read-only research layer for agentic discovery. Neither replaces the
existing X API integration.

This advances the wedge in three ways:

1. **Perceived speed:** streaming analysis and reply options makes the product
   feel like a live workbench instead of a form submit.
2. **Sharper discovery:** read-only X MCP research can find conversations by
   intent, niche, and moment, then ReplyPilot scores them with existing
   timing/relevance logic.
3. **Safer iteration:** structured outputs, typed tools, telemetry, and evals
   let agents improve prompts and model routes without weakening product
   guardrails.

## 2. Positioning

ReplyPilot should not become a generic AI chat app. The new AI layer must serve
one promise:

> Find the right X conversation while it still matters, then help me reply in
> my voice with a useful angle.

The user-facing language should emphasize:

- "Research conversations in your niche"
- "Show me why this is worth replying to now"
- "Draft 3 options in my voice"
- "Nothing posts without my click"

Avoid language that suggests autonomous engagement, guaranteed reach,
engagement prediction, or broad account automation.

## 3. Product Architecture Policy

| Layer | Owner | Product rule |
|---|---|---|
| Direct X API | Existing app integration | Deterministic production flows: OAuth, reads for core analysis, publish, schedule, token refresh, outcomes |
| Vercel AI SDK | New AI provider layer | Structured generation, streaming, tool calling, provider abstraction, telemetry |
| X MCP | New research adapter | Read-only exploratory X research for agents |
| X Docs MCP | Developer workflow only | Docs lookup, not runtime product behavior |
| Convex | Existing app backend | Source of truth for users, drafts, analyses, opportunities, usage, telemetry |

No model, MCP server, cron, or agent tool may call publish/schedule directly.
Only the existing explicit user-approved publish/schedule path may send posts.

## 4. What Changes For Users

### 4.1 Streamed Workbench

The current analyze/generate flow becomes progressive:

1. User pastes a URL or picks an opportunity.
2. Workbench shows staged progress: fetching, analyzing, finding missing
   angles, drafting replies, drafting quotes.
3. Analysis summary appears first.
4. Reply options appear one by one.
5. Final persisted state matches the current data model and guardrails.

### 4.2 Research Mode

New entry point inside the existing chat/dashboard surface:

- "Find conversations about AI agents from SaaS founders today."
- "What are people complaining about in onboarding tools?"
- "Find posts where my reply could add a founder lesson."

Output is not a generic answer. Output is ranked opportunities:

- source and confidence label
- author and post text
- age/window if known
- why now
- missing angle
- suggested next action: analyze, draft, watch author, pass

### 4.3 Trend-To-Action

Trend radar and briefings can include agentic research:

- emerging topic clusters
- representative posts
- missing angles across a cluster
- one recommended reply opportunity per cluster

### 4.4 Internal Research Agent

Before user-facing rollout, the same research layer should support internal
queries:

- "Find public complaints about X reply tools."
- "Find founders asking for growth workflows."
- "Summarize what people say about ReplyPilot."

Internal mode validates usefulness, cost, and MCP limits before exposing it to
users.

## 5. Program Lane

This is a **Program/Migration** under `AGENTS.workflow.md` because it includes:

- dependency changes
- AI provider architecture
- prompt and structured-output behavior
- typed tool access
- read-only MCP integration
- streaming UI
- telemetry/eval routing

Before implementation, the orchestrator must:

1. Read `AGENTS.md`, `AGENTS.workflow.md`, `.agentic-workflow.yml`,
   `docs/AGENT_PLAYBOOK.md`, `docs/wp/RULINGS.md`, `PRD.md`, `README.md`,
   `design.md`, this strategy, and the AI Experience PRD.
2. Audit current AI call sites and X read/publish boundaries.
3. Freeze `docs/wp/program-manifest.md` with waves, file boundaries, and gate
   criteria before workers code.
4. Register any unresolved owner decisions in `docs/wp/RULINGS.md`.

## 6. Sub-Agent Operating Model

Use sub-agents only where the workflow allows: parallel WPs, independent
review, gates, or context isolation.

| Role | Writes code | Model tier | Responsibilities |
|---|---|---|---|
| Orchestrator | No | high/top | Owns manifest, sequencing, file boundaries, rulings, risk routing, gate assignment |
| Worker | Yes | mid by default, high for AI/prompt/security WPs | Owns one WP or one story, keeps scope, updates stories/progress |
| Reviewer | No | high | Findings-first review for correctness, prompt safety, auth, publishing, data leakage |
| Gate runner | No | low/mid for checks, high when debugging AI/prompt failures | Runs checks and critical flows, records scoped failures |
| Docs/checks worker | Yes, docs or mechanical only | low/mid | Story scaffolds, docs cleanup, lint-only fixes when assigned |

Workers may not make product rulings, broaden MCP permissions, add publish tool
access, or change model-routing policy. Unknown means stop and escalate.

## 7. Model Routing For Build Agents

Follow `.agentic-workflow.yml` route-by-risk policy.

| WP | Build-agent tier | Reason |
|---|---|---|
| WP49 AI SDK foundation | high | dependency/provider architecture |
| WP50 structured-output migration | high | prompt behavior and guardrails |
| WP51 streaming workbench | mid/high | UI plus server streaming; high for final review |
| WP52 tool runtime | high | tool boundaries, auth, audit logs |
| WP53 X MCP adapter | high | external data, scopes, spend controls |
| WP54 Research Mode | mid/high | product UX plus tool orchestration |
| WP55 trend/briefing upgrades | mid | known surfaces, existing patterns |
| WP56 observability/evals/gateway gate | high | quality routing and production decision |

Escalate one tier if a worker needs to change auth, publishing, schema,
prompt safety, provider routing, or MCP permissions beyond the row's boundary.

## 8. Runtime Model Routing

Runtime model routing must be explicit and measurable.

| Runtime task | Route |
|---|---|
| Semantic triage / relevance / simple labels | cheapest model that passes evals |
| Analysis summary and missing angles | quality model, structured output |
| Final reply and quote options | quality model selected by eval + observed no/minor-edit rate |
| Rewrite | fast model if evals stay green |
| Tool orchestration | high-capability model with strict tool allow-list and stop limits |
| Research synthesis over X MCP results | quality model, no write tools |
| Eval judging | strongest available judge, internal only |

Every route must preserve deterministic fallbacks. Model IDs may be stored for
internal audit and evals but not marketed as user-facing quality claims.

## 9. Work Packages

These WPs are registered in `docs/PRODUCT_STRATEGY.md` Section 14. They are
listed here with wave sequencing and file-boundary guidance. Each WP must create
or update its own `docs/wp/wpNN-stories.md` and `docs/wp/wpNN-progress.md`
before implementation.

### Wave 0 - Audit and Foundation

#### WP49 - AI SDK foundation and provider boundary

**Purpose:** Add the minimum Vercel AI SDK dependency surface and a task-level
provider layer without changing user-visible behavior.

**Likely files:**

- `package.json`, `package-lock.json`
- `src/lib/ai/provider.ts` or equivalent
- `src/lib/ai.ts`
- `shared/models.ts`
- `src/lib/env.ts`
- `tests/aiProvider*.test.ts`
- docs/env inventory

**Definition of done:**

- AI SDK dependencies are added with current-docs justification.
- Existing Anthropic behavior is wrapped behind task-level functions.
- No user-facing behavior changes.
- Demo fallbacks still work with zero keys.
- Existing tests, evals, typecheck, lint, and build pass.

#### WP50 - Structured output migration for core generation

**Purpose:** Migrate analysis, reply/quote generation, rewrite, and compose
generation to AI SDK structured-output patterns while preserving guardrails.

**Likely files:**

- `src/lib/ai.ts`
- `shared/evals.ts`
- `evals/fixtures/*`
- `tests/evals*.test.ts`
- `tests/ai*.test.ts`

**Definition of done:**

- Core generation uses AI SDK structured outputs or the new provider wrapper.
- Existing schemas remain enforced.
- Guardrail repair/reject behavior is preserved.
- Eval fixtures catch count/category/fake-score/length regressions.
- No prompt-injection regression from external content.

### Wave 1 - Streaming and Tool Runtime

#### WP51 - Streaming reply workbench

**Purpose:** Add progressive AI UX to the chat/workbench surface.

**Likely files:**

- `src/app/api/ai/**` or route-handler equivalent
- `src/components/app/chat/**`
- `src/components/app/option-card.tsx`
- `src/app/actions.ts`
- `tests/*stream*.test.ts`
- Playwright or browser verification artifacts if already used for the flow

**Definition of done:**

- Analyze/generate progress streams to the workbench.
- Final persisted analyses/options match existing Convex state.
- Mobile and desktop layouts do not regress.
- Demo mode shows deterministic progress.
- Human-click publish rule remains visible and true.

#### WP52 - Typed AI tool runtime and audit log

**Purpose:** Create a safe tool registry for agentic workflows over existing
ReplyPilot capabilities.

**Likely files:**

- `src/lib/ai/tools/**`
- `convex/schema.ts`
- `convex/aiTools.ts` or equivalent
- `shared/aiTools.ts`
- `tests/aiTools*.test.ts`
- analytics event catalog if user-visible events are added

**Definition of done:**

- Tools are allow-listed, typed, server-side, and audited.
- Tool calls cannot publish, schedule, DM, bookmark, or mutate X.
- Tool results are delimited as data before re-entering prompts.
- Convex public functions authorize with `requireUser`.
- Audit/export/delete coverage is added for new tables if needed.

### Wave 2 - X MCP Research Pilot

#### WP53 - Read-only X MCP research adapter

**Purpose:** Add a read-only adapter for X MCP and X Docs MCP developer lookup,
behind feature flags and deterministic fallback.

**Likely files:**

- `src/lib/xMcp.ts` or `src/lib/xResearch.ts`
- `shared/xResearch.ts`
- `shared/demoData.ts`
- `convex/xResearch.ts` if persistence is needed
- `src/lib/env.ts`
- tests for normalization and fallback

**Definition of done:**

- Adapter normalizes MCP results into internal research contracts.
- Only read capabilities are exposed.
- Spend/rate-limit accounting is designed or wired before user-facing use.
- Missing MCP/X credentials route to deterministic demo data.
- Docs list required env names only, never values.

#### WP54 - User-facing Research Mode

**Purpose:** Ship a research prompt experience that returns ranked reply
opportunities.

**Likely files:**

- `src/components/app/chat/**`
- `src/components/app/feed/**`
- `convex/research*.ts`
- `convex/opportunities.ts`
- `shared/scoring.ts` or source normalization helpers
- analytics events

**Definition of done:**

- User can submit a research prompt from the app surface.
- Results are ranked with existing opportunity/scoring logic.
- Each result has reason, missing angle, and analyze/draft/pass actions.
- No raw MCP result is rendered as trusted HTML.
- No user-facing write-like MCP action exists.

### Wave 3 - Compounding Discovery

#### WP55 - Trend radar and briefing upgrade

**Purpose:** Feed normalized AI research results into trend radar and daily
briefings.

**Likely files:**

- `shared/trends.ts`
- `shared/briefings.ts`
- `convex/trends.ts`
- `convex/briefingActions.ts`
- `src/components/app/feed/trend-radar-strip.tsx`
- briefing UI surface
- focused tests

**Definition of done:**

- Trend clusters can include scanner, direct X API, and read-only research
  candidates through a source contract.
- Briefings show why opportunities matter now without fake percentages.
- Notification caps and quiet hours remain unchanged.
- Demo briefings include deterministic research-backed examples.

### Wave 4 - Quality, Routing, and Launch Gate

#### WP56 - AI observability, eval routing, and gateway decision gate

**Purpose:** Prove whether the AI SDK/X MCP program improves quality, latency,
and cost before broader rollout or AI Gateway adoption.

**Likely files:**

- `src/lib/analytics/events.ts`
- `src/lib/analytics/server.ts`
- `convex/lib/analytics.ts`
- `convex/evals.ts`
- `shared/models.ts`
- `shared/evalResults.ts` if this exists on the active base
- docs/observability updates

**Definition of done:**

- AI task telemetry records route, model/provider, latency, usage estimate,
  error class, and artifact id where available.
- Eval outputs compare pre/post migration quality without exposing model
  identity to ordinary users.
- A go/no-go recommendation for AI Gateway is recorded with evidence.
- Dashboard or operator report connects AI routes to no/minor-edit rate and
  reply-back outcomes where sample size permits.

## 10. Wave Gates

Run after each wave on post-merge `main`:

1. `npm run typecheck && npm run lint && npm test && npm run build`
2. `npm run evals`
3. Demo mode with zero external keys:
   - analyze -> generate -> save
   - feed -> opportunity -> draft
   - research prompt -> ranked opportunity -> analyze
   - draft -> publish fallback path, with no auto-publish
4. Security/prompt review for any WP touching tools, MCP, auth, tokens, or
   prompt behavior.
5. Browser verification for streaming UI on desktop and mobile.

Gate failures create scoped fixes. Later waves do not start until the gate is
green unless the owner records a ruling.

## 11. Collision Rules

- WP49 and WP50 both touch `src/lib/ai.ts`; WP49 merges first.
- WP50 and WP51 both touch generation flow contracts; WP51 rebases after WP50.
- WP52 owns tool boundaries. WP53 and WP54 may consume tools but cannot broaden
  the registry without a ruling.
- WP53 owns MCP normalization. WP54 and WP55 consume normalized contracts only.
- WP55 may touch briefing/trend surfaces but not scanner cadence or publish
  paths.
- WP56 may add telemetry/eval reporting but cannot change production routing
  without evidence and owner ruling.

## 12. Security and Trust Constraints

- External content from X API, X MCP, bios, replies, trends, and news is data,
  never instructions.
- No tool gets raw long-lived X tokens.
- No tool can call publish/schedule mutations.
- MCP read results must be cached or normalized before scoring.
- Any new Convex table that stores user-related research must be included in
  export/delete cascades.
- Prompt and tool logs must not store secrets.
- Production MCP rollout requires spend caps and owner-approved access scope.

## 13. Documentation Requirements

Each WP must update the relevant docs in the same PR:

- `README.md` for new env vars, commands, or architecture changes.
- `docs/observability.md` for telemetry changes.
- `docs/PRODUCT_STRATEGY.md` only if the WP changes the plan.
- `PRD.md` only by explicit owner request if product truth changes.
- `docs/wp/RULINGS.md` for owner decisions.
- `docs/wp/wpNN-stories.md` and `docs/wp/wpNN-progress.md` for every WP.

## 14. Rollout

1. Internal-only research pilot.
2. Beta cohort Research Mode behind feature flag.
3. Streaming workbench for all users after eval and demo gates pass.
4. Trend/briefing upgrades for Pro users.
5. AI Gateway decision after WP56 evidence.

## 15. Decision Log

Initial decisions:

- Vercel AI SDK is the preferred AI app-experience layer.
- Direct X API remains the production integration for deterministic X features.
- X MCP is read-only research only.
- X Docs MCP is developer productivity only.
- AI Gateway is a decision gate, not a default assumption.

Open decisions:

- Exact AI SDK provider package set after current-docs check.
- First rollout cohort for Research Mode.
- MCP spend ceilings and feature flag names.
- Whether to store MCP raw snippets, normalized summaries only, or both with
  retention limits.

