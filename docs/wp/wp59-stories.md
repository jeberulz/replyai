# WP59 Stories - CI dependency security + preview deploy pipeline

Branch: `feat/wp59-dependency-and-preview-pipeline`
Lane: Work Package (dependencies are on the Small Fix disallowed list)
Registry: `docs/PRODUCT_STRATEGY.md` §14
Definition of done: `npm run typecheck && npm run lint && npm test &&
npm run build` green with zero external keys, `npm audit --audit-level=high`
clean, and a preview deployment that builds successfully.

## Stories

- [x] `WP59-S1` - Clear the high-severity dependency advisories
  - Scope: `package.json`, `package-lock.json`
  - Acceptance criteria:
    - `npm audit` reports 0 vulnerabilities
    - `tests/securityAudit.test.ts` passes, so the CI `checks` job is green
    - No product code change; no behaviour change
  - Verification:
    - `npm audit`
    - `npm run typecheck && npm run lint && npm test && npm run build`
    - `npm run evals`

- [x] `WP59-S2` - Stop preview deployments failing on the Convex deploy key
  - Scope: `vercel.ts`, `docs/production-deployment.md`
  - Acceptance criteria:
    - A preview build no longer runs `convex deploy` with a production key
    - A production build is byte-for-byte the same command as before
    - A future `preview:` deploy key switches to `--preview-create` with no
      code change
    - The deployment doc states the real `CONVEX_DEPLOY_KEY` scoping and the
      owner action to fix it
  - Verification:
    - Compile `vercel.ts` and assert the resolved `buildCommand` for
      production / preview+prod-key / preview+preview-key / preview+no-key
    - `npm run typecheck`
    - A real preview deployment reaches READY (owner or post-merge)

- [x] `WP59-S3` - Register WP59 and record verification
  - Scope: `docs/PRODUCT_STRATEGY.md` §14, `docs/wp/wp59-*.md`
  - Acceptance criteria:
    - WP59 appears in the §14 registry with its definition of done
    - Progress file records commands, results, and the residual owner actions
  - Verification:
    - Full check suite re-run on the final tree

## Out Of Scope

- Rotating or re-scoping `CONVEX_DEPLOY_KEY` in Vercel. The stored value is
  Sensitive and cannot be read back, so removing it is not reversible by an
  agent. Recorded as an owner action in `docs/production-deployment.md`.
- Any Next.js 16.3 feature adoption. The bump is a security patch inside the
  existing `^16.2.10` range only.
- The WP40-S8/S9 production gate. Tracked separately.

## Notes

- `npm audit fix` cannot perform this fix: it crashes with
  `ERR_INVALID_ARG_TYPE` in arborist's reify rollback
  (`@npmcli/arborist/lib/arborist/reify.js:1300`) and leaves `node_modules`
  corrupted mid-rollback. Explicit installs plus `overrides` were used
  instead. Do not re-run `npm audit fix` on this repo without checking.
- `brace-expansion` needs a version-scoped override, not a blanket one — see
  the progress file.
