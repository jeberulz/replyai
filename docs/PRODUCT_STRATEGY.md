# ReplyPilot AI — Product Strategy & Delivery Roadmap

**Status:** working document · **Owner:** product · **Last updated:** 2026-07-07
**Companion docs:** `PRD.md` (v3, product source of truth) · `STRATEGY.md`
(concise strategy note) · `design.md` (Dark Chrome design system) ·
`README.md` (architecture)

This document is the detailed execution strategy behind `STRATEGY.md`. It is
written to be **handed to build agents as self-contained work packages**
(§14). When anything here conflicts with `PRD.md`, the PRD wins.

---

## 1. Executive summary

ReplyPilot's bet: **conversation discovery + timing is the wedge, not
voice-matched generation.** Generation is a commodity (Typefully, TweetHunter,
Hypefury); nobody owns "here are the 10 conversations worth joining in the
next 2 hours, with the angle nobody has taken yet."

The codebase is already ahead of the PRD: multi-source feed scanner with
semantic + keyword relevance, per-user learned ranking weights recomputed
weekly from outcome funnels, a creator-research agent, side-by-side model
evals, staged analysis pipeline, split-pane workbench UI, scheduled
publishing with token refresh, and full demo-mode fallbacks. **The strategic
job is no longer "build the product" — it is "sharpen the wedge, close the
learning loop, harden for launch, and compound with agentic workflows."**

The plan is four phases:

- **Phase 0 — Launch hardening (2–3 weeks):** security, reliability, mobile,
  billing, observability. Exit: a stranger can pay and depend on it.
- **Phase 1 — Wedge sharpening (4–6 weeks):** close the outcome loop end to
  end, ship the reply-back tracker, notifications for hot windows, browser
  extension MVP. Exit: north-star metric moves week over week.
- **Phase 2 — Compounding intelligence (6–10 weeks):** agentic daily
  briefing, relationship memory, engagement-window prediction from real
  data, A/B reply variants. Exit: retention driven by accumulated data no
  competitor can copy.
- **Phase 3 — Expansion (quarter+):** LinkedIn/Bluesky/Threads, teams,
  public API. Exit: second growth curve.

---

## 2. Current-state assessment (what exists, honestly)

### Built and working
| Area | State |
|---|---|
| Analyze pipeline | Staged (`analyzing → generating → complete/failed`), tweet snapshot + top replies + OCR media text, missing-angles extraction |
| Conversation score | 0–100 with plain-language reason + 4 factors (`shared/scoring.ts`), unit-tested |
| Generation | 3 options + "generate more", category + reason per option, model selectable, prompt caching on shared tweet context |
| Voice | Trained-from-tweets or manual profiles, measured style (`shared/voice.ts`), per-tweet switching |
| Feed scanner | 4 sources (following, lists ≤5, watched handles ≤50, keyword search), 30-min cron, semantic relevance with 24h fingerprint cache, dismissed-author cooldowns |
| Learning loop | Opportunity outcome funnel (`ignored → analyzed → sent → responded`), weekly per-user ranking-weight recompute (`convex/ranking.ts`) |
| Research agent | Niche creator discovery runs → suggested/watching/passed profiles |
| Publishing | Now/scheduled, threaded/standalone/url_quote modes, X reply-restriction error parsing (`shared/xErrors.ts`) with standalone fallback, Convex-side token refresh |
| Model evals | Multi-model generation judged by a stronger model, cost/quality stored (`modelEvals`) |
| Auth/security | X OAuth 2.0 PKCE, httpOnly session cookie, `requireUser` on every Convex function, tokens isolated in `xTokens` table |
| Demo mode | Deterministic fallbacks for every integration; app fully testable with zero keys |

### Known gaps (these define Phase 0/1)
- **Reply-back tracking is not implemented** — the `responded` outcome and
  the reply-response-rate metric have no poller feeding them. The learning
  loop's most valuable signal is dark.
- **No billing** — `plan` is hardcoded `"free"`; usage is metered but nothing
  gates or charges.
- **No notifications** — a timing product that can't tap the user on the
  shoulder when a 2-hour window opens is leaving its core promise on the
  table.
- **No rate limiting / abuse controls** on AI-spending paths.
- **Mobile is untested as a first-class surface** — the new split-pane
  workbench is desktop-optimized.
