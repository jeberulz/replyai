# PRD: WP52 — Compose Activation and Evidence

## 1. Introduction

ReplyPilot's `/compose` page is an implemented reply-to-post ladder. It turns
replies that earned a response into three standalone posts, three 4–8-post
threads, or three long-form drafts by clustering winning replies and unused
analysis angles.

The underlying product idea is sound, but the current surface creates three
problems:

1. Compose is the second item in primary navigation even though it is a
   downstream Phase-2 retention feature, not the discovery-and-timing wedge.
2. New, demo, and not-yet-eligible users see sample clusters without a clear
   explanation of which inputs and outputs are examples versus live data.
3. Compose has no dedicated activation or conversion instrumentation, so the
   team cannot determine whether eligible users generate, act on, or return to
   it.

WP52 will make Compose an earned, evidence-producing retention surface. It will
hide Compose from navigation until the user has at least one real qualifying
reply win, keep `/compose` directly reachable as a clearly labelled preview,
record truthful input and generation provenance, instrument the complete
Compose funnel, and correct misleading immediate-publish copy.

This package does not change ReplyPilot's core strategy. Conversation discovery
and timing remain the launch wedge. Compose remains the reward for a core loop
that has already worked.

## 2. Work-package registration

The implementation orchestrator must register this package in
`docs/PRODUCT_STRATEGY.md` section 14 before implementation begins, using the
next unallocated identifier. The expected identifier is **WP52**; the
orchestrator must confirm it against the latest `main` and must not reuse or
renumber an existing package.

Proposed row:

| # | Package | Phase | Key files/areas | Definition of done |
|---|---|---|---|---|
| WP52 | Compose activation and evidence | Beta / P2 validation | `convex/compose.ts`, `convex/schema.ts`, `shared/compose.ts`, `src/app/actions.ts`, `src/lib/analytics/events.ts`, `src/components/app/compose-ladder.tsx`, sidebar/command navigation, compose/analytics tests, observability docs | Compose is hidden from navigation until a non-demo user has a real qualifying reply win while `/compose` remains directly reachable as an explicit zero-cost preview; real runs resolve authorized clusters server-side; input and generation provenance are truthful and persisted; typed events measure open → generate → option action and real/demo breakdowns; immediate-publish copy states that posting is queued rather than awaiting confirmation; demo mode, authorization, three-option guardrails, and full checks remain green. |

Dependencies:

- WP7 reply-back tracking and `replyOutcomeTrackers` data.
- WP20 edit-distance buckets used by the existing winning-reply definition.
- WP23 reply-to-post ladder implementation.
- WP40 demo isolation, spend controls, and private-beta foundation.

## 3. Goals

- Keep Compose out of the primary activation path until it can use at least one
  real qualifying reply win.
- Preserve direct access to `/compose` for previews, QA, demos, and explicit
  links.
- Tell users whether Compose is using example reply wins or their real reply
  wins.
- Tell users whether displayed results are live AI output or deterministic
  preview/fallback output, without exposing provider configuration or secrets.
- Persist enough provenance on each run to support reliable analytics and
  debugging.
- Instrument the Compose funnel from page open through generation and the first
  meaningful action on an option.
- Correct publishing language so users understand that the standalone action
  queues an immediate post; Drafts shows status and is not a second approval
  step.
- Produce sufficient beta evidence to decide whether Compose deserves continued
  investment or prominent product placement.

## 4. User stories

### US-001: Register and scaffold WP52

**Description:** As the implementation team, we need WP52 registered and split
into atomic stories so that the work follows the repository playbook and can be
resumed safely by a fresh agent.

**Acceptance Criteria:**

- [ ] Confirm WP52 is the next available identifier on latest `main`; if it is
  not, use the next available identifier consistently.
- [ ] Add the approved work-package row to
  `docs/PRODUCT_STRATEGY.md` section 14.
- [ ] Create `docs/wp/wp52-stories.md` and append-only
  `docs/wp/wp52-progress.md` before the first product-code edit.
- [ ] Record base SHA, branch, dependency status, file boundary, collision
  check, initial check output, and model-routing ledger in the progress file.
