# PRD: AI Experience Layer

**Status:** Draft for agent handoff  
**Date:** 2026-07-12  
**Program strategy:** `docs/AI_EXPERIENCE_PRODUCT_STRATEGY.md`  
**Primary implementation registry:** `docs/PRODUCT_STRATEGY.md` Section 14, WP49-WP56  

## 1. Overview

ReplyPilot's durable wedge is conversation discovery plus timing. The current
AI implementation works, but it is mostly request/response and tied directly to
Anthropic SDK calls spread across Next.js and Convex actions. That limits the
quality of the product experience: users wait on blank states, AI workflows are
hard to orchestrate safely, model routing is harder to evaluate, and X research
experiences are not yet agentic.

This program adds an AI experience layer using Vercel AI SDK for structured
generation, streaming, typed tool calling, telemetry, and provider abstraction.
It also pilots X MCP as a read-only research access layer for agentic X
discovery. X MCP is not a replacement for the existing direct X API integration.

Core policy:

- Direct X API remains the production path for OAuth, tweet reads required by
  existing deterministic flows, publishing, scheduling, token refresh,
  dashboards, and outcome tracking.
- Vercel AI SDK becomes the preferred model-call layer for new or migrated AI
  features.
- X MCP is used only for read-only AI research workflows until a later owner
  ruling explicitly allows any write-like MCP action.
- Every output remains reviewable. A human clicks send on every post.

References:

- Vercel AI SDK docs: https://ai-sdk.dev/docs/introduction
- Vercel AI SDK structured output: https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data
- Vercel AI SDK tool calling: https://ai-sdk.dev/docs/reference/ai-sdk-core/tool
- Vercel AI SDK telemetry: https://ai-sdk.dev/docs/ai-sdk-core/telemetry
- Vercel AI Gateway: https://vercel.com/docs/ai-gateway
- X MCP docs: https://docs.x.com/tools/mcp
- X API docs: https://docs.x.com/x-api/introduction
- MCP intro: https://modelcontextprotocol.io/docs/getting-started/intro

## 2. Goals

- Make reply generation feel faster by streaming analysis and options into the
  workbench progressively.
- Preserve or improve deterministic guardrails: exactly 3 options per batch,
  valid categories, concrete reasons, weighted 280-character enforcement, no
  fake scores, no engagement bait.
- Centralize model calls behind typed task-level APIs so ReplyPilot can route
  models by task quality, latency, and cost without rewriting product code.
- Add typed AI tools for safe internal orchestration over existing app
  capabilities.
- Add read-only X MCP research workflows that improve discovery and timing.
- Connect AI telemetry to the existing observability and eval system.
- Keep demo mode fully deterministic with zero external keys.

## 3. Non-Goals

- No replacement of the existing X API production integration.
- No auto-publish, auto-reply, auto-bookmark, auto-DM, or X composer
  automation.
- No broad raw model access to user OAuth tokens.
- No user-facing fake engagement predictions or model-generated percentages.
- No agency or multi-account workflows.
- No production dependency on X MCP for publish, schedule, billing, analytics,
  token refresh, or webhook-like processing.
- No migration to AI Gateway until an explicit gateway decision gate passes.

## 4. Users

Primary users remain founders, indie hackers, and AI builders who want to find
reply-worthy X conversations early and respond in their own voice.

Secondary users are internal ReplyPilot operators using research workflows to
find product feedback, competitor gaps, and beta prospects.

## 5. User Stories

### US-001: Streamed reply workbench

**Description:** As a user, I want the workbench to show analysis and reply
options as they are produced so I can start evaluating the opportunity sooner.

**Acceptance Criteria:**

- [ ] Analysis progress renders without waiting for all generation to finish.
- [ ] Reply and quote options appear progressively.
- [ ] The final saved state remains identical to the non-streaming state:
      3 replies, 3 quote tweets, reasons, categories, and guardrail validation.
- [ ] Demo mode shows deterministic staged progress without external keys.
- [ ] No text is published without explicit user click.

### US-002: Safer structured generation

**Description:** As a user, I want generated replies to remain valid and useful
even as the model layer changes.

**Acceptance Criteria:**

- [ ] AI SDK structured outputs are validated with Zod or equivalent schema
      contracts.
- [ ] Existing eval fixtures still fail on invalid count, invalid category,
      over-length content, fake scores, or engagement bait.
- [ ] Failed model output is repaired once where appropriate, then rejected
      rather than silently saved.
- [ ] Prompt-injection boundaries around tweets, bios, replies, and MCP
      results are explicit.

### US-003: Research mode

**Description:** As a user, I want to ask for relevant conversations in my niche
so I can find opportunities without manually scanning X.

**Acceptance Criteria:**

- [ ] User can enter a natural-language research prompt such as "Find AI agent
      conversations from SaaS founders this morning."
- [ ] The system returns ranked opportunities with source, author, text,
      posted time when known, reason, missing angle, and next action.
- [ ] Results flow into existing analyze/draft workflows instead of creating a
      separate product surface.
- [ ] X MCP results are normalized and cached before scoring.
- [ ] Demo mode returns deterministic research results.

### US-004: Agent tool orchestration

**Description:** As a user, I want AI workflows to combine search, scoring,
voice, and drafting without exposing broad write access.

**Acceptance Criteria:**

- [ ] Tools are typed, allow-listed, and server-side only.
- [ ] Tool calls are logged with user, purpose, resource counts, and result
      status.
