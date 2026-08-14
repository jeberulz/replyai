# WP59 Progress - CI dependency security + preview deploy pipeline

Append-only progress log. Do not rely on chat history for project state.
Never record secrets, tokens, private user content, or customer-identifying
data.

## 2026-08-14 - Setup

- Branch: `feat/wp59-dependency-and-preview-pipeline`, based on `main`
  @ `8d46657` (clean, in sync with origin, no open PRs).
- Assignment: owner asked for four items off a status review — (1) clear the
  dependency advisories failing CI, (2) resolve the production/`main` drift,
  (3) fix failing preview deployments, (4) advance the WP40 launch gate.
  Items 1 and 3 are this WP; 2 and 4 are tracked outside it.
- File boundaries: `package.json`, `package-lock.json`, `vercel.ts`,
  `docs/production-deployment.md`, `docs/PRODUCT_STRATEGY.md` (§14 row only),
  `docs/wp/wp59-*.md`. No product code, no schema, no Convex functions.
- Required checks: `npm run typecheck`, `npm run lint`, `npm test`,
  `npm run build`, `npm run evals`, `npm audit`.
- Lane: Work Package, not Small Fix — `dependencies` is on the
  `small_fix.disallowed` list in `.agentic-workflow.yml`.
- Initial state measured on `main` before any edit:
  - `npm test` — **1 failed** / 565 passed / 1 skipped;
    `tests/securityAudit.test.ts` failing on
    `npm audit --audit-level=high` (8 vulnerabilities, 7 high).
  - `npm run typecheck`, `npm run lint`, `npm run build`, `npm run evals` —
    all passed. So the only red check was the dependency audit.

## 2026-08-14 - S1 dependency advisories

- Actions taken:
  - `npm audit fix` **failed destructively**: `ERR_INVALID_ARG_TYPE` thrown
    from `[rollbackMoveBackRetiredUnchanged]` in
    `@npmcli/arborist/lib/arborist/reify.js:1300`. It had already partially
    reified (next 16.3.1 was on disk) and the crash aborted the rollback,
    leaving `node_modules` inconsistent with the committed lockfile. The next
    `npm install` then failed with `ENOTEMPTY` on a leftover
    `.brace-expansion-*` retire directory. Recovered with `rm -rf
    node_modules` + clean install. `package.json`/`package-lock.json` were
    untouched by the crash (verified with `git diff`); a backup of both was
    taken beforehand.
  - Direct bump: `next` `^16.2.10` → `^16.3.1`, `eslint-config-next` pinned
    to match at `16.3.1`. This cleared the 9 Next.js advisories plus the
    inherited `postcss` and `sharp` ones (8 vulnerabilities → 4).
  - Remaining four had no direct dependency, so they were pinned with
    `overrides`: `dompurify` `^3.4.13`, `fast-uri` `^3.1.5`, `js-yaml`
    `^4.3.1`, `brace-expansion` `^5.0.9`.
- Decisions made:
  - **`js-yaml` stays on 4.x.** The advisory text ("fix not backported")
    reads like a 5.x bump is required, but `4.3.1` exists and is outside the
    published `4.0.0 - 4.3.0` range. Avoided a major bump under eslint.
  - **`fast-uri` stays on 3.x** (`^3.1.5` is the minimal fix; 4.x is a major
    under ajv).
  - **`brace-expansion` needs a version-scoped override.** A blanket
    `^5.0.9` broke lint outright — 5.x exports a *named* `expand`, while
    `minimatch@3.1.5` (via eslint 9) does `require('brace-expansion')` and
    calls the result, giving `TypeError: expand is not a function`. Final
    shape keeps 5.x everywhere except that one consumer:
    ```json
    "brace-expansion": "^5.0.9",
    "minimatch@3": { "brace-expansion": "^1.1.18" }
    ```
    `1.1.18` is outside the `<=1.1.17` advisory range and retains the 1.x
    default-export API. Verified with `npm ls brace-expansion --all`:
    `minimatch@10.2.5 → 5.0.9`, `minimatch@3.1.5 → 1.1.18`.
- Checks run / result: `npm audit` — **0 vulnerabilities**.
  `npm run typecheck` pass. `npm run lint` — 0 errors (the 4 pre-existing
  `convex/_generated` unused-disable warnings remain, unchanged).
  `npm test` — **71 files passed / 1 skipped, 566 passed**, including
  `tests/securityAudit.test.ts`. `npm run evals` — 43 passed.
  `npm run build` — pass, all 20 routes unchanged.
- Gotchas: do not re-run `npm audit fix` on this repo; it corrupts
  `node_modules` as described above.

## 2026-08-14 - S2 preview deploy pipeline

- Signal: every preview deployment on every branch has been failing. Build
  log from the most recent one (`dpl_65pG8xmopPEb7A9EkfsrsWuxfNag`):
  `✖ Detected a non-production build environment and "CONVEX_DEPLOY_KEY" for
  a production Convex deployment.`
- Root cause: `vercel.ts` set the production `convex deploy` build command
  unconditionally for *all* environments, and `vercel env ls` shows
  `CONVEX_DEPLOY_KEY` scoped to **Production and Preview**. So preview builds
  ran a production Convex deploy and Convex correctly refused.
  `docs/production-deployment.md` asserted the opposite on both counts
  ("Production only", "preview … still build with `npm run build` directly")
  — the doc described the intent, the code never implemented it.
- Actions taken: made `vercel.ts` resolve the build command from
  `VERCEL_ENV` and the `CONVEX_DEPLOY_KEY` prefix, and corrected the doc.
