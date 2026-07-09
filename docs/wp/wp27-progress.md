# WP27 progress

Append-only. Newest entries at the bottom.

## 2026-07-09 — Kickoff

- Branched `feat/wp27-lists-workbench-density` from WP26 tip.
- Stack: PR #21 → #22 → #23 → this.
- Scope: score-badge, pane SegmentedToggle/title, opportunity-row, draft-row,
  option-card chrome. FilterChips stays custom (white active pill per design.md).
- Research profile rows: skip this WP (not needed for DoD; avoid collision).

## 2026-07-09 — Implementation

- `ds/card`, `ds/item`, `ds/selectable-card` adapters + barrel exports.
- ScoreBadge → ds Badge (success/warning/neutral) + Tooltip reason.
- PaneTitleRow → ds Heading; SegmentedToggle → ds SegmentedControl.
- FilterChips kept custom (documented in pane-chrome).
- feed/opportunity-row + opportunity-detail → ds Card/Badge/Button/IconButton.
- drafts/draft-row + draft-detail → same; status Badge variants remapped
  (secondary→neutral, destructive→error).
- option-card → ds Card/Badge/Button/TextArea; Dialog/Select stay on ui/.
- SelectableCard not used for OptionCard (multi-action card ≠ checkbox select).
- Landing + split breakpoints untouched.

## 2026-07-09 — DoD closeout

- ReplyPacingWarning → ds Banner (warning/error by level).
- Feed/drafts list + detail empties → OatmealEmptyState (ds EmptyState +
  oatmeal/liner per design.md). Allow-list bump: feed-scanner, drafts-list,
  reply-pacing-warning, oatmeal-empty-state.
- OptionCard: keep ds Card as SelectableCard equivalent — SelectableCard is
  checkbox selection; OptionCard is multi-action publish chrome. Documented
  ruling; 3 options + reason + explicit publish unchanged.
- Chat restriction banners left for WP28 (out of allow-list).
- Mobile suite re-run after closeout.
