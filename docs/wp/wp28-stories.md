# WP28 — AI / chat surfaces — Stories

**DoD (§14):** Chat/Tokenizer/Progress where they cut custom CSS;
ReplyPreview untouched; defer until WP24–27 gate (done).

Depends on: WP24–WP27. Branch from WP27 tip.
Allow-list: `src/components/app/chat/**` (excl. personal-analytics /
WP11). Plus thin `ds/` adapters for Chat + ProgressBar (+ Tokenizer if used).
Program: `docs/wp/WP24-ASTRYX-ADOPTION-PLAN.md`.

**Out of scope:** `reply-preview.tsx` (DoD: untouched); landing; pipeline
semantics in `use-analysis-pipeline.ts`; OptionCard (WP27).

---

- [x] **S1 — Stories + progress + ds adapters**
  - Stories/progress; add `ds/chat-composer`, `ds/progress-bar`,
    `ds/tokenizer` (re-exports).
  - **Acceptance:** adapters typecheck; barrel exports.

- [x] **S2 — ChatComposer → Astryx ChatComposer**
  - Migrate `chat-composer.tsx` onto ds ChatComposer shell; keep paste-URL
    / optional context fields; demo + analyze submit semantics unchanged.
  - **Acceptance:** typecheck; empty home + docked composer still submit.

- [x] **S3 — Restriction/api banners + progress chrome**
  - `restrictionWarning` / `apiNotice` in reply-workbench + analysis-thread
    → ds Banner (warning/info).
  - Analysis generating / scan-adjacent progress: ProgressBar or Spinner
    where it cuts custom CSS without changing step semantics.
  - Suggestion chips: denser ds Card (ScoreBadge already ds).
  - **Acceptance:** banners visible on restricted analyses; ReplyPreview
    file untouched (`git diff` clean on that path).

- [x] **S4 — Checks + stacked PR**
  - typecheck/lint/test/build + mobile suite; PR base WP27.
  - **Acceptance:** stacked PR ready on `feat/wp27-lists-workbench-density`.