- Verification — compiled `vercel.ts` and asserted the resolved
  `buildCommand` for all four reachable states:

  | `VERCEL_ENV` | key | resolved command |
  |---|---|---|
  | `production` | `prod:…` | `convex deploy --cmd 'npm run build' --cmd-url-env-var-name …` (unchanged) |
  | `preview` | `prod:…` | `npm run build` ← **the failing case** |
  | `preview` | `preview:…` | `convex deploy … --preview-create "$VERCEL_GIT_COMMIT_REF"` |
  | `preview` | unset | `npm run build` |

  `npm run typecheck` pass.
- Not done, deliberately — **owner action**: `CONVEX_DEPLOY_KEY` is still
  scoped to Preview, so a production Convex deploy credential still sits in
  every preview build environment even though the build no longer uses it.
  Removing it is not agent-reversible: Vercel stores it as Sensitive, so the
  value cannot be read back and re-added. Steps to replace it with a proper
  `preview:` key are written up in `docs/production-deployment.md`.
- Related finding recorded in the same doc: **all fifteen** Vercel variables
  are scoped Production+Preview, including `ANTHROPIC_API_KEY` and
  `X_CLIENT_SECRET`, so preview deployments can spend real AI and X quota
  against the same budget WP40-S8 is meant to cap.

## 2026-08-14 - S3 registration and final verification

- Registered WP59 in `docs/PRODUCT_STRATEGY.md` §14.
- Full suite re-run on the final tree — see the closing entry below.

## 2026-08-14 - Closing verification

Run on the final tree (`vercel.ts` + docs + registry included):

| Check | Result |
|---|---|
| `npm audit` | 0 vulnerabilities |
| `npm run typecheck` | pass |
| `npm run lint` | 0 errors, 4 pre-existing generated-file warnings |
| `npm test` | 71 files passed / 1 skipped, 566 passed / 1 skipped |
| `npm run evals` | 43 passed |
| `npm run build` | pass, 20 routes, unchanged |

Docs updated: `docs/production-deployment.md`, `docs/PRODUCT_STRATEGY.md`
(§14 WP59 row), `docs/wp/wp59-stories.md`, this file.
Docs not needed: `PRD.md`, `AGENTS.md`, `design.md`, `README.md` — no
product behaviour, UI, or contract changed.

Residual owner actions (both recorded in `docs/production-deployment.md`):

1. Replace the Preview-scoped `CONVEX_DEPLOY_KEY` with a Convex `preview:`
   deploy key.
2. Decide whether `ANTHROPIC_API_KEY` / `X_CLIENT_SECRET` should stay scoped
   to Preview at all.

Registry gap noticed, not fixed here (out of scope): **WP58** (scanner
Sources & settings modal, shipped in PR #72) has stories/progress files but
no `docs/PRODUCT_STRATEGY.md` §14 row.

## 2026-08-14 - Post-push finding: CI is still red for a second, unrelated reason

WP59 cleared the dependency advisories, so CI on PR #74 gets past
`tests/securityAudit.test.ts` for the first time since 2026-07-15 — and
immediately fails at the next job, `Responsive critical flows`, which the
audit failure had been masking all along.

**That failure is not caused by WP59 and is not a code defect.**

Evidence, in order:

1. CI history: `main` has failed on every merge since PR #71 (2026-07-15).
   The recorded cause on `main` @ `8d46657` is the security audit, which
   short-circuits before Playwright, so the Playwright state was unknown.
2. All four `critical-*` projects fail identically in `loginDemo`:
   `/api/auth/demo` never reaches `/dashboard`.
3. Reproduced locally. `curl -i /api/auth/demo` returns
   `307 → /?error=convex`, i.e. the `convexServer().mutation(...)` call in
   `src/app/api/auth/demo/route.ts` throws.
4. `.github/workflows/ci.yml` runs that job with a hardcoded
   `NEXT_PUBLIC_CONVEX_URL` pointing at the **dev** deployment
   `shiny-crow-162`. Re-running the dev server locally against that exact
   URL reproduces CI, and the server log gives the real error:

   ```
   Demo login failed: Error: Server Error
   Cannot run functions while this deployment is paused. Resume the
   deployment in the dashboard settings to allow functions to run.
   ```

The dev Convex deployment is **paused**. It still answers `/version` with
HTTP 200, which is why nothing else notices, but it refuses to run
functions — so demo login cannot create a session and every responsive
critical flow fails at the first step.

Almost certainly the WP57 free-plan overage: the deployment was paused on
quota, WP57 fixed the *cause* (scanner cron fan-out over 502 demo users),
and the deployment was never resumed. The 2026-07-15 timing lines up with
the WP57 work.

**Owner action:** resume `shiny-crow-162` in the Convex dashboard. Not done
here — resuming a deployment paused on quota is a billing decision, and
there is no CLI verb for it. Expect CI to go green once it is resumed *and*
#74 is merged; both are required, neither is sufficient alone.

**Design weakness worth a ruling:** the required CI job depends on a live,
shared, free-plan Convex dev deployment. Any pause, quota trip, or schema
drift there turns the merge gate red for reasons unrelated to the change
under test, and the failure surfaces as an opaque `?error=convex` redirect.
Options: run the suite against a Convex preview/ephemeral deployment, gate
the demo login path behind a deterministic local stub for CI, or surface
the paused-deployment condition explicitly instead of collapsing it to
`error=convex`.
