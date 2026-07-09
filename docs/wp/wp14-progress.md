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

## 2026-07-09 — WP14-S3

- Option card: after publish, `trackDraft` attaches A/B/C; soft toast + in-card nudge to generate variant B/C via existing generate-more path.
- No auto-publish; tracking is best-effort and never blocks publish.

## 2026-07-09 — WP14-S4

- `VariantComparePanel` on draft detail: observed published/responded/no-minor-edit counts per label.
- Draft detail: “Track as A/B variant” for untracked analysis-linked drafts; variant badge when labeled.

## 2026-07-09 — WP14-S5

- `npm run typecheck && npm run lint && npm test && npm run build` green.
- Confirmed no WP36 voiceDrift source files on this branch (only wp36 story scaffold docs on main).
- Discarded contaminated voiceDriftRuns account cascade stubs from earlier parallel-worker collision.
