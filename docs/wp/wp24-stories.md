# WP24 — Astryx foundation + Dark Chrome theme — Stories

**DoD (§14):** Packages + built `darkChromeTheme`; Theme on app/onboarding
only; landing untouched; brand lock (orange/charcoal/serif); checks green.

Program brief: `docs/wp/WP24-ASTRYX-ADOPTION-PLAN.md`.
Rulings: `docs/wp/RULINGS.md` (2026-07-09).

Each story is atomic, verifiable in one sitting, and committed only when
`npm run typecheck && npm run lint && npm test && npm run build` are green
for the branch state that includes it (or the subset warranted by the story).

---

- [ ] **S1 — Program docs + §14 registration**
  Land the adoption plan, rulings, and strategy table rows so workers can
  resume without chat context.
  - `docs/wp/WP24-ASTRYX-ADOPTION-PLAN.md` present.
  - `docs/wp/RULINGS.md` has 2026-07-09 Astryx rulings.
  - `docs/PRODUCT_STRATEGY.md` §14 lists WP24–WP28.
  - **Acceptance:** docs-only; no runtime change; `src/app/page.tsx` untouched.

- [ ] **S2 — Install Astryx packages + CLI script**
  Add `@astryxdesign/core`, `@astryxdesign/theme-neutral`, `@astryxdesign/cli`
  and the `astryx` npm script from the getting-started guide.
  - Lockfile updated via npm install.
  - `npm run astryx -- docs tokens` (or `npx astryx docs tokens`) runs.
  - **Acceptance:** packages resolve; no app visual change yet.

- [ ] **S3 — `darkChromeTheme` + built SSR artifacts**
  `defineTheme` extending Neutral with Dark Chrome brand lock; run
  `astryx theme build` for SSR-safe CSS/JS.
  - Source: `src/theme/dark-chrome.ts` (or equivalent).
  - Built outputs committed or generated in a documented path.
  - Accent `#ff4400`, charcoal surfaces, Instrument Serif heading / Inter body /
    Geist Mono code, card shadows suppressed.
  - **Acceptance:** theme builds; stock Neutral blue is not the accent.

- [ ] **S4 — CSS bridge + Theme providers (app/onboarding only)**
  Wire Tailwind/Astryx CSS layers without theming the landing page.
  - `globals.css` keeps existing Dark Chrome `:root` for marketing.
  - `<Theme theme={darkChromeTheme} mode="dark">` wraps `(app)` and
    `(onboarding)` layouts only — not root `layout.tsx`.
  - Landing `src/app/page.tsx` has zero Astryx imports.
  - **Acceptance:** `git diff main -- src/app/page.tsx` empty for this WP;
    app routes hydrate with Dark Chrome tokens.

- [ ] **S5 — Brand-lock proof component in app shell**
  Render one low-risk Astryx control inside the app (not landing) that
  demonstrates accent, surfaces, and heading font.
  - Prefer a small banner/status in dashboard empty/chrome, or a ds proof
    strip that does not change product flows.
  - **Acceptance:** proof visible in app; orange accent; no card drop shadow;
    Instrument Serif still available for pane titles.

- [ ] **S6 — design.md mapping + WP24 PR pass**
  Document Astryx↔Dark Chrome mapping; full checks; progress notes.
  - `design.md` updated with mapping section.
  - `docs/wp/wp24-progress.md` append-only learnings.
  - `npm run typecheck && npm run lint && npm test && npm run build` green.
  - Demo mode boots with zero external keys.
  - **Acceptance:** branch ready for review; DoD items checked.
