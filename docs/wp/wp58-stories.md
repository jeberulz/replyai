# WP58 — Scanner Sources & settings modal — Stories

**Goal:** Bring the Feed scanner "Sources & settings" dialog into Dark Chrome
alignment and fix the wall-of-settings UX (tabs, hierarchy, primary actions).

**Lane:** Work Package · Branch: `wp57-scanner-settings-modal`

**Note:** Numbered WP58 because WP57 on `main` is Scanner Background-Cost Guard.

**Allow-list:**
- `src/components/app/feed/scanner-settings-dialog.tsx` (new)
- `src/components/app/feed-scanner.tsx`
- `src/components/ui/dialog.tsx` (token alignment only if needed)
- `playwright/mobile-375.e2e.ts` (selector updates if labels change)
- `PRODUCT.md` (impeccable init blocker)
- `docs/wp/wp58-stories.md`, `docs/wp/wp58-progress.md`

**Out of scope:** Scanner backend, source semantics, billing/plan limits, landing.

---

- [x] **S1 — Stories + progress**
  - Stories/progress before code.
  - **Acceptance:** docs in place on branch.

- [x] **S2 — Extract + redesign dialog**
  - Extract `ScannerSettingsDialog` with Dark Chrome header (orange eyebrow +
    Instrument Serif title), tabbed IA (Sources / Topics / Accounts), primary
    Save when dirty, described source rows, chip hit targets, no heavy card
    shadow on dialog chrome.
  - Preserve `data-testid` source switches, `#search-keywords` / `#keywords`,
    and no-auto-publish notice.
  - **Acceptance:** modal matches page header idiom; tabs reduce scroll wall;
    e2e selectors still resolvable.

- [x] **S3 — Checks**
  - ESLint clean on touched files; no new TS errors in modal path.
  - **Acceptance:** modal path green; progress closed.