- **No error tracking / product analytics** beyond Convex logs.
- **X API cost/tier risk unquantified** — timeline reads need a paid tier;
  per-user scan cost must be modeled before pricing is set.

---

## 3. Positioning & competitive strategy

**One-liner:** *Find the right X conversation before the window closes — then
reply in your voice with one click.*

| Competitor | Their center of gravity | Our counter |
|---|---|---|
| Typefully | Composing/scheduling original posts | We start from *their* tweet, not your blank page |
| TweetHunter / Hypefury | Volume tooling, auto-engagement (ToS-risky) | Human-click-always is a trust feature, not a limitation — sell it loudly |
| SuperX / list-based workflows | Manual list curation | Research agent auto-builds and maintains the watch graph |
| ChatGPT-in-a-tab | Generic drafting | Thread context, top-reply awareness, missing-angle detection, voice grounding, and above all *discovery* |

**Moat sequence (in order of durability):**
1. **Outcome data** — which conversations, authors, and angles produced
   replies that got responses, per user. Compounds daily; cannot be copied.
2. **Timing infrastructure** — scanning + velocity scoring + notifications
   tuned to the sub-2-hour window.
3. **Trust posture** — no auto-publish ever, no fake scores ever. In a
   category full of engagement-farming tools that get accounts suspended,
   being the safe tool is a brand.
4. Voice quality — table stakes; keep good, don't over-invest.

**Non-goals (permanent or v1):** auto-posting/auto-reply paths; agency
multi-account in v1; fake-precision engagement percentages; 10-option
generation.

---

## 4. Product principles (guardrails — do not regress)

Every work package inherits these. They come from `PRD.md` and `AGENTS.md`:

1. **3 options per generation** with a "generate more" button. Never 10.
2. **Reasons, not scores.** Any number shown to users must be backed by real
   data; internal ranking weights are never surfaced as ML percentages.
3. **A human clicks send on every post.** Scheduling counts as explicit
   approval of that exact text at that time. No code path may auto-publish.
4. **Every Convex function authorizes** via `requireUser(ctx, sessionToken)`.
5. **Demo mode never breaks.** Every new integration ships with a
   deterministic fallback in `shared/demoData.ts` or lib demo branches.
6. **Discovery and timing stay sharp** — features that don't serve finding
   the right conversation faster must justify themselves against that bar.
7. Respect the **X API reply restriction** (Feb 2026): parse failures via
   `shared/xErrors.ts`, always offer the standalone fallback.

---

## 5. Feature strategy — full catalog

Organized by pillar. Each item is tagged with a phase (P0–P3) and, where
non-obvious, the reason it earns its place. This is the idea backlog; the
roadmap (§10) sequences the committed subset.

### 5.1 Discovery & timing (the wedge)

- **[P1] Reply-back tracker.** Convex cron polls X for replies/likes on
  published tweet IDs (48h window, exponential backoff, batched reads).
  Feeds `opportunities.outcome = "responded"` and the reply-response-rate
  metric. *This is the single highest-leverage unbuilt feature — it closes
  the loop everything else learns from.*
- **[P1] Hot-window notifications.** Web push (+ email digest fallback) when
  an opportunity scores above a per-user threshold and the window is young.
  Quiet hours, per-source toggles, daily cap (default 5) so it never becomes
  noise. A timing product must be able to interrupt.
- **[P1] "Why now" freshness decay in ranking.** Score decays visibly with
  window age; expired opportunities auto-archive. The feed should never show
  a stale conversation as if it were live.
- **[P2] Engagement-window prediction (data-backed).** Once reply-back data
  exists, learn per-niche window curves (median time-to-peak by author size
  and topic) and show "window closes in ~40 min" with real backing. This is
  the first place a number becomes honest.
- **[P2] Niche trend radar.** Cluster scanned tweets into emerging topics per
  user niche; surface "3 conversations forming around X" before any single
  tweet is viral. Uses embeddings already computed for semantic relevance.
- **[P2] Author relationship memory.** Per-author dossier: past interactions,
  what they responded to, their reply-settings history, cadence. Surfaces
  "you've had 2 responses from @a — they post about agents at 9am ET."
- **[P2] Competitor-reply gap detection.** For watched conversations, show
  which top repliers already took which angles (extends `existingOpinions`)
  so the user's missing angle is provably missing.
