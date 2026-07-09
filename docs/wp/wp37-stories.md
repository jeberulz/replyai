# WP37 Stories — Trend-radar MVP

**Definition of done** (Phase 2 program; product §5.1 P2 + §7.2.8): Cluster recent
scan corpus into emerging topics per user niche; surface “conversations forming
around X” — feeds briefing/radar; **no viral predictions or fake scores**.

**Depends on:** Semantic relevance / opportunity text on `main`; optional tie-in
to WP12 briefing artifact (read-only sentence hook later).

**Parallel-safe with:** WP38, WP35, WP23. Coordinate with WP13 — WP37 is **topic**
clusters, WP13 is **author** dossiers.

## File boundary

**Owns:**

- `shared/trends.ts`
- `convex/trends.ts` (+ optional `trendRuns` schema)
- UI strip on `/research` or `/feed` (one surface)
- `tests/trends.test.ts`

**May read:** `opportunities`, scanner keywords, niche context — no scanner cron edits.

## Defaults

- Rolling window: 7 days of scanned opportunities for user.
- Cluster by keyword overlap + optional embedding label (cheap LLM batch or heuristic MVP — document in S1).
- Cap display at top 3 emerging topics.
- Demo: deterministic topic labels from fixture opportunities.
- Cron optional for MVP; on-demand query on page load acceptable for v1.

## Stories

- [x] **WP37-S1 — Shared clustering + demo**
  - Pure function: opportunities → ranked topic clusters with counts.
  - Vitest with fixture corpus.

- [x] **WP37-S2 — Convex query + optional run record**
  - Query returns clusters for session user; bounded pagination.
  - Optional internal mutation to cache last run (orchestrator decides in implementation).

- [x] **WP37-S3 — Radar UI**
  - Compact Dark Chrome strip: “3 conversations forming around …”
  - Link into feed filtered view or opportunity list.

- [ ] **WP37-S4 — Verification**
  - Demo mode; no fake engagement %; checks green.
