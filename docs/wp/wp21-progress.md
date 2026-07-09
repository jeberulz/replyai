## 2026-07-08

- Resumed from the existing worktree with partial changes in `shared/researchScoring.ts`,
  `convex/researchActions.ts`, and `tests/research.test.ts`.
- Verified `WP21-S1` before building further:
  `npm test -- tests/research.test.ts` and `npm run typecheck` both passed.
- Kept the scoring change band-relative and the cadence fallback explicitly uncertain
  (`Recent sample only`) so the UI does not overstate activity when timestamps are missing.
- Added shared watch helpers so watched-handle dedupe and topic-tag keyword seeding
  are testable without Convex-specific harness code.
- The research save/list paths now suppress already-watched handles using live
  scanner settings instead of relying only on stored research profile status.
- Verified `WP21-S2` with `npm test -- tests/research.test.ts`,
  `npm run typecheck`, and `npm run lint` (lint only reported pre-existing
  warnings in `convex/_generated/*`).
- Updated the research card CTA/copy so watch actions explicitly mention topic
  seeding, and aligned demo research profile cadence labels with the new honest
  wording.
- Final verification on the completed WP21 tree:
  `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` all
  completed successfully; lint still reports only the existing generated-file
  warnings in `convex/_generated/*`.
