# WP18 Progress - Score integrity & relevance

Append-only progress log. New entries go at the bottom.

## 2026-07-08 - Start

- Read `PRD.md`, `AGENTS.md`, `docs/AGENT_PLAYBOOK.md`,
  `docs/PRODUCT_STRATEGY.md` §4 + the WP18 review/row in §14,
  `convex/_generated/ai/guidelines.md`, and `design.md` before edits.
- This worktree initially had no `node_modules`, so `npm ci` was required
  before reading the local Next docs and running checks.
- Read the relevant local Next guides before touching `src/app/actions.ts`:
  `node_modules/next/dist/docs/01-app/02-guides/server-actions.md` and
  `node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md`.
- Scope confirmed around score/reason integrity, semantic relevance, manual
  analysis scoring, and focused tests. No scope ruling needed so far.

## 2026-07-08 - WP18-S1

- Removed curated-source inflation from `scoreConversation`, so the displayed
  opportunity score now reflects only the factors the user-visible reason can
  honestly describe.
- Kept curated-source bonus, saturated-thread penalty, and learned ranking
  multipliers in the scanner's internal ranking path only. Scanner surfacing
  still uses those signals to decide what makes the cut, but stored/displayed
  scores stay aligned with the displayed reason.
- Tightened the score reason copy for low-fit cases:
  - very low topic relevance now explicitly says the conversation looks
    off-niche
  - classifier-driven unsafe cases can say the conversation looks risky for the
    user's brand
- Verification for S1:
  - `npm run typecheck` passed
  - `npm test -- tests/scoring.test.ts` passed
