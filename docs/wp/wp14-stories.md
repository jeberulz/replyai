# WP14 Stories — A/B reply variants

**Definition of done** (`docs/PRODUCT_STRATEGY.md` §14): User publishes variant A
now; the app suggests a **tracked follow-up comparison** over time per
category/angle. Reported as **observed counts**, never predictions.

**Product refs:** §5.2 P2 A/B reply variants; Pro+ tier lists A/B in pricing table
(gate optional for MVP — orchestrator confirms; default: available to all Pro/demo).

**Depends on:** WP7 on `main` (outcome trackers); WP23 on `main` (draft kinds —
additive fields only).

**Parallel-safe with:** WP36 if WP14 stays in drafts/outcomes UI and WP36 stays in
voice profiles.

## File boundary

**Owns:**

- `shared/variantCompare.ts` (new — grouping + observed stats)
- `convex/variants.ts` or extend `convex/drafts.ts` (variant group CRUD)
- `convex/schema.ts` — additive: `variantGroupId`, optional `variantLabel` on
  `savedDrafts`; optional `variantGroups` table if cleaner than string id
- Draft detail + option-card UX for “save as variant B” / compare view
- `tests/variantCompare.test.ts`

**May touch additively:**

- `convex/outcomes.ts` / `replyOutcomeTrackers` queries for responded counts per group
- `src/components/app/drafts/draft-detail.tsx`, `option-card.tsx` (variant actions only)
- `shared/accountData.ts` + `convex/account.ts` — delete/export variant metadata

**Do not touch:** compose ladder (`convex/compose.ts`), voice studio (WP36), scanner.

## Defaults (confirm in S1; escalate if product-ambiguous)

- Variant group keyed by `(userId, analysisId, category)` or explicit user-created group
- Labels: `A`, `B`, `C` — max 3 variants per group (align with 3-options guardrail spirit)
- Comparison metrics: published count, responded count, no/minor edit rate — **observed only**
- Copy: “Variant A got 2 responses; variant B got 0 (48h window)” — no “B will perform…”
- Suggest variant B **after** user publishes variant A on same opportunity (soft nudge, not block)
- Demo: fixture groups with deterministic counts
- No auto-publish; human picks which variant to send

## Stories

- [x] **WP14-S1 — Schema + shared compare math**
  - Additive draft fields / optional `variantGroups` table.
  - `shared/variantCompare.ts`: aggregate tracker + edit-bucket stats per group; vitest fixtures.

- [x] **WP14-S2 — Convex API**
  - Create/link variant group on publish or explicit “track as variant”.
  - Query: get comparison for group (observed counts only).
  - All public functions: `requireUser`; account cascade.

- [x] **WP14-S3 — Publish flow hooks**
  - After publishing variant A on an analysis, offer “Generate variant B for comparison”.
  - Reuse existing generate-more path; tag new draft with same `variantGroupId`.
  - Fair-use / 3-options rules unchanged.

- [x] **WP14-S4 — Comparison UI**
  - Draft detail or analysis sidebar: side-by-side observed stats per variant.
  - Dark Chrome; no fake scores or predicted winners.

- [ ] **WP14-S5 — Verification**
  - Demo mode end-to-end; unit tests; checks green; PR DoD checklist.