- **[P3] Cross-platform discovery** (LinkedIn first — richest professional
  reply culture; then Bluesky/Threads). Abstract the source layer behind the
  existing `source` union before building.

### 5.2 Generation & voice (keep excellent, keep secondary)

- **[P0] Voice-profile eval harness.** Extend `modelEvals` with a
  voice-fidelity judge (does output match measured style?) so model/prompt
  changes can't silently degrade voice. Run on PR via a fixture set.
- **[P1] Inline "why this works" coaching.** The reason per option already
  exists; add a one-line craft note (hook type, specificity move) so users
  improve — retention via skill growth, not just output.
- **[P2] A/B reply variants.** User publishes variant A now; the app suggests
  a tracked follow-up comparison over time per category/angle. Reported as
  observed counts, never predictions.
- **[P2] Voice drift retraining.** Scheduled re-measure of the user's recent
  tweets; propose (never auto-apply) profile updates with a diff view.
- **[P2] Thread-aware replies.** When the target is mid-thread, feed
  ancestor context into generation (schema already snapshots the tweet;
  extend to ancestors).
- **[P3] Multi-voice for teams** — shared profiles with owner approval flow.

### 5.3 Workflow & surfaces

- **[P1] Browser extension MVP.** Read-only injection: when the user is on
  x.com viewing a tweet, a badge shows the conversation score and one-click
  opens the ReplyPilot workbench pre-analyzed. *No DOM automation, no
  injected posting — read + deep-link only,* keeping ToS posture clean.
  This meets users where the window actually opens.
- **[P1] Command palette (⌘K)** — paste URL, jump to opportunity, switch
  voice. The power-user retention feature for a daily tool.
- **[P2] Daily briefing surface.** One screen/email at the user's chosen
  hour: top 5 opportunities with angles, yesterday's outcomes, one coaching
  insight. Generated agentically (§7.2).
- **[P2] PWA install + offline draft queue** (see §9).
- **[P3] Public API + Zapier/MCP server** so power users wire ReplyPilot
  into their own agent stacks. Publishing endpoints still require an
  in-app human confirmation step — the API can stage drafts, never send.

### 5.4 Trust, analytics & account health

- **[P1] Personal analytics.** Which categories/angles/voices produced
  responses; time-of-day heatmap of the user's successful replies. All
  observed counts.
- **[P1] Account-health guardrails.** Client-side pacing awareness: warn if
  the user is sending many near-identical replies in a short span (spam
  pattern), surface X error patterns early. Protecting the user's account is
  part of the product promise.
- **[P2] "Received value" recap** — monthly email: hours saved estimate,
  responses earned, best reply. Fuels word-of-mouth screenshots.

---

## 6. Monetization (decide at Phase 0 exit, ship at launch)

**Recommendation: freemium subscription with usage-aware fair-use caps** —
the PRD's option 3, refined:

| Tier | Price (test) | Gets |
|---|---|---|
| Free | $0 | 3 analyses/day, 1 voice profile, no scanner, demo-grade discovery |
| Pro | $29/mo | Unlimited analyses (fair-use), scanner all 4 sources, notifications, research agent, reply-back analytics |
| Pro+ / Founder | $59/mo | Model choice incl. top-tier models, A/B variants, briefing agent, priority scanning cadence (15 min) |

Rationale:
- **The wedge features (scanner, notifications, analytics) are the paywall**,
  not generation — pricing reinforces positioning.
- Per-analysis credits (option 1) tax the exact behavior we want to maximize
  and make the north-star metric worse. Rejected.
- The `usage` table already meters tokens/requests/analyses per month —
  fair-use enforcement is a query away.
- **Unit economics gate:** before pricing is final, model per-user monthly
  cost = X API tier amortization + LLM tokens (with caching) + scan
  frequency. Model evals data (`modelEvals`) exists precisely to pick the
  cheapest model that clears the quality bar for each task — use it: cheap
  model for scan triage/classification, top model for generation.
- Billing: Stripe subscriptions + customer portal; `users.plan` becomes the
  gate; webhook → Convex http action updates plan. 7-day Pro trial, no card.

---

## 7. Agentic workflows (the compounding layer)

