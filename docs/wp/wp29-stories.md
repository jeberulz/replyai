# WP29 — Voice Studio onto Astryx `ds/` — Stories

**DoD (§14):** Voice tab uses ds Card/Badge/Button/TextInput/TextArea; Dialog
stays ui/; train/CRUD/default unchanged; checks green.

Depends on: WP24–28 merged. Branch: `feat/wp29-astryx-voice-studio`.
Allow-list: `voice-studio.tsx`, `voice/page.tsx` (wiring only), docs.
Program: `docs/wp/WP24-ASTRYX-ADOPTION-PLAN.md`, ruling 2026-07-09.

---

- [x] **S1 — Stories + progress + ruling**
  - Stories/progress; §14 row + RULINGS freeze lift recorded.
  - **Acceptance:** docs in place before code.

- [x] **S2 — Profile cards + header actions**
  - Profile grid → ds Card/Badge/Button/IconButton.
  - Header `+ New profile` / `Train from my tweets` → ds Button.
  - Empty + loading → ds Card / Skeleton.
  - **Acceptance:** visual parity with Research density; no ui badge/button/card.

- [x] **S3 — ProfileForm + train dialog fields**
  - Form fields → ds TextInput/TextArea with `label`; remove ui Label/Input/Textarea.
  - Dialog wrappers stay ui/; controls inside migrated.
  - **Acceptance:** create/edit/train flows unchanged; demo mode works.

- [x] **S4 — PR pass**
  - `npm run typecheck && npm run lint && npm test && npm run build` green.
  - No landing diff; progress.md closed.
  - **Acceptance:** PR ready on main.
