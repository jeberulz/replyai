# WP28 progress

Append-only. Newest entries at the bottom.

## 2026-07-09 — Kickoff

- Branched `feat/wp28-astryx-chat-surfaces` from WP27 tip (`1075d31`).
- Stack: WP24–27 merged into each other; this PR bases on WP27 branch
  (main still catching up — WP27 not yet on origin/main).
- Scope: chat composer, suggestion chips, analysis-thread / reply-workbench
  banners + light progress. **ReplyPreview untouched.**
- Tokenizer: adapter only unless a natural chip/token call site appears.

## 2026-07-09 — Implementation

- Adapters: `ds/chat-composer` (ChatComposer + Drawer + SendButton),
  `ds/progress-bar`, `ds/tokenizer` (unused call site — typeahead, not
  tweet tokens).
- `chat-composer.tsx` → Astryx ChatComposer + drawer for optional context;
  submit/parseTweetUrl semantics unchanged.
- reply-workbench + analysis-thread: apiNotice/restriction → Banner;
  failed/stale → Banner; generating → Spinner + indeterminate ProgressBar.
- suggestion-chips → ds Card wrappers.
- ReplyPreview: zero diff. feed-scan-progress left alone (outside chat/**).
- Gotcha: default Astryx ChatComposerInput is contenteditable (no HTML
  placeholder) — broke mobile e2e. Fixed via custom `input` textarea slot
  + explicit Analyze sendButton so WP6 selectors still work.
