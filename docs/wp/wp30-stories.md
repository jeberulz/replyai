# WP30 — Settings onto Astryx `ds/` — Stories

**DoD (§14):** Settings on ds primitives; Dialog stays ui/ for delete; billing/export/delete/model default unchanged; checks green.

Depends on: WP29 merged (stacked PR acceptable). Branch: `feat/wp30-astryx-settings`.
Allow-list: `settings/page.tsx`, `account-data-controls.tsx`, `default-model-card.tsx`, docs.

---

- [x] **S1 — Stories + progress**
  - Stories/progress before code.
  - **Acceptance:** docs in place.

- [x] **S2 — Settings page sections**
  - Account, Billing, Connections, Usage, Reply quality, Publishing, Safety → ds Card/Badge/Button.
  - PageHeader unchanged (already ds).
  - **Acceptance:** no ui badge/button/card on settings page.

- [x] **S3 — Account data + model cards**
  - `account-data-controls.tsx` → ds Card/Button/TextInput; Dialog stays ui/.
  - `default-model-card.tsx` → ds Card/Badge/Button.
  - **Acceptance:** export/delete/model flows unchanged.

- [x] **S4 — PR pass**
  - Checks green; landing untouched; progress closed.
  - **Acceptance:** stacked PR on WP29.
