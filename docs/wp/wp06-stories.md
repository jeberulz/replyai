# WP6 — Mobile stacked navigation — Stories

**DoD (§14):** 3 critical flows pass at 375px; no horizontal scroll.

Each story is atomic, verifiable in one sitting, and committed only when
`npm run typecheck && npm run lint && npm test && npm run build` are green for
the branch state that includes it.

---

- [x] **S1 — Shared mobile stacked-navigation shell (`src/components/app/split/*`)**
  Tighten the generic split-pane infrastructure so narrow viewports behave as a
  true master-detail stack instead of a squeezed desktop split.
  - Mobile selection shows a full-width detail screen with a persistent back
    affordance and no side-by-side overflow.
  - Shared pane chrome and action bars stay within the viewport at 375px and
    preserve the Dark Chrome system.
  - No horizontal scrolling is introduced by the shared split/navigation shell.
  - **Acceptance:** feed and drafts surfaces inherit the stack behavior without
    per-screen hacks; mobile viewport has no x-overflow.

- [x] **S2 — Analysis workbench mobile triage flow (`src/components/app/chat/*`)**
  Make the analyze/reply surface support the phone-first flow from §9.
  - At 375px, analysis context, options, and actions are reachable without the
    desktop split view.
  - Primary actions remain thumb-reachable and text does not overflow the
    viewport.
  - Demo mode still supports paste URL/text → analyze → copy without keys.
  - **Acceptance:** mobile analyze flow renders as a single-column stack with no
    horizontal scroll and preserves the 3-option guardrail.

- [x] **S3 — Feed and drafts mobile stacked details (`src/components/app/feed-*`, `src/components/app/drafts-*`)**
  Bring the two split-pane list/detail surfaces in line with the stacked mobile
  navigation strategy.
  - Feed opportunity list pushes a readable detail screen with accessible back,
    analyze, and dismiss actions at 375px.
  - Draft list pushes a readable detail screen with accessible edit/publish
    fallback controls at 375px.
  - Lists, cards, chips, and action bars wrap cleanly with no x-overflow.
  - **Acceptance:** both surfaces are usable one-handed on 375px and preserve
    existing desktop behavior.

- [x] **S4 — Playwright viewport suite for critical mobile flows (`tests/`, Playwright config)**
  Add repo-owned viewport verification for the three critical 375px flows from
  `docs/PRODUCT_STRATEGY.md` §9.
  - Coverage: (1) feed opportunity → detail → analyze entrypoint, (2) analyze
    thread / workbench flow, (3) drafts detail flow.
  - Assertions detect horizontal scrolling (`scrollWidth <= innerWidth`) and
    verify the mobile stacked/back-navigation affordances.
  - The suite is runnable locally against the app in demo mode with zero keys.
  - **Acceptance:** the viewport tests pass at 375px and fail if a split-pane
    regresses into x-overflow.

- [x] **S5 — WP6 PR pass**
  Final verification and reviewer map for this WP only.
  - `docs/wp/wp06-stories.md` fully checked and `docs/wp/wp06-progress.md`
    updated append-only with decisions and gotchas.
  - `npm run typecheck && npm run lint && npm test && npm run build` pass.
  - Manual browser verification covers the 3 critical flows at 375px in demo
    mode, including explicit confirmation of no horizontal scroll.
  - **Acceptance:** branch is ready for PR review without touching unrelated WPs.