Principle: **agents prepare, humans decide.** Every agent output lands as a
reviewable artifact (opportunity, draft, suggestion, report) — never as a
published post or silently-applied setting.

### 7.1 Architecture

- **Runtime:** Convex scheduled functions + actions remain the spine (crons
  already run scanner/ranking/cache). Long-running agent loops run as Convex
  actions calling the **Anthropic API with structured outputs (zod) and
  prompt caching**, exactly as `src/lib/ai.ts` does today. For multi-step
  tool-use agents (research, briefing), adopt the **Claude Agent SDK**
  pattern: a Convex action drives a tool-use loop where tools are internal
  Convex functions (search X, read analysis, write suggestion).
- **Model routing:** per-task model tiers driven by `modelEvals` results —
  e.g. Haiku-class for triage/classification, Sonnet-class for generation,
  top-tier as eval judge. Store the chosen model per artifact (schema
  already does this on `generatedReplies.model`).
- **Cost control:** every agent run writes to `usage`; per-plan monthly
  budgets kill-switch agent crons for over-budget users; batch/queue
  non-urgent runs off-peak.
- **Observability:** each agent run gets a run record (mirror
  `researchRuns`: status, error, counts) so failures are visible and
  retryable, and the UI can show "last briefing ran at 7:02."
- **Safety rails in code, not prompts:** no agent tool can call publish
  mutations. The publish path stays reachable only from an authenticated
  user click.

### 7.2 The agent roster

1. **Scan-triage agent (upgrade existing scanner, P1).** Today the scanner
   scores heuristically + semantically. Add an LLM triage pass on the top-N
   candidates per scan: verify topic fit, draft the suggested angle with the
   user's missing-angle style, kill near-duplicates. Cheap model, batched,
   cached per-tweet.
2. **Research agent v2 (P1).** Extend `researchRuns` into a continuous
   background curator: monthly refresh of watched handles, prune accounts
   gone quiet, propose replacements with reasons. Human approves each
   watch-list change.
3. **Reply-back outcome agent (P1).** The poller from §5.1 plus an LLM pass
   that classifies the response ("author replied", "got ratioed",
   "conversation continued") to enrich the outcome funnel beyond booleans.
4. **Daily briefing agent (P2).** At the user's hour: reads overnight
   opportunities, outcomes, and trends; writes the briefing artifact
   (screen + optional email). Multi-step tool-use over internal queries.
5. **Voice-drift agent (P2).** Re-measures recent tweets quarterly or on
   demand; opens a "your voice has shifted" suggestion with a style diff.
6. **Ranking-analyst agent (P2).** Wraps the weekly `ranking.recomputeAll`
   with an LLM-written plain-language changelog: "You respond most to
   mid-size accounts in AI infra; search-source weight increased." Makes the
   learning loop legible — trust through transparency.
7. **Eval agent (P0, internal).** CI-invocable: runs the fixture eval set
   through current prompts/models, judges voice fidelity + guardrail
   compliance (3 options, reason present, no fake scores), fails the build
   on regression. Extends `convex/evals.ts`.
8. **Trend-radar agent (P2).** Clusters the scan corpus into emerging topics
   per niche (embeddings + LLM labeling), feeds the briefing and the radar
   surface.
9. **Onboarding concierge agent (P2).** From the user's X history at signup:
   proposes goal, seed keywords, watch candidates, and trains the first
   voice profile — turning setup from a form into a 60-second review.

---

## 8. Security architecture

Current posture is solid for a pre-launch app (PKCE OAuth, httpOnly session
cookie, `requireUser` everywhere, `xTokens` isolated from client-readable
queries, no auto-publish path). Launch hardening plan:

### 8.1 Identity & sessions
- Session tokens: random ≥128-bit, already expiring — add **rotation on
  privilege-sensitive actions** (connecting X, changing billing) and an
  absolute lifetime + sliding renewal; store a hash of the token, not the
  token itself, in `sessions`.
- CSRF: Server Actions + SameSite=Lax httpOnly cookie covers most paths;
  verify Origin on the OAuth callback and any route handler that mutates.
- OAuth: keep `state` + PKCE verifier one-time-use with short TTL; reject
  reused codes.

### 8.2 Secrets & tokens
- **Encrypt X access/refresh tokens at rest** (AES-GCM via a key in Convex
  env, rotatable) — defense in depth beyond table isolation.