- [ ] Use one implementation branch and one implementation PR for WP52.

### US-002: Add a lightweight Compose availability contract

**Description:** As the application shell, I need a cheap authenticated answer
to whether the user has real Compose source material so that navigation can be
unlocked without running the full clustering query on every page.

**Acceptance Criteria:**

- [ ] Add an authenticated Convex query that returns a stable availability
  shape containing at least `hasRealSource: boolean`.
- [ ] `hasRealSource` is always false for demo identities, even if isolated demo
  activity produced rows resembling tracked reply wins.
- [ ] `hasRealSource` uses the existing WP23 winning-reply semantics: responded,
  non-empty, and not `major_edit`; legacy rows without an edit bucket remain
  eligible unless a separate owner ruling changes WP23 behavior.
- [ ] The query never returns demo fixtures or reply text and stops after it can
  determine availability.
- [ ] The query does not call or reproduce full topic clustering and is bounded
  to the existing recent-outcome limits or tighter limits.
- [ ] The query calls `requireUser(ctx, sessionToken)` and cannot reveal another
  user's availability.
- [ ] Pure eligibility logic is shared with clustering rather than duplicated
  with subtly different rules.
- [ ] Unit tests cover no trackers, expired-only trackers, responded/no-edit,
  responded/minor-edit, responded/major-edit, blank text, legacy missing bucket,
  and cross-user isolation.

### US-003: Make Compose an earned navigation item

**Description:** As a new or not-yet-eligible user, I want the product navigation
to focus on discovery and replies so that an advanced original-post feature does
not distract from the core workflow.

**Acceptance Criteria:**

- [ ] Hide the Compose entry from both the expanded/collapsed sidebar and the
  command menu while `hasRealSource` is false or still loading.
- [ ] Show the Compose entry reactively when `hasRealSource` becomes true,
  without requiring a logout or full application restart.
- [ ] Do not reorder or change the behavior of unrelated navigation items.
- [ ] `/compose` remains directly reachable for every authenticated user.
- [ ] A direct visit without real source material renders a clear preview state
  and does not redirect or return a 404.
- [ ] Preview generation is deterministic, consumes zero model tokens, and does
  not decrement paid AI spend or fair-use generation allowance.
- [ ] Loading and Convex-error states fail closed for navigation visibility but
  do not break the application shell.
- [ ] UI works in expanded desktop, collapsed desktop, and mobile navigation.
- [ ] Verify the actual flow in the browser at 375, 768, 1280, and 1728 widths.

### US-004: Make input and generation provenance truthful

**Description:** As a user, I want to know whether Compose is using my reply
wins and live generation or an example preview so that I do not mistake sample
content for personal evidence.

**Acceptance Criteria:**

- [ ] Replace or extend the ambiguous run-level `demo` meaning with separate,
  additive provenance for source material and generation result.
- [ ] Source provenance distinguishes at least `real` from `demo`.
- [ ] Generation provenance distinguishes at least `live` from
  `deterministic`; an internal bounded reason may distinguish demo-user,
  provider-unavailable, and generation-error fallbacks.
- [ ] Existing `composeRuns` rows remain readable; any schema change follows
  additive/optional-first compatibility.
- [ ] The actual result returned by `generateComposeOptions` determines stored
  generation provenance. It must not be inferred only from the cluster source.
- [ ] Real generation resolves the selected cluster server-side from the
  authenticated user's currently eligible sources by stable ID; client-supplied
  reply text, angles, and draft IDs are not authoritative.
- [ ] Preview generation resolves only a known server-side demo-cluster ID and
  cannot submit arbitrary prompt context.
- [ ] The UI labels example clusters as a preview and labels deterministic
  outputs as preview/fallback output.
- [ ] Real clusters and live output are labelled as based on the user's reply
  wins without claiming predicted engagement or guaranteed performance.
- [ ] User-facing copy never reveals missing environment-variable names,
  provider secrets, raw model errors, or internal spend-control details.
- [ ] Demo users remain deterministic even when production model keys exist.
- [ ] Tests cover all source/generation combinations and compatibility with
  legacy rows.
