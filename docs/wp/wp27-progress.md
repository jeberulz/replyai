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
