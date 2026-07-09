# WP Rulings

Append-only ledger for scope and product rulings that unblock work packages.

## 2026-07-08 - WP16 - Scope boundary

Question: WP16's original file boundary listed only `src/lib/ai.ts`, `convex/analyses.ts`, and `convex/publish.ts`, but the §14 definition of done requires thread-ancestor persistence and a scheduled stale-pipeline sweep, which need files outside that boundary.

Ruling: WP16 may also edit these files, only as needed to satisfy the DoD:

- `src/lib/x.ts` for fetching and deterministic thread ancestor context into `TweetBundle`.
- `convex/schema.ts` for additive persistence of ancestor snapshots on `tweetAnalyses`.
- `src/app/actions.ts` for writing ancestors during analysis and restoring them when rebuilding bundles from saved analyses.
- `convex/crons.ts` to schedule the stale-pipeline sweep.
- `shared/demoData.ts` if needed for deterministic demo-mode ancestor fixtures.
- Focused tests/eval fixtures if needed to verify the WP16 guardrails.

## 2026-07-08 - WP19

- Question: May WP19 edit files outside `convex/scannerActions.ts` and `convex/crons.ts` to satisfy the §14 DoD items for plan/activity-adaptive cadence and plan-aware search budgets?
- Ruling: Yes. WP19 may edit `convex/scanner.ts` only to expose the minimum internal `scanContext` data needed for the §14 DoD: user plan and scan activity fields such as `lastScanAt` and `lastScanCount`. Keep all other runtime work in `convex/scannerActions.ts` and `convex/crons.ts`. Do not edit schema, UI, billing, or generated files unless WP19 stops and escalates again.

## 2026-07-09 - WP24–WP28 - Astryx adoption program

Question: Approve the Astryx adoption plan (`docs/wp/WP24-ASTRYX-ADOPTION-PLAN.md`) and the §9 owner decisions?

Ruling:

1. **WP24–WP28 are official §14 packages.** Execute per the plan. WP28 is deferred until after WP24–WP27 gate (Phase 1 / with command palette), not in the first foundation wave.
2. **Adapter path:** `src/components/ds/` strangler. Leave `src/components/ui/` shadcn intact until call sites move (WP25+).
3. **Shell strategy:** token-restyle / compose existing sidebar first in WP26; adopt Astryx `AppShell` only if the smaller-diff restyle fails brand/density DoD — escalate before ripping the sidebar.
4. **Gate 0 required:** CI lockfile PR merged; dirty research tree cleaned against `main` before WP24 starts.
5. **Brand lock:** Dark Chrome owns visuals. Stock Neutral/Butter/Gothic aesthetics must not ship. Landing (`src/app/page.tsx`) is out of scope for the entire program.
6. **Theme provider scope:** `<Theme>` only on `(app)` and `(onboarding)` layouts — never root layout.
7. **Mobile primary actions:** even if Astryx density uses 28–36px controls, primary mobile send/copy/dismiss targets must meet ≥44px (PRODUCT_STRATEGY §9) via theme/override.

## 2026-07-09 - WP27 - OptionCard vs SelectableCard

Question: Does WP27 DoD require OptionCard to use Astryx `SelectableCard` literally?

Ruling: No. `SelectableCard` is a checkbox-selection pattern. OptionCard is multi-action publish chrome (edit/rewrite/schedule/publish). **`ds/Card` is the accepted equivalent.** Keep 3 options + reason + explicit publish click. Do not force SelectableCard onto OptionCard.

## 2026-07-09 - WP29–WP30 - Voice & Settings Astryx migration

Question: WP24 plan froze `settings/**` until WP2/WP3 cleared and deferred `voice-studio.tsx` to wave C. When may we migrate these tabs onto `ds/`?

Ruling:

1. **Freeze lifted** after WP24–WP28 landed on `main`. Settings and Voice are no longer frozen zones.
2. **Sequential packaging:** WP29 Voice Studio first; WP30 Settings after WP29 merges (separate branch/PR).
3. **Adapter path unchanged:** `ds/` strangler; `ui/` stays. **Dialog/Select stay on `ui/`** for WP29–30 (same as WP27 OptionCard ruling).
4. **No behavior changes:** voice train/CRUD/default, billing checkout/portal, export/delete, model default — UI swap only.
5. **Landing + Theme scope:** unchanged (`page.tsx` off Astryx; Theme on `(app)`/`(onboarding)` only).

## 2026-07-09 - WP10 - App deep-link for pre-analyze

- Question: WP10's §14 key-files column lists only `extension/`, but the DoD
  requires a deep link that opens the workbench pre-analyzed. Today
  `/dashboard?url=` only prefills the composer.