- [ ] Verify the actual preview and real-source states in the browser.

### US-005: Instrument the Compose evidence funnel

**Description:** As the product team, we need typed Compose events so that we
can decide whether eligible beta users take meaningful action and return.

**Acceptance Criteria:**

- [ ] Add all event names and property types only through
  `src/lib/analytics/events.ts`; no ad-hoc analytics strings are introduced.
- [ ] Record a page-open event once per mounted Compose visit after availability
  is known, including availability and source provenance.
- [ ] Record generation completion for initial and generate-more requests,
  including format, source provenance, generation provenance, success/failure,
  and a non-sensitive run identifier when available.
- [ ] Record option actions for copy, save, and standalone publish, including
  format, category, source provenance, generation provenance, and run ID.
- [ ] Analytics events are emitted only after the corresponding action succeeds;
  failure is represented explicitly where required rather than counted as a
  successful conversion.
- [ ] Direct-publish success remains ultimately confirmed by the existing
  Convex `published` event; a queued action is not misreported as published.
- [ ] Analytics adapters continue to no-op cleanly with no PostHog key.
- [ ] `tests/analytics.test.ts` or focused WP52 tests prove event names, property
  shapes, no-key behavior, and absence of duplicate page-open events.
- [ ] Update `docs/observability.md` with a Compose insight definition covering
  eligible open → generate → option action, broken down by real/demo source,
  live/deterministic generation, format, and action.

### US-006: Correct immediate-publish semantics

**Description:** As a user posting a standalone option, I want the CTA and
confirmation message to describe the actual side effect so that I know the post
has been queued immediately and is not awaiting another approval in Drafts.

**Acceptance Criteria:**

- [ ] The standalone primary CTA explicitly communicates immediate posting,
  for example `Post now`; it must not imply saving or a later confirmation.
- [ ] After the publish mutation succeeds, the toast says the post was queued
  and that Drafts shows status; it must not say `confirm in Drafts`.
- [ ] A failed mutation shows an error and emits no successful option-action
  conversion.
- [ ] The existing invariant remains: the publish mutation is called only from
  an explicit click on that exact displayed text.
- [ ] No confirmation modal, auto-publish path, thread API publishing, or
  long-form API publishing is added.
- [ ] The primary mobile action remains at least 44px.
- [ ] Verify success and failure states in the browser without publishing to a
  real external account; use isolated demo/test state for routine verification.

### US-007: Complete the beta evidence gate

**Description:** As the product owner, I want a verified, documented package and
a clear experiment decision rule so that Compose does not regain prominence
without evidence.

**Acceptance Criteria:**

- [ ] Demo mode passes end to end with zero X or Anthropic keys.
- [ ] Focused tests cover eligibility, navigation filtering, provenance,
  analytics, and publish copy/behavior.
- [ ] `npm run typecheck`, `npm run lint`, `npm test`, `npm run evals`,
  `npm run security:audit`, `npm run build`, and the existing responsive
  browser suite all pass.
- [ ] Run `/security-review` because the package touches authenticated Convex
  data, analytics, model provenance, and publishing actions.
- [ ] Run `/code-review` on the final diff and address correctness findings.
- [ ] `docs/wp/wp52-progress.md` maps every Definition-of-Done item to evidence.
- [ ] The PR description includes WP52, its complete Definition of Done,
  verification evidence, deviations, and `Found, not fixed` items.
- [ ] No agent merges the PR without explicit owner authorization.

## 5. Functional requirements

- **FR-1:** Compose navigation visibility must be derived from authenticated
  real outcome data, never from the existence of demo fixtures.
- **FR-2:** Compose navigation must be hidden until availability resolves true;
  loading and error states must default to hidden.
- **FR-3:** Direct authenticated navigation to `/compose` must remain supported
  regardless of availability.
- **FR-3a:** Ineligible direct-preview generation must be deterministic,
  zero-token, and excluded from paid-model and generation-allowance consumption.
- **FR-4:** The existing winning-reply definition remains the source of truth for
  both clustering and availability.
