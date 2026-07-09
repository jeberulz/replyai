# WP33 — Research agent v2 (MVP)

**Definition of Done:** Continuous curator MVP — monthly background refresh,
quiet watched/suggested profiles pruned, replacement candidates surfaced with
reasons; human approves every watch change (no auto-watch, no auto-publish).

**Product refs:** `docs/PRODUCT_STRATEGY.md` §7.2.2, §10 Phase 1 #4.

**Depends on:** WP21 on `main` (watch dedupe, keyword seeding, band scoring).

**Cron note:** Rebase on **WP31** before merge if both touch `convex/crons.ts`.

File boundary: `docs/wp/RULINGS.md` → **2026-07-09 - WP33**.

## Defaults (settled)

- Cadence: **monthly** per Pro/demo user (cron dispatcher, not per-request).
- Quiet threshold: no `exampleTweets` / research activity signal older than
  **30 days** → mark profile `passed` with reason `quiet_30d` (additive
  optional field or status note — prefer `passed` + internal note string).
- Curator run: `researchRuns.runKind: "monthly_curator" | "manual"` (additive).
- Reuse existing discovery/scoring in `researchActions.ts`; do not duplicate
  WP21 scoring math.
- Replacement suggestions: top **5** new profiles not already
  watching/passed; reasons from existing `reason` field + template prefix
  ("Suggested replacement — …").
- Human gate: UI shows curator results as `suggested`; user clicks Watch/Pass
  (existing research detail flow).
- Pro gate: `hasProAccess` — free users see locked state with upgrade copy.
- Demo: `demoResearchCuratorResult(...)` when X/Anthropic keys missing.
- Max **1 curator run per user per calendar month** (UTC month), idempotent.

**Out of scope (Phase 2):** LLM replacement reasons, auto-prune without review,
scanner keyword graph auto-rewrite, daily curator cadence.

---

## Stories

- [x] **WP33-S1 — Shared curator helpers**
  - Add `shared/researchCurator.ts`:
    - `isProfileQuiet(profile, nowMs, quietDays = 30)`
    - `curatorMonthKey(nowMs)` → `"YYYY-MM"`
    - `demoCuratorArtifact(...)` for deterministic demo run summary
  - Vitest: quiet detection, month key, demo shape.

- [x] **WP33-S2 — Schema additions**
  - `researchRuns`: optional `runKind` union `manual` | `monthly_curator`
    (default `manual` for existing rows).
  - Optional `researchProfiles.passedReason: v.optional(v.string())` when
    status → `passed` via curator prune.
  - Optional `scannerSettings.lastCuratorRunMonth: v.optional(v.string())`
    for idempotency.
  - Added (beyond enumerated list): `researchRuns.curatorPrunedCount`
    (optional number) so the UI can show quiet-pruned count precisely per run.

- [ ] **WP33-S3 — Curator action**
  - `internal.researchActions.runMonthlyCurator` (or `convex/researchCurator.ts`):
    - Load user settings + watching handles + suggested profiles.
    - Mark quiet suggested/watching profiles `passed` (not watched handles
      user explicitly set — **only** `researchProfiles` rows, not
      `watchedHandles` list entries).
    - Run discovery/search pass (reuse existing research pipeline functions).
    - Insert new `researchRuns` row + `researchProfiles` suggestions.
    - Record usage if LLM/X called (same pattern as manual research).
  - Demo path returns fixed profiles when keys missing.

- [ ] **WP33-S4 — Cron dispatcher**
  - Append `convex/crons.ts`: monthly (e.g. 1st of month 05:00 UTC) →
    `internal.research.dispatchMonthlyCuratorAll` fan-out per eligible user.
  - Hourly alternative acceptable if documented — prefer true monthly +
    idempotent month key.

- [ ] **WP33-S5 — Convex public queries**
  - `research.latestCuratorRun` — last monthly run status + counts for UI.
  - Keep existing manual `startRun` unchanged.

- [ ] **WP33-S6 — Research UI**
  - `src/components/app/research-agent.tsx` (or research page shell):
    - "Monthly curator" strip: last run time, quiet profiles pruned count,
      new suggestions count.
    - Empty/locked states for free plan.
  - Reuse `ProfileDetail` / `ProfileRow` (WP21/Astryx paths).

- [ ] **WP33-S7 — Account delete/export + docs**
  - Export/delete includes new optional fields.
  - README or `docs/observability.md` one line on curator cron if appropriate.

- [ ] **WP33-S8 — Final verification + PR**
  - Full CI suite green.
  - `docs/wp/wp33-progress.md` complete; PR per playbook §1.