- Ruling: WP10 may make the minimum app-side change to honor `auto=1` with a
  valid tweet `url` on `/dashboard` and `/analyze` (pass-through redirect),
  starting the existing analyze pipeline once. No new Convex APIs, no
  publish paths, no cookie/token access from the extension. All other work
  stays in `extension/` (+ shared scoring helpers/tests as needed).

## 2026-07-09 - WP9 - Scan-triage agent file boundary

- Question: WP9's §14 key-files column lists `convex/scannerActions.ts` and
  "model routing", but the curated-source relevance gate lives in
  `shared/semanticRelevance.ts` and the Haiku classifier that must emit
  `suggestedAngle` lives in `convex/semanticActions.ts`.
- Ruling: WP9 may edit these files, only as needed to satisfy the DoD:
  - `shared/semanticRelevance.ts` — curated-source relaxed threshold +
    triage/angle types used by the classifier and feed filter; keep
    `opportunityStillRelevant` consistent with the same gate.
  - `convex/semanticActions.ts` — extend the existing Haiku batch call to
    return relevance + brandSafety + suggestedAngle in one pass (model
    routing stays Haiku-class / `SEMANTIC_HAIKU_MODEL` /
    `ANTHROPIC_SEMANTIC_MODEL`).
  - `convex/scannerActions.ts` — consume triage angles; remove template
    `suggestAngle()`.
  - Focused tests under `tests/` for the filter + demo triage path.
  - Working artifacts `docs/wp/wp09-stories.md` and `docs/wp/wp09-progress.md`.
  Do not edit schema, UI, billing, crons, or generated files unless WP9
  stops and escalates again. No new dependencies.

## 2026-07-09 - WP12 - Daily briefing agent file boundary

- Question: WP12's §14 key-files column says "agent action + briefing
  surface/email". Satisfying the DoD (run at user hour, run record,
  human-readable artifact, optional email) requires schema, cron, account
  cascade, and a nav surface beyond a single action file.
- Ruling: WP12 may edit these areas, only as needed to satisfy the DoD:
  - `convex/schema.ts` — additive tables/fields for briefing settings +
    `briefingRuns` (mirror `researchRuns`: status, error, counts, artifact).
  - `convex/briefings.ts` / `convex/briefingActions.ts` (new) — queries,
    mutations, internal cron dispatch, LLM artifact generation. No publish
    path. Auth via `requireUser` on public functions.
  - `convex/crons.ts` — schedule the briefing dispatcher (hourly is fine;
    filter to users whose local hour matches).
  - `shared/briefings.ts` (+ tests) — pure helpers: hour matching, demo
    artifact builder, ranking-changelog snippet if cheap.
  - `shared/accountData.ts` + `convex/account.ts` — include new tables in
    delete/export cascade.
  - UI: `src/app/(app)/briefing/page.tsx` (or dashboard module) + minimal
    nav link in existing sidebar; settings card for hour / email opt-in /
    enable. Prefer `ds/` primitives; Dialog/Select may stay on `ui/`.
  - Optional email: reuse Resend pattern from `notificationsActions`
    (env-gated; demo/no-key = no-op). Do not add npm deps if fetch+Resend
    already works.
  - Analytics: only typed events via existing catalog if a new event is
    needed (`src/lib/analytics/events.ts` + Convex mirror).
  - Working artifacts `docs/wp/wp12-stories.md`, `docs/wp/wp12-progress.md`.
  Do not touch publish mutations, scanner internals, billing, or landing.
  No auto-publish. No fake engagement scores. Demo mode never breaks.
  No new dependencies unless escalated.

## 2026-07-09 - WP31 - Freshness decay + auto-archive file boundary

- Question: Phase 1 §10 #3 requires server-side archive and visible decay, but
  timing logic already lives in `shared/scoring.ts` and notifications enqueue
  from `convex/opportunities.ts`.
- Ruling: WP31 may edit:
  - `shared/feedFreshness.ts` (new) — age/window helpers aligned with scoring
    curve; tests in `tests/feedFreshness.test.ts`.
  - `convex/schema.ts` — additive `archived` status + optional `archivedAt`.
  - `convex/opportunities.ts` — list filter/sort, internal archive mutations.
  - `convex/crons.ts` — append archive interval (do not reorder existing crons).
  - `convex/notifications.ts` or `internal.notifications.evaluateOpportunity`
    — skip expired opportunities (minimal guard only).
  - Feed UI: `src/components/app/feed/opportunity-row.tsx`,
    `opportunity-detail.tsx`, and `feed-scanner.tsx` only for freshness copy/
    styling (not scanner settings redesign).
  - `shared/accountData.ts` + `convex/account.ts` — export/delete if needed.
  - `docs/wp/wp31-stories.md`, `docs/wp/wp31-progress.md`.
  Do **not** edit `scannerActions.ts`, `semanticRelevance.ts`,
  `shared/rankingWeights.ts`, or research files. Escalate before changing
  notification schema.

