# WP26 — App shell migration — Stories

**DoD (§14):** Shell consumes ds/ tokens (restyle first; AppShell only if
needed); WP6 mobile suite still green; landing untouched.

Depends on: WP24 + WP25. Branch from WP25 tip.
Ruling: restyle existing sidebar first — escalate before AppShell rip.
Program: `docs/wp/WP24-ASTRYX-ADOPTION-PLAN.md`.

**Forbidden:** `src/app/page.tsx`, `src/components/app/split/*` behavior,
settings/research feature rewrites.

---

- [x] **S1 — Stories + progress**
  - `docs/wp/wp26-stories.md` + `wp26-progress.md`.
  - **Acceptance:** docs before code.

- [x] **S2 — Sidebar chrome → ds/**
  Migrate sidebar header/nav/footer (+ mobile menu trigger) from
  `@/components/ui/*` to `@/components/ds/*` (IconButton, Tooltip).
  - Preserve collapse + mobile drawer behavior (WP6).
  - Keep mobile drawer Dialog on `ui/` if Astryx Dialog would change
    slide-in behavior — document in progress.
  - **Acceptance:** typecheck; desktop rail + mobile menu still work.

- [x] **S3 — PageHeader + layout polish**
  PageHeader uses theme heading/body (Heading/Text or equivalent) while
  keeping orange mono eyebrow + Instrument Serif title.
  - App layout composition unchanged structurally.
  - **Acceptance:** editorial header still reads Dark Chrome.

- [x] **S4 — Command menu decision + PR pass**
  Keep cmdk CommandMenu (document) OR migrate to CommandPalette if
  smaller-diff fails — prefer keep cmdk this WP.
  - Optional Kbd affordance for ⌘K.
  - Landing + split untouched; checks + `npm run test:mobile` if present.
  - **Acceptance:** branch ready for stacked PR on WP25.