- **FR-5:** Availability checks must be bounded and materially cheaper than
  `listClusters`; they must not hydrate full analyses, opportunities, or topic
  clusters.
- **FR-6:** A Compose run must persist source provenance independently from
  generation provenance.
- **FR-7:** Generation provenance must use the actual post-generation result,
  including deterministic fallback after a model error.
- **FR-7a:** Real Compose actions must resolve the selected cluster from
  authorized server-side data by stable ID; client-provided cluster content is
  not authoritative.
- **FR-8:** Existing run records must remain readable after deployment.
- **FR-9:** Preview copy must clearly state that example reply wins are not the
  user's outcomes.
- **FR-10:** User-facing fallback copy must remain provider-neutral and must not
  expose configuration details.
- **FR-11:** Compose must continue to generate exactly three options per request
  and retain the Generate more action.
- **FR-12:** Threads remain copy/save only; long-form remains copy/save only;
  standalone remains the only Compose format using the existing API publish
  path.
- **FR-13:** The standalone post action must be described as immediate/queued,
  not as waiting for confirmation in Drafts.
- **FR-14:** Typed analytics must distinguish opens, generation outcomes, and
  successful option actions.
- **FR-15:** Analytics must distinguish real/demo input and live/deterministic
  generation.
- **FR-16:** A queued standalone post must not be counted as actually published
  until the existing publish worker emits `published`.
- **FR-17:** Analytics and observability failures must never block Compose.
- **FR-18:** Every new or changed public Convex function must authorize through
  `requireUser(ctx, sessionToken)`.
- **FR-19:** No analytics property may contain reply text, generated content,
  session tokens, X tokens, prompt content, provider errors, or secrets.
- **FR-20:** All UI changes must use existing Dark Chrome/Astryx adapters and
  preserve current mobile interaction targets.

## 6. Non-goals

- No blank-page generic composer.
- No changes to feed discovery, conversation scoring, scanner cadence,
  notification timing, or reply-outcome polling.
- No change to the threshold or semantic definition of a winning reply.
- No auto-generated posts based on likes, impressions, or unresponded replies.
- No automatic navigation unlock based on demo activity.
- No paywall, billing, plan, or beta-entitlement changes.
- No new X publishing endpoint or publishing mode.
- No API publishing for threads or X Articles.
- No scheduling UI inside Compose.
- No confirmation modal for the existing explicit Post now action.
- No automated promotion of Compose back into primary navigation.
- No customer-facing model/provider names or selectors.
- No engagement predictions, fake scores, or claims that a proven reply
  guarantees a successful standalone post.
- No retroactive backfill unless implementation evidence proves it is required
  and the owner approves a dry-run inventory under the playbook.

## 7. Design considerations

- Locked users should not see a disabled or teaser navigation item. The main
  navigation should stay focused on the wedge.
- A direct `/compose` visit before unlock should feel like an intentional
  preview, not an error. Example language: `Preview: these are sample reply
  wins. Compose appears in navigation after one of your ReplyPilot replies gets
  a response.`
- Use compact badges or status text for provenance. Avoid modal interruptions,
  large warning banners, or a wall of explanatory cards.
- Preserve the existing master-detail layout and format selector.
- Reuse existing `Badge`, `Banner`/empty-state, `Button`, `Text`, and split-pane
  adapters. Do not invent new brand tokens or hexadecimal colors.
- The live state may say `Based on your reply wins`; deterministic fallback may
  say `Preview output`. Do not expose the underlying provider or failure reason.
- Navigation filtering must behave consistently in expanded sidebar, collapsed
  tooltips, mobile drawer, and command menu.

## 8. Technical considerations

- Start from latest clean `main`; the audited deployed release was newer than
  the original local checkout, so the worker must not assume line numbers or
  old file contents.
- Read `convex/_generated/ai/guidelines.md` before Convex changes and the
  relevant `node_modules/next/dist/docs/` guides before Next.js changes.
- Prefer extracting a pure shared eligibility predicate from
  `shared/compose.ts` so `listClusters` and availability cannot drift.
