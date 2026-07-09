# WP14 Progress — A/B reply variants

## 2026-07-09 — Scaffold

- Wave 2 worker W6. WP23 merged (#44); additive draft fields only.
- No variant schema on `main` yet.

## 2026-07-09 — WP14-S1

- Added `variantGroups` table + optional `variantGroupId` / `variantLabel` on `savedDrafts` (index `by_variant_group`).
- `shared/variantCompare.ts`: next label A→B→C (max 3), aggregate observed publish/responded/edit buckets, copy formatter, demo fixture.
- Account cascade: `variantGroups` after `savedDrafts` (order 62) so drafts clear first.
- Defaults confirmed: group key `(userId, analysisId, category)`; 48h window copy; observed counts only.

## 2026-07-09 — WP14-S2

- New `convex/variants.ts`: `trackDraft`, `getComparison`, `getComparisonForDraft`, `suggestFollowUp` — all `requireUser`.
- Drafts `save`/`publish` accept optional `variantGroupId`/`variantLabel` (ownership-checked).
- Comparison pulls `replyOutcomeTrackers` by draft; demo without trackers uses deterministic fixture counts.
- Regenerated `convex/_generated/api.d.ts` via `npx convex codegen`.
