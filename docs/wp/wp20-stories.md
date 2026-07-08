# WP20 Stories — Edit-distance north star

- [x] `WP20-S1` Shared edit-distance metric and persistence shape
  - Add shared logic to normalize generated-vs-sent edit distance and bucket it as `no_edit`, `minor_edit`, or `major_edit`.
  - Extend the stored reply/publish data model so a sent generated reply can retain observed edit-distance data without breaking existing rows or demo mode.
  - Add focused unit tests in `tests/` covering normalization and bucket thresholds, including exact-match, typo-level, and rewrite-level cases.

- [x] `WP20-S2` Draft/publish flow records observed edit distance per sent reply
  - Publishing or saving a generated option through the existing drafts flow stores normalized edit distance and bucket data derived from the generated option text and the sent draft text.
  - Manual edits update the stored observation so later publish actions use the final sent text, while AI rewrites that opt out of manual-edit marking do not count as manual edits by themselves.
  - Existing non-generated drafts and demo-mode publishes continue to work without errors and without inventing fake edit-distance data.

- [x] `WP20-S3` Usage stats and dashboard surfaces switch from boolean edits to buckets
  - `usage.stats` reports the north-star percentage from `no_edit + minor_edit` sent generated replies, plus bucket counts needed for launch baselines.
  - Dashboard/settings UI replaces the old boolean-based “No edits” interpretation with bucket-backed observed metrics, without surfacing any predictive or fake scores.
  - Analytics event metadata and related tests stop depending on the coarse boolean-only model where this WP touches them.