## 2026-07-09 - WP32 - Ranking outcome weights + changelog file boundary

- Question: Outcome-weighted ranking and changelog touch schema and possibly
  `shared/briefings.ts` on branches where WP12 landed.
- Ruling: WP32 may edit:
  - `shared/rankingWeights.ts` — outcome weights + recency decay.
  - `shared/rankingChangelog.ts` (new) — deterministic changelog sentence;
    if `shared/briefings.ts` exists, refactor to import from here (no behavior
    change).
  - `convex/ranking.ts` — persist changelog on recompute.
  - `convex/schema.ts` — additive `rankingChangelog` fields on
    `scannerSettings`.
  - One UI surface: `feed-scanner.tsx` **or** settings scanner card (not both
    unless stories require).
  - Scanner settings query in `convex/scanner.ts` (or equivalent) to expose
    changelog fields.
  - `tests/rankingWeights.test.ts`, `tests/rankingChangelog.test.ts` (new).
  - `shared/accountData.ts` if export includes new fields.
  - `docs/wp/wp32-stories.md`, `docs/wp/wp32-progress.md`.
  Do **not** edit `convex/crons.ts` (weekly job stays as-is), `opportunities`
  archive logic (WP31), or `researchActions.ts`. No LLM changelog agent in WP32.

## 2026-07-09 - WP33 - Research agent v2 MVP file boundary

- Question: §7.2.2 continuous curator implies cron, research pipeline, and UI
  beyond `convex/research.ts`.
- Ruling: WP33 may edit:
  - `shared/researchCurator.ts` (new) + tests.
  - `convex/schema.ts` — additive `runKind`, optional `passedReason`,
    `lastCuratorRunMonth`.
  - `convex/research.ts`, `convex/researchActions.ts` — curator action +
    public latest-run query; reuse WP21 helpers in `shared/researchWatch.ts`,
    `shared/researchScoring.ts`.
  - `convex/crons.ts` — append monthly dispatcher (rebase after WP31).
  - `src/components/app/research-agent.tsx`, `research/profile-*.tsx` —
    curator status strip only; no AppShell rewrite.
  - `shared/accountData.ts` + `convex/account.ts` — cascade/export.
  - `docs/wp/wp33-stories.md`, `docs/wp/wp33-progress.md`.
  Do **not** auto-add to `watchedHandles` without explicit user click. Do not
  edit `scannerActions.ts`, ranking, or publish paths. No new npm deps unless
  escalated. Demo mode must return deterministic curator output.

## 2026-07-09 - Phase 2 program — WP35–WP39

Question: Phase 2 roadmap items (engagement-window prediction, trend radar,
command palette v2, onboarding concierge) are not rows in §14; how should
agents own them?

Ruling:

1. **Official program packages** documented in `docs/wp/PHASE2-PROGRAM.md`.
   WP35–WP39 are valid assignments with the same branch/PR/story-loop rules as §14.
2. **WP23 remains the Phase 2 flagship** (§14 row unchanged). Prioritize review
   merge in Wave 1B.
3. **WP38** extends the existing cmdk palette — not a full Astryx CommandPalette
   migration unless a separate ruling says otherwise.
4. **WP35** shows timing guidance only when sample size threshold met — never
   fake ML percentages.
5. **WP37 vs WP13:** WP37 = niche topic clusters; WP13 = per-author dossiers —
   separate tables and UI surfaces; no shared schema without orchestrator ruling.
6. Workers use **Grok 4.5 Fast** (`grok-4.5-fast-xhigh`) for the Phase 2 sprint
   unless orchestrator escalates after repeated gate failure.

## 2026-07-09 - Wave 3 — WP15 service worker + WP39 watch proposals

Question: WP15 needs a service worker for installability/offline; WP8 already
registered `public/push-sw.js` for hot-window push. WP39 proposes watch handles
from concierge output.

Ruling:

1. **WP15 must extend `public/push-sw.js` additively** — one SW registration,
   no second worker file. Push + notificationclick handlers from WP8 must remain
   functional; Gate 3 includes manual push regression.
2. **Offline queue is draft-only** — no queued publish, no background sync to X.
3. **WP39 watch proposals** require explicit user accept per handle (same rule
   as WP33 research curator). Concierge never auto-adds watches or changes goal
   without confirm click.
4. **WP15 and WP39 may run in parallel** — disjoint file boundaries; if both
   need `src/app/actions.ts`, each WP owns named action groups only.

