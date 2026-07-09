# WP25 — Astryx primitive adapters (`ds/`) — Stories

**DoD (§14):** Button/Field/Banner/Badge/Dialog/SegmentedControl/EmptyState/
StatusDot adapters; prop maps documented; no feature behavior change.

Depends on: WP24 (Astryx + Dark Chrome theme) — branch from WP24 tip.
Program: `docs/wp/WP24-ASTRYX-ADOPTION-PLAN.md`.
Ruling: `src/components/ds/` strangler; leave `src/components/ui/` intact.

---

- [x] **S1 — Stories + progress scaffolding**
  - `docs/wp/wp25-stories.md` + `wp25-progress.md` on branch.
  - **Acceptance:** docs present before adapter code.

- [x] **S2 — Core action + feedback adapters**
  Add `src/components/ds/` modules for: Button, IconButton, Banner, Badge,
  Skeleton, Spinner, Divider, Tooltip, StatusDot.
  - Re-export Astryx with stable `@/components/ds/*` import paths.
  - **Acceptance:** typecheck imports resolve; no call-site rewrites yet.

- [x] **S3 — Form + selection adapters**
  TextInput, TextArea, Field, FieldStatus, Switch, SegmentedControl
  (+ Item), EmptyState, Dialog (+ Header).
  - **Acceptance:** typecheck green; prop map noted in progress.md.

- [x] **S4 — Barrel + proof swap + PR pass**
  - `src/components/ds/index.ts` barrel.
  - Point `AstryxBrandProof` at `ds/Banner` (low-traffic proof).
  - `ui/` untouched; landing untouched.
  - Checks green; progress append-only.
  - **Acceptance:** branch ready for PR; DoD satisfied.
