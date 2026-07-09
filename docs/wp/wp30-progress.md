# WP30 progress

Append-only. Newest entries at the bottom.

## 2026-07-09 — Kickoff

- Branched `feat/wp30-astryx-settings` from WP29 tip (stacked on #30).
- Allow-list: settings page + account-data-controls + default-model-card.
- Dialog stays ui/ per WP27/WP29 ruling.

## 2026-07-09 — Implementation

- `settings/page.tsx` → ds Card/Badge/Button + SettingsSection helper.
- `account-data-controls.tsx` → ds Card/Button/TextInput; delete Dialog stays ui/.
- `default-model-card.tsx` → ds Card/Badge/Button.
- Hidden input carries `confirmationUsername` for delete form (TextInput has no `name` prop).
- Checks green; landing untouched.
