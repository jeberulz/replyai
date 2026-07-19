# WP58 — Scanner Sources & settings modal — Progress

**Status:** complete  
**Branch:** `wp57-scanner-settings-modal`

## S1 — Stories + progress
- Done. Renumbered from WP57 → WP58 after merging `main` (WP57 = cost guard).

## S2 — Extract + redesign dialog
- Done. New `src/components/app/feed/scanner-settings-dialog.tsx`.
- Shared `ui/dialog.tsx` aligned to Dark Chrome (`bg-popover`, 1px border,
  permitted popover shadow, `rounded-lg`, flex column).
- Playwright helper updated for Topics tab + `Save search`.

## S3 — Checks
- `eslint` on touched files: clean.
- No new TS errors in feed-scanner / scanner-settings-dialog / dialog.

## Docs
- `PRODUCT.md` added (impeccable init blocker; sourced from PRD + design.md).
- WP58 stories/progress.
- `design.md` unchanged (tokens already correct; dialog was the drift).
