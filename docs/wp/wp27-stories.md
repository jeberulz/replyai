# WP27 — Lists + workbench density — Stories

**DoD (§14):** Item/SelectableCard/SegmentedControl/StatusDot/EmptyState;
3 options + reasons; no fake scores; WP6 suite green.

Depends on: WP24–WP26. Branch from WP26 tip.
Allow-list: feed/drafts rows+detail, option-card, score-badge, pane-chrome
controls (no breakpoint logic). Research rows only if freeze clear.
Program: `docs/wp/WP24-ASTRYX-ADOPTION-PLAN.md`.

---

- [x] **S1 — Stories + progress + ds adapters**
  - Stories/progress; add `ds/Card`, `ds/Item`, `ds/SelectableCard` as needed.
  - **Acceptance:** docs + adapters typecheck.

- [x] **S2 — ScoreBadge + SegmentedToggle**
  - ScoreBadge → ds Badge (+ Tooltip for reason); keep heuristic tiers, no fake %.
  - SegmentedToggle → ds SegmentedControl (Options/Preview).
  - FilterChips: keep white-pill brand (design.md); document why not SegmentedControl.
  - PaneTitleRow → ds Heading.
  - **Acceptance:** typecheck; reply workbench toggle still works.

- [x] **S3 — OpportunityRow + DraftRow density**
  - Rows use ds Card/Badge/Button; selection ring preserved; actions still
    require explicit clicks.
  - **Acceptance:** feed/drafts list selectable; dismiss/analyze still work.

- [x] **S4 — OptionCard chrome + PR pass**
  - OptionCard shell/actions → ds Card/Badge/Button/TextArea where cheap;
    leave Dialog/Select on ui/ this WP.
  - Still 3 options + reason; publish still explicit click.
  - Landing/split breakpoints untouched; checks + mobile suite green.
  - **Acceptance:** stacked PR ready on WP26.