- [ ] Tool inputs cannot invoke publish/schedule mutations.
- [ ] Tool outputs are treated as untrusted data when re-entered into prompts.

### US-005: Better trend radar and briefings

**Description:** As a user, I want the product to summarize rising conversations
and daily opportunities in my niche.

**Acceptance Criteria:**

- [ ] Trend clusters can include scanner, X API, and read-only X MCP research
      candidates through a normalized source contract.
- [ ] Daily briefings explain why opportunities matter now without fake
      predictions.
- [ ] Existing notification caps, quiet hours, and no-auto-publish rules remain
      intact.

### US-006: Observable AI quality

**Description:** As the product team, we need to know whether AI changes improve
real user outcomes instead of only passing syntactic checks.

**Acceptance Criteria:**

- [ ] AI calls record task type, model/provider route, latency, token or usage
      estimate, error type, and artifact id where available.
- [ ] AI telemetry joins to no/minor-edit rate and reply-back outcomes where
      existing data permits.
- [ ] Model identities are stored for internal evaluation and not shown as
      user-facing quality claims.
- [ ] No telemetry path records raw user tokens or secret values.

## 6. Functional Requirements

- FR-1: Add a task-level AI provider layer for analysis, option generation,
  rewrite, compose, semantic classification, briefings, and research synthesis.
- FR-2: New model calls must use Vercel AI SDK unless a WP explicitly documents
  why the direct Anthropic SDK path remains.
- FR-3: Preserve existing deterministic demo fallbacks for every migrated AI
  task.
- FR-4: Add streaming APIs only after the non-streaming final persisted state is
  compatible with existing Convex records.
- FR-5: Define an allow-listed AI tool registry. Tools may read, score, draft,
  and save reviewable artifacts. Tools may not publish or schedule.
- FR-6: Add a read-only X MCP adapter for search, user lookup, trends/news, and
  other owner-approved read capabilities.
- FR-7: Normalize X MCP results into internal source contracts before storing,
  scoring, or rendering.
- FR-8: Apply X read/spend controls to MCP-backed research, matching the
  production spend-control posture.
- FR-9: Record AI telemetry through the existing analytics/event catalog or a
  typed internal telemetry table. No ad-hoc event names.
- FR-10: Update docs, env inventories, eval fixtures, and work-package progress
  files in the same PR as each behavior change.

## 7. Product Routing Policy

| Need | Route |
|---|---|
| OAuth, token refresh, publish, schedule, direct tweet/thread reads for core workflows | Existing direct X API integration |
| Structured model generation, streaming, tool calling, model abstraction | Vercel AI SDK |
| Exploratory X research for AI agents | Read-only X MCP adapter |
| X developer documentation lookup | X Docs MCP or regular docs search, dev-only |
| Billing, dashboards, analytics, webhook-like processing, Convex records | Existing app/Convex code |
| Any write-like X action | Existing explicit user-approved app path only |

## 8. Model Routing Policy

Model routing is by risk and task, not by convenience.

| Task | Default route |
|---|---|
| Scan triage, lightweight relevance, clustering labels | cheap/fast model that passes eval thresholds |
| Final reply/quote generation | quality model selected by evals and observed no/minor-edit rate |
| Rewrite | fast model if guardrails and voice fidelity stay green |
| Research synthesis | quality model when tool outputs are broad or ambiguous |
| Eval judging/final review | strongest available judge model, internal only |
| Tool orchestration with user data or X MCP | high-capability model with strict step/tool limits |

Provider and model choices must be stored on generated artifacts where the
schema already supports it or added through optional fields. No user-facing copy
may imply model quality percentages or guaranteed engagement outcomes.

## 9. Technical Considerations

- The repo currently uses direct `@anthropic-ai/sdk` calls in `src/lib/ai.ts`,
  `src/app/actions.ts`, and multiple Convex actions. Migration must be
  incremental.
- The first abstraction should expose task functions, not raw provider objects.
- Convex functions must continue to authorize via `requireUser(ctx,
  sessionToken)` unless internal-only.
- Next.js code must follow the installed `node_modules/next/dist/docs/` guides
  before route/action changes.
- Convex code must follow `convex/_generated/ai/guidelines.md`.
- New dependencies require explicit WP justification. Expected candidates are
  `ai` and the minimum provider packages required by current AI SDK docs.
- AI Gateway is a later decision gate, not an automatic dependency.

## 10. Success Metrics

Primary:

- Higher percentage of generated replies used with no/minor edits.
- Lower time from URL/research prompt to first usable draft.
- Higher feed/research opportunity open-to-draft rate.

Secondary:

- Lower generation timeout/error rate.
- Lower median and p95 perceived wait time in the workbench.
- Stable or improved reply-back rate after migration.
- Lower cost per usable generated reply.
- Research Mode opportunities dismissed less often than baseline scanner
  opportunities.

Guardrail metrics:

- No increase in fake-score/eval violations.
- No increase in over-length generated options.
- No auto-publish path introduced.
- No demo-mode regressions with zero keys.

## 11. Open Questions

- Which provider package set should be approved for the first AI SDK
  dependency PR after checking current docs?
- Should the first user-facing Research Mode ship to all Pro users or only the
  allow-listed beta cohort?
- Should AI Gateway be adopted before or after model eval routing proves value
  through observed outcomes?
- Which X MCP capabilities are available under the owner's current X access
  tier and scopes?
- What spend ceilings apply separately to direct X API reads and MCP-backed X
  research reads?

