# WP26 progress

Append-only. Newest entries at the bottom.

## 2026-07-09 — Kickoff

- Branched `feat/wp26-astryx-app-shell` from WP25 tip.
- WP24 PR #21, WP25 PR #22 (stacked).
- Ruling: restyle existing sidebar; do not adopt AppShell unless restyle fails.
- Command menu: prefer keep cmdk this WP (CommandPalette SearchSource is a
  larger rewrite — defer to a follow-up or Phase 1 palette WP).

## 2026-07-09 — S2–S4 shell restyle landed

- Sidebar header/nav/footer + mobile menu trigger → `ds/IconButton`,
  `ds/Tooltip`, `ds/Kbd` (`mod+k`).
- Mobile drawer **stays on shadcn `ui/Dialog`** — Astryx Dialog is a centered
  modal and would regress the WP6 left slide-in drawer. Escalate before swap.
- `sidebar-projects` / `sidebar-history` still on `ui/` (dropdown/dialog/input
  compounds) — out of this WP’s chrome scope; migrate with WP27+ or a follow-up.
- PageHeader → `ds/Heading` + `ds/Text` (accent code eyebrow, Instrument Serif
  via theme heading font).
- Command menu: **kept cmdk** (`ui/command`). Astryx `CommandPalette` needs a
  `SearchSource` rewrite — defer.
- Added `ds/kbd`, `ds/heading`, `ds/text` adapters.
- Checks: typecheck / lint / test / build green.
- `npm run test:mobile`: 3/3 passed at 375px (after installing Playwright
  chromium locally).
- Landing + `split/*` untouched.
