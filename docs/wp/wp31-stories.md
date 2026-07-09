# WP31 — Freshness decay + auto-archive

**Definition of Done:** Feed never shows a stale conversation as live;
opportunities past the reply window are auto-archived; visible decay aligns
with `shared/scoring.ts` timing (full credit ≤2h, zero by 8h).

**Product refs:** `docs/PRODUCT_STRATEGY.md` §5.1, §10 Phase 1 #3.

**Depends on:** WP9 merged to `main` (recommended, not a code dependency).

**Parallel-safe with:** WP32 (disjoint files). **Cron conflict with WP33** —
merge WP31 before WP33 or rebase WP33 on WP31.

File boundary: `docs/wp/RULINGS.md` → **2026-07-09 - WP31**.

## Defaults (settled)

- Reply window matches scoring: **full ≤120 min**, **dead at 480 min** (8h)
  from `postedAt` (not `scannedAt`).
- New opportunity status: **`archived`** (additive union member).
- Auto-archive sets `status: "archived"`, `outcome: "ignored"` (if unset).
- Default `opportunities.list` excludes `archived`; no server-side resurface.
- **Display score decay** at read time: multiply stored `score` by the same
  timing factor used in `scoreConversation` — do **not** rewrite stored scores
  on every cron tick.
- UI copy: plain language only ("Window closing", "Window closed") — no fake
  ML percentages.
- Demo mode: deterministic archive thresholds in tests; demo feed still works.
- Do **not** touch `scannerActions.ts`, `semanticRelevance.ts`, or ranking
  recompute logic.

---

## Stories

- [x] **WP31-S1 — Shared freshness helpers**
  - Add `shared/feedFreshness.ts`:
    - `REPLY_WINDOW_FULL_MINUTES = 120`, `REPLY_WINDOW_DEAD_MINUTES = 480`
    - `replyTimingFactor(ageMinutes)` — same curve as `shared/scoring.ts`
    - `opportunityAgeMinutes(postedAt, nowMs)`
    - `isOpportunityExpired(postedAt, nowMs)` → true when age ≥ dead window
    - `effectiveDisplayScore(storedScore, postedAt, nowMs)` → rounded int
    - `freshnessLabel(postedAt, nowMs)` → short user string or null when fresh
  - Vitest: boundary at 120m/480m, monotonic decay, effective score drops.

- [x] **WP31-S2 — Schema + archive mutation**
  - Extend `opportunities.status` union with `v.literal("archived")`.
  - Add optional `archivedAt: v.number()` on opportunities (set on archive).
  - `internal.opportunities.archiveExpiredForUser` in `convex/opportunities.ts`:
    batch-patch `status: "new"` rows where `isOpportunityExpired(postedAt)`.
  - `internal.opportunities.archiveExpiredAll` — iterate users with scanner
    settings enabled (same pattern as other fan-out crons).

- [x] **WP31-S3 — Cron**
  - Append to `convex/crons.ts`: interval ~30 min →
    `internal.opportunities.archiveExpiredAll`.
  - Idempotent; safe if run overlaps with scanner upserts.

- [x] **WP31-S4 — Feed query + sort**
  - `opportunities.list`: exclude `archived`; compute `effectiveScore` +
    `freshnessLabel` in handler (or shared helper) for each returned row.
  - Sort by `effectiveScore` desc (fallback `score` if helper unavailable).
  - Ensure `opportunityStillRelevant` filter still applies before decay sort.
  - Optional `includeArchived` arg on an **internal** query only if needed for
    debugging — not exposed to client.

- [x] **WP31-S5 — Feed UI**
  - `src/components/app/feed/opportunity-row.tsx` + `opportunity-detail.tsx`:
    show `freshnessLabel` when present; muted styling when window closed
    (before cron archives, during the brief gap, or if cron lagging).
  - Keep existing "Fresh" quick filter (`FRESH_AGE_MS` 1h) — document in
    progress if unchanged or align label copy with WP31 helpers.
  - Use `ds/` components already in feed paths; landing untouched.

- [x] **WP31-S6 — Notifications guard (minimal)**
  - In `internal.notifications.evaluateOpportunity` (or shared helper it
    calls): skip enqueue when `isOpportunityExpired(opp.postedAt, now)` so
    stale rows don't push after missing the archive cron.

- [x] **WP31-S7 — Account delete/export**
  - If export lists opportunities by status, include `archived` in JSON export
    (`shared/accountData.ts` / `convex/account.ts`) — additive only.

- [x] **WP31-S8 — Final verification + PR**
  - Full CI suite green.
  - `docs/wp/wp31-progress.md` complete.
  - PR: DoD, verification per story, deviations, Found-not-fixed.