- The application shell already provides a session token through
  `ConvexClientProvider`; navigation can subscribe reactively without moving
  reply data into the server-rendered layout.
- `navLinks` is consumed by both the sidebar and command menu. Implement an
  explicit availability capability rather than mutating a global array or
  filtering only one consumer.
- The availability query must not reuse `listClusters`, whose joins and full
  output are unnecessary for global navigation.
- `composeRuns.demo` currently conflates cluster provenance with generation
  provenance. Use additive optional fields or a compatibility adapter; never
  make existing rows fail validation.
- `generateComposeOptions` already reports whether its result is deterministic.
  Propagate that actual result into persistence and UI.
- Replace the current client-authoritative `cluster` action argument with a
  stable cluster identifier or re-resolve and compare it server-side before any
  prompt is built.
- If fallback reasons are stored, use a small enum and keep raw error text in
  the existing error-reporting path rather than analytics or user-visible data.
- Keep new analytics in the canonical typed catalog. Prefer a small Compose
  event family rather than forcing Compose into analysis-specific fields such
  as `analysisId` or `replyId` when those identifiers do not exist.
- Server-side successful save/publish events should be emitted after mutations;
  clipboard actions remain client-side.
- Do not add a dependency for feature flags, analytics, or provenance.
- Any schema change is risk-ordered last within its story and must be
  additive/optional-first.

## 9. Expected file boundary

Likely owned files:

- `shared/compose.ts`
- `convex/compose.ts`
- `convex/schema.ts` only for additive provenance fields
- `src/lib/ai.ts` only if needed to refine the existing bounded provenance
  return type
- `src/app/actions.ts` compose actions only
- `src/lib/analytics/events.ts`
- `src/components/app/compose-ladder.tsx`
- `src/components/app/sidebar/nav-links.ts`
- `src/components/app/sidebar/sidebar-nav.tsx`
- `src/components/app/command-menu.tsx`
- Focused tests under `tests/`
- `docs/observability.md`
- `docs/PRODUCT_STRATEGY.md` section 14 registration only
- `docs/wp/wp52-stories.md`
- `docs/wp/wp52-progress.md`

Potential collisions requiring orchestration:

- App-shell/navigation redesign work.
- Any concurrent analytics-catalog or observability work.
- AI/model-routing work touching `src/lib/ai.ts`.
- Schema work touching `composeRuns` or account export/deletion.
- WP40 completion work still open on the target branch.

Files outside this boundary require an escalation and, when product behavior is
ambiguous, a ruling appended to `docs/wp/RULINGS.md`.

## 10. Success metrics and beta decision rule

Instrumentation must support these measures among users with
`hasRealSource=true`:

- Eligible Compose open rate.
- Open → generation-complete conversion.
- Generation-complete → copy/save/queued-publish conversion.
- Breakdown by standalone/thread/long-form.
- Breakdown by real/demo source and live/deterministic generation.
- Repeat usage: users completing at least two Compose runs in a rolling 30-day
  window.
- Actual standalone publish success via the existing `published` event.

Initial beta evaluation rule:

- Collect at least 30 days of evidence from 10–15 users who have real qualifying
  reply wins.
- Continue investing and consider more prominent discovery only if at least 25%
  of eligible users complete two or more Compose runs in 30 days and at least
  35% of successful generation sessions produce a copy, save, or queued publish
  action.
- Treat these as product decision thresholds, not customer-facing performance
  claims.
- If the sample is smaller, report raw numerator/denominator and do not declare
  success or failure from percentages alone.
- Compose must not reduce the core opportunity → analysis → reply-send funnel;
  monitor that funnel separately and do not attribute unrelated changes to
  WP52.

## 11. Open questions

No blocking product questions remain. The owner approved:

- Full activation package.
- Direct URL remains accessible; navigation unlocks only from real qualifying
  reply wins.
- One WP52 implementation branch/PR with sequential stories and separate
  reviewer/gate sub-agents.

Implementation-level UNKNOWNs must follow `docs/AGENT_PLAYBOOK.md`: stop,
escalate, and record the owner ruling in `docs/wp/RULINGS.md` rather than
guessing.
