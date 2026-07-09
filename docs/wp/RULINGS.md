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