- Key hygiene: `ANTHROPIC_API_KEY`, `X_CLIENT_SECRET` only in server/Convex
  env (`npx convex env set`); CI secret-scanning (gitleaks) on every PR;
  never log tokens (audit `console.*` in `convex/` and `src/lib`).
- Scope minimalism: request only the X scopes each feature needs; degrade
  gracefully when a scope is missing rather than over-requesting up front.

### 8.3 Abuse & spend protection
- **Rate limiting on every AI-spending mutation/action** (per-user sliding
  window in Convex: analyses/hour, generations/hour) and on auth endpoints
  (per-IP, in the route handler). Free tier limits are also the abuse
  ceiling.
- Monthly token budget per plan enforced server-side (the `usage` table is
  the ledger); hard-stop with a clear UI state, never silent failure.
- Input hardening: tweet text, bios, and top replies are **untrusted input
  to prompts** — wrap in delimited context blocks, instruct models to treat
  as data, and validate structured outputs against zod schemas (already the
  pattern; make it a stated invariant). Never render fetched content as
  HTML (React default escaping; keep it that way — no
  `dangerouslySetInnerHTML` on external strings).

### 8.4 Application & platform
- Security headers in `next.config`: CSP (script-src 'self' + Convex/Stripe
  origins), HSTS, X-Frame-Options DENY, Referrer-Policy, Permissions-Policy.
- Dependency hygiene: Dependabot/renovate + `npm audit` gate in CI.
- Webhooks (Stripe, future X): signature verification + replay protection
  in Convex http actions.
- Convex function surface audit as a CI check: a script that fails if any
  exported query/mutation/action doesn't call `requireUser` (or is
  explicitly allow-listed as public, e.g. OAuth helpers).

### 8.5 Privacy & compliance
- Data inventory + retention: tweet snapshots and analyses are user data —
  document retention, build **account deletion** (cascade across all 14
  tables) and **data export** (JSON) before launch; both are GDPR table
  stakes and an X API compliance expectation.
- X developer policy: keep the "human clicks send" invariant documented in
  the developer-portal app description; store proof (no publish path without
  session-authenticated click) for platform review.
- Privacy policy / ToS pages exist (`src/app/privacy`, `terms`) — have them
  reviewed against actual data flows before charging money.

