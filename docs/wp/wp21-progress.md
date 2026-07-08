## 2026-07-08

- Resumed from the existing worktree with partial changes in `shared/researchScoring.ts`,
  `convex/researchActions.ts`, and `tests/research.test.ts`.
- Verified `WP21-S1` before building further:
  `npm test -- tests/research.test.ts` and `npm run typecheck` both passed.
- Kept the scoring change band-relative and the cadence fallback explicitly uncertain
  (`Recent sample only`) so the UI does not overstate activity when timestamps are missing.
