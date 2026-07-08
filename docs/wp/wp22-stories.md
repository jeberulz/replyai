# WP22 Stories — Reply budget & pacing coach

- [x] `WP22-S1` Daily pacing derivations and usage query shape
  - Extend the existing usage/dashboard query surface with additively derived daily reply-budget data built from observed published drafts, without depending on unmerged WP7 outcome data.
  - Report today's sent-reply count, target framing around 15–20 replies/day, escalating warning levels as the count approaches or exceeds ~50/day, and a deterministic "best windows" dataset with a safe fallback when live opportunity data is thin.
  - Add focused tests for daily sent counts, warning-threshold behavior, and best-window derivation/fallback logic.

- [ ] `WP22-S2` Dashboard pacing module
  - Add a dashboard module that turns the account-health guardrail into a visible daily workflow: current sent count vs. target, pacing copy, and "today's best windows" surfaced without predictive/fake score language.
  - Keep the UI inside the existing Dark Chrome dashboard shell and ensure demo mode still renders meaningful pacing guidance with deterministic fallback data.
  - Preserve the chat-first dashboard behavior; this WP adds coaching, not a new primary flow.

- [ ] `WP22-S3` Draft-flow warnings near send
  - Surface pacing warnings inside the existing draft/publish flow when a user is nearing or above the researched high-volume envelope, without blocking manual publish or creating any auto-publish behavior.
  - Reuse the same warning levels/copy source across the option publish path and the saved-draft detail surface so the coaching stays consistent.
  - Keep all warnings advisory only, compatible with reply/quote/standalone paths, and safe in demo mode.