### 8.6 Threat model quick reference
| Threat | Mitigation |
|---|---|
| Stolen session cookie | httpOnly + Secure + SameSite, token hashing, rotation, short TTL |
| X token exfiltration | Table isolation + at-rest encryption + never-to-client queries |
| Prompt injection via tweet content | Data/instruction separation, zod-validated outputs, no tool access from content-derived prompts, human review of all output |
| LLM spend abuse | Per-user rate limits + plan budgets + kill switch |
| Account suspension (user's X account) | No automation, pacing warnings, error parsing + fallbacks |
| Billing webhook forgery | Stripe signature verification, idempotency keys |

---

## 9. Responsive design strategy

The Dark Chrome system (`design.md`) is desktop-editorial today; the reply
window doesn't wait for a laptop. Strategy: **desktop = deep workbench,
mobile = triage + send.**

- **Breakpoint behavior for split panes:** the new resizable split-pane
  infra (`react-resizable-panels`) collapses below `lg` into a
  stacked master→detail navigation (list screen pushes detail screen, back
  gesture returns). No horizontal scrolling, ever.
- **Mobile-first task audit:** the three flows that must be flawless on a
  phone are (1) open notification → opportunity detail → pick option → send;
  (2) paste URL → analyze → copy; (3) approve a scheduled draft. Everything
  else may remain desktop-preferred.
- **Touch ergonomics:** 44px minimum targets; primary actions (send, copy,
  dismiss) in a bottom action bar within thumb reach; swipe-to-dismiss on
  opportunity cards with undo.
- **Typography scale:** Instrument Serif display sizes step down via
  `clamp()`; body stays ≥16px to avoid iOS zoom-on-focus.
- **PWA (P2):** manifest + service worker; installable, push notifications
  (ties into §5.1 hot-window alerts — on mobile this *is* the product),
  offline queue for drafts written on the train.
- **Performance budget:** LCP < 2.0s on mid-tier mobile for dashboard and
  opportunity detail; Convex reactivity already avoids polling — keep
  initial payloads lean with route-level code splitting (App Router default)
  and skeletons matching Dark Chrome surfaces.
- **Accessibility as part of responsive:** the pure-black/near-black
  palette must hold WCAG AA contrast (audit `muted-foreground` #a1a1aa on
  #181818 usages); full keyboard operability of the workbench (pairs with
  ⌘K palette); `prefers-reduced-motion` respected on pane transitions.
- **Test matrix in CI:** Playwright viewport suite (375px, 768px, 1280px,
  1728px) over the three critical flows, screenshot-diffed.

---

## 10. Roadmap

### Phase 0 — Launch hardening (weeks 1–3) · *Exit: chargeable & dependable*
1. Security hardening batch (§8.1–8.4): token hashing+encryption, rate
   limits, headers, `requireUser` CI audit, secret scanning.
2. Stripe billing + plan gating + fair-use enforcement on `usage`.
3. Account deletion + data export.
4. Error tracking (Sentry) + product analytics (PostHog: funnel events for
   north star) + Convex function alerting.
5. Eval agent in CI (§7.2.7) + fixture set; guardrail compliance checks.
6. Mobile stacked-navigation pass on the split-pane screens + Playwright
   viewport suite.
7. X API tier decision + per-user cost model (feeds pricing).

### Phase 1 — Wedge sharpening (weeks 3–9) · *Exit: north star moving*
1. Reply-back tracker + outcome agent (§5.1, §7.2.3) — unblocks the
   response-rate metric and the learning loop.
2. Hot-window push notifications + digest email (§5.1).
3. Freshness decay + auto-archive in the feed.
4. Scan-triage agent upgrade (§7.2.1) and research agent v2 (§7.2.2).
5. Browser extension MVP (read + deep-link only) (§5.3).
6. Personal analytics v1 + account-health warnings (§5.4).
7. Command palette; onboarding concierge groundwork.
8. **Launch:** waitlist → founder-led beta (50 users) → public launch
   (Product Hunt + build-in-public thread using the product itself — the
   founder's reply-driven growth is the case study).

### Phase 2 — Compounding intelligence (weeks 9–19) · *Exit: data moat visible*
1. Daily briefing agent + surface (§7.2.4).
2. Engagement-window prediction from accumulated reply-back data (§5.1) —
   the first honest number.
3. Author relationship memory + trend radar (§5.1, §7.2.8).
4. A/B reply variants (observed-count reporting) (§5.2).
5. Voice-drift agent + ranking-analyst changelog (§7.2.5–6).
6. PWA + offline drafts.
7. Pricing iteration from real usage/cost data; Pro+ tier if model costs
   justify.

### Phase 3 — Expansion (quarter 2+) · *Exit: second curve*
1. LinkedIn discovery + reply workbench (abstract source layer first).
2. Bluesky/Threads (cheaper APIs, smaller wedge — fast follows).
3. Team workspaces: shared voice profiles with approval, per-member
   analytics (this retires the "single account" v1 constraint deliberately,
   with its own permissions design — not bolted on).
4. Public API + MCP server (stage-only publishing) (§5.3).

**Standing weekly cadence regardless of phase:** review north-star cohort
chart; review eval-agent regressions; review LLM+API spend per active user.

---

## 11. Metrics & instrumentation

- **North star:** % of generated replies used with no/minor edits per active
  user per week (`usage.stats.noEditRate`; edits set `editedBeforeSend`).
- **Wedge health:** opportunity → analyzed → sent → responded funnel
  conversion (fields already on `opportunities`); median opportunity age at
  send (timing sharpness); scanner precision (dismiss rate as inverse).
- **Outcome quality:** reply-back rate within 48h (Phase 1 unblocks this).
- **Business:** week-2 retention, free→pro conversion, LLM+API gross margin
  per Pro user.
- **Guardrail metrics (watch for harm):** replies sent per user per day
  (spikes = spam risk), near-duplicate reply rate, X error rates by type.
- Instrument in PostHog with a small typed event helper; every event name
  reviewed once — no ad-hoc strings.

---

## 12. Top risks & mitigations

1. **X API pricing/terms shift (existential).** Mitigate: cost model before
   pricing (P0), read-frugal scanning (batched, source-capped), extension
   deep-link mode works even if timeline reads become untenable, Phase 3
   platform diversification. Monitor developer-terms changes monthly.
2. **User account suspensions.** Mitigate: human-click invariant, pacing
   warnings, no DOM automation in the extension, publish error telemetry.
3. **LLM cost > price.** Mitigate: model routing via evals, prompt caching
   (already on), per-plan budgets, fair-use caps.
4. **Wedge erosion (competitor ships discovery).** Mitigate: speed on Phase
   1 + the outcome-data moat — their discovery starts cold, ours is trained
   per user.
5. **Notification fatigue kills trust.** Mitigate: hard daily cap, quality
   bar per notification tracked (open→send rate per alert), quiet hours.
6. **Metric gaming (north star rewards blandness).** Watch reply-back rate
   alongside no-edit rate; a rising no-edit rate with a falling response
   rate means generation got safe and boring — retune.

---

## 13. Launch & GTM (compressed)

- **Positioning line:** competitors help you write; ReplyPilot finds what to
  reply to while it still matters.
- **Motion:** build-in-public (the founder using ReplyPilot to grow on X is
  the demo), beta cohort of 50 reply-driven founders hand-picked via the
  research agent itself, Product Hunt at Phase 1 exit, content engine =
  weekly "anatomy of a great reply" breakdowns generated from (anonymized,
  consented) real wins.
- **Pricing page honesty as marketing:** "we will never auto-post, and we
  will never show you a made-up score" — the guardrails are the brand.

---

## 14. Handover work packages (agent-ready)

Each package is scoped to be independently buildable. All inherit §4
guardrails and the repo checks (`npm run typecheck && npm run lint &&
npm test && npm run build`), Convex guidelines
(`convex/_generated/ai/guidelines.md`), and demo-mode parity.

| # | Package | Phase | Key files/areas | Definition of done |
|---|---|---|---|---|
| WP1 | Security hardening batch | P0 | `convex/helpers.ts`, `sessions`/`xTokens`, `next.config`, new CI scripts | §8.1–8.4 items landed; `requireUser` audit green in CI; tokens hashed+encrypted |
| WP2 | Stripe billing + gating | P0 | new `convex/billing.ts`, http action webhook, `users.plan`, settings UI | Free/Pro live behind test keys; plan gates scanner/notifications; demo mode unaffected |
| WP3 | Deletion + export | P0 | new `convex/account.ts`, settings UI | Cascade delete across all tables; JSON export download |
| WP4 | Observability | P0 | Sentry + PostHog wiring, typed event helper | North-star funnel visible on a dashboard |
| WP5 | Eval agent + CI gate | P0 | `convex/evals.ts`, fixtures, CI workflow | Regression on voice fidelity/guardrails fails CI |
| WP6 | Mobile stacked navigation | P0 | split-pane screens, Playwright viewport suite | 3 critical flows pass at 375px; no horizontal scroll |
| WP7 | Reply-back tracker + outcome agent | P1 | new cron + `convex/outcomes.ts`, `opportunities.outcome` | `responded` populated in prod; response-rate on dashboard |
| WP8 | Hot-window notifications | P1 | web push service worker, notification settings, digest email | Capped, quiet-hours-aware alerts; open→send rate tracked |
| WP9 | Scan-triage agent | P1 | `convex/scannerActions.ts`, model routing | LLM triage on top-N; dismiss rate drops measurably |
| WP10 | Browser extension MVP | P1 | new `extension/` workspace | Score badge + deep link on x.com; zero DOM automation |
| WP11 | Personal analytics v1 | P1 | new analytics queries + dashboard section | Category/angle/time-of-day insights from real outcomes |
| WP12 | Daily briefing agent | P2 | agent action + briefing surface/email | Runs at user hour with run record; human-readable artifact |
| WP13 | Relationship memory | P2 | new `authors` table + dossier UI | Per-author history informs feed + workbench |
| WP14 | A/B variants | P2 | drafts extension + observed-count reporting | No predictions shown; comparisons from real data |
| WP15 | PWA + offline drafts | P2 | manifest, service worker, draft queue | Installable; drafts survive offline |

---

*Maintenance note: keep `STRATEGY.md` as the one-page summary; update this
document at each phase exit. When a work package ships, move its learnings
into `PRD.md` if they change product truth.*
