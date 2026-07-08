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

## 2026-07-08 - WP18-S2

- Replaced the single global growth-velocity curve with follower-band
  normalization in `shared/scoring.ts`:
  - micro accounts saturate much earlier than large accounts
  - the score still stays inside 0..100 and keeps topic relevance as the
    heaviest factor
- Updated the user-facing reason copy so momentum language is explicitly framed
  relative to audience size instead of implying one global viral threshold.
- Added focused tests proving:
  - the same raw engagement produces more velocity credit for a small account
    than for a large one
  - high-momentum large-account tweets still clamp velocity at 1
- Verification for S2:
  - `npm run typecheck` passed
  - `npm test -- tests/scoring.test.ts` passed

## 2026-07-08 - WP18-S3

- Manual analysis scoring now builds a real niche context from the authenticated
  user's scanner keywords, recent analysis topics, and default voice profile
  examples instead of relying on keyword-only relevance.
- `startAnalysisAction` now runs semantic relevance for manual analyses:
  - live Haiku classification when `ANTHROPIC_API_KEY` is present
  - deterministic `demoSemanticRelevance(...)` fallback when the key is
    missing or the live call fails
- Added `resolveManualTopicRelevance(...)` in `shared/semanticRelevance.ts` so
  tests can lock the rule that manual analyses use classifier output when it is
  available instead of silently defaulting to `0.5`.
- Verification for S3:
  - `npm run typecheck` passed
  - `npm test -- tests/semanticRelevance.test.ts` passed

## 2026-07-08 - WP18-S4

- Expanded the semantic score shape to carry `brandSafety: "safe" | "unsafe"`
  alongside relevance, so the classifier can make a final safety decision
  instead of the old regex-only hard zero.
- The political regex now acts as a signal, not the final gate:
  - `topicRelevanceForKeywords(...)` no longer hard-zeros policy posts
  - `shouldExcludeCandidate(...)` no longer drops tweets only because they look
    political
  - `passesCombinedFeedFilter(...)` now blocks only when the semantic classifier
    marks the conversation unsafe
- The demo fallback is broader than politics now:
  - unsafe for tragedy/disaster threads
  - unsafe for outrage-bait / dogpile language
  - allows niche policy/regulation discussions when they fit the user's focus
- Both classifier call sites now carry the brand-safety contract:
  - `convex/semanticActions.ts` asks the live classifier for relevance plus a
    safe/unsafe verdict
  - manual `startAnalysisAction` uses that verdict to keep the displayed score
    and reason honest for risky conversations
- Verification for S4:
  - `npm run typecheck` passed
  - `npm test -- tests/semanticRelevance.test.ts tests/scoring.test.ts tests/feedFilters.test.ts` passed

## 2026-07-08 - WP18-S5

- Final required verification completed in the WP18 worktree:
  - `npm run typecheck` passed
  - `npm run lint` passed with warnings only, all in checked-in
    `convex/_generated/*` files (`Unused eslint-disable directive`); no
    WP18-authored lint warnings remain
  - `npm test` passed (`25` files passed, `1` skipped; `211` tests passed,
    `1` skipped)
  - `npm run evals` passed (`43` tests)
  - `npm run build` passed on Next.js `16.2.10`
- The last code adjustment before the final pass was a small scanner-upsert
  cleanup so the internal `rankingScore` / `semanticScreen` strip step does not
  create lint noise.
- Branch state remains WP18-scoped: scoring, semantic relevance, manual
  analysis scoring, scanner ranking/safety wiring, focused tests, and the
  working `docs/wp` artifacts only.
