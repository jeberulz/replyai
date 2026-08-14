# Production deployment

How Convex + Vercel production is wired for this repo, and the checklist for
getting every env var live. See `.env.example` for what each var does and
its demo-mode fallback — this doc is just "where does it go."

## How the pieces fit together

- **Convex project**: `replyai` (team `john-iseghohi`). Dev deployment
  `shiny-crow-162`, production deployment `calculating-mandrill-742`
  (auto-provisioned per project; existed before any `convex deploy` ran).
- **Vercel project**: `replyai` (team `john-iseghohis-projects`), linked
  locally via `.vercel/project.json` (gitignored).
- **`vercel.ts`** sets a single static build command,
  `node scripts/vercel-build.mjs`. It has to be static — Vercel statically
  analyses this file and fails the deployment with *"Dynamic values found in
  static properties: buildCommand"* if the value is computed. So
  **`scripts/vercel-build.mjs`** makes the per-environment decision at build
  time. For a **production** build (`VERCEL_ENV=production`):
  ```
  npx convex deploy --cmd 'npm run build' --cmd-url-env-var-name NEXT_PUBLIC_CONVEX_URL
  ```
  Every Vercel production build also pushes `convex/` functions to
  `calculating-mandrill-742` first, and Convex injects the fresh prod
  deployment URL as `NEXT_PUBLIC_CONVEX_URL` for that build — so you do
  **not** need to hand-maintain `NEXT_PUBLIC_CONVEX_URL` as a static Vercel
  env var; any value set there for Production is effectively unused (the
  build command overrides it).
- This requires **`CONVEX_DEPLOY_KEY`** set in Vercel's Production
  environment — already done (see below).
- **Preview** builds pick one of two commands:
  - `CONVEX_DEPLOY_KEY` is a *preview* key (prefix `preview:`) → the same
    `convex deploy` plus `--preview-create "$VERCEL_GIT_COMMIT_REF"`, giving
    the branch its own Convex preview deployment.
  - otherwise → plain `npm run build`, using the `NEXT_PUBLIC_CONVEX_URL`
    configured for the Preview environment.

  > **Previously broken.** `vercel.ts` used to set the production command
  > unconditionally, for every environment. Because `CONVEX_DEPLOY_KEY` is
  > scoped to *both* Production and Preview, every preview build ran
  > `convex deploy` with a **production** key and Convex refused:
  > `✖ Detected a non-production build environment and "CONVEX_DEPLOY_KEY"
  > for a production Convex deployment.` Every preview deployment on every
  > branch failed this way. Fixed in WP59.

  > **Open security item.** `CONVEX_DEPLOY_KEY` is still scoped to
  > Production **and** Preview, so a production Convex deploy credential is
  > present in the build environment of every preview deployment, from every
  > branch (including agent branches). The build command no longer *uses*
  > it in preview, but it is still exposed. See "Preview deploy key" below.

## Preview deploy key (owner action)

Recommended end state — do both, in this order:

1. Create a **preview** deploy key in the Convex dashboard
   (project `replyai` → Settings → Deploy keys → *Generate preview deploy
   key*).
2. Replace the Preview-scoped variable so preview builds get their own
   Convex deployment instead of a production credential:
   ```
   vercel env rm  CONVEX_DEPLOY_KEY preview
   vercel env add CONVEX_DEPLOY_KEY preview   # paste the preview: key
   ```
   `scripts/vercel-build.mjs` detects the `preview:` prefix and switches to
   `--preview-create` automatically — no code change needed.

Note that the current production key's value cannot be read back out of
Vercel (it is stored as Sensitive), so removing it from Preview is only
safe once the replacement preview key is in hand. Removing it without a
replacement simply falls back to `npm run build`, which is the current
behaviour and is also fine.

## Triggering the first production deploy

Either:
- Push to `main` / promote a deployment on Vercel — the build command now
  deploys Convex functions automatically, or
- Run `npx convex deploy` locally (targets the project's prod deployment by
  design, regardless of the dev deployment your `.env.local` points at).

## Env var checklist

For each var in `.env.example`, where it needs to be set for production:

| Var | Vercel (Next.js) | Convex prod (`npx convex env set VAR value --prod`) |
|---|---|---|
| `NEXT_PUBLIC_CONVEX_URL` | auto-injected by build command, no action needed | — |
| `NEXT_PUBLIC_APP_URL` | ✅ set to real prod origin | — |
| `ANTHROPIC_API_KEY` | ✅ (Next.js server actions call Anthropic directly) | not required unless a Convex action also calls it directly — check `src/lib/ai.ts` call sites before skipping |
| `ANTHROPIC_MODEL` / `ANTHROPIC_ANALYZE_MODEL` / `ANTHROPIC_GENERATE_MODEL` | ✅ optional overrides | — |
| `X_CLIENT_ID` / `X_CLIENT_SECRET` | ✅ (OAuth flow starts in Next.js) | ✅ required — scheduled-post token refresh runs inside Convex |
| `STRIPE_SECRET_KEY` / `STRIPE_PRO_PRICE_ID` / `STRIPE_WEBHOOK_SECRET` | ✅ if checkout starts in Next.js | ✅ required — billing actions + webhook sync run inside Convex |
| `X_TOKEN_ENCRYPTION_KEY` | not needed in Vercel | ✅ required — encrypts X tokens at rest; **real X sign-in fails without it** (storing the OAuth token throws) |
| `CONVEX_SERVER_TOKEN_ACCESS_SECRET` | ✅ same value as Convex | ✅ same value as Vercel — shared secret, must match on both sides |
| `CONVEX_AUTH_PROVISION_SECRET` | ✅ same value as Convex | ✅ same value as Vercel — shared secret; **every real (non-demo) X sign-in fails without it on both sides** |
| `BETA_ACCESS_MODE` / `BETA_ALLOWED_X_HANDLES` / `BETA_ACCESS_DAYS` | ✅ — production defaults to `allowlist`, and an empty allowlist **fails closed (denies every sign-in)** | — |
| `NEXT_PUBLIC_POSTHOG_KEY` / `NEXT_PUBLIC_POSTHOG_HOST` | ✅ | — |
| `POSTHOG_KEY` / `POSTHOG_HOST` | ✅ (server-side Next.js events) | ✅ required — scanner/publish events fire from Convex |
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | ✅ | ✅ required — Convex-side error tracking |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | ✅ | — |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | not needed in Vercel | ✅ required — push delivery runs inside Convex actions |
| `APP_URL` | not needed in Vercel (this is the Convex-side var, since Convex doesn't inherit Next.js's `NEXT_PUBLIC_APP_URL`) | ✅ required — absolute origin for digest email links |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | not needed in Vercel | ✅ required for the digest cron |
| `CONVEX_DEPLOY_KEY` | ✅ **already set — Production *and* Preview** (`vercel env ls`, 2026-08-14). Production is correct; the Preview copy is a production key that should be replaced with a `preview:` key — see "Preview deploy key" above | n/a, this *is* the credential that authorizes deploys |

Set the Vercel side with `vercel env add VAR production` (add `preview` too
if preview deployments need it) and the Convex side with
`npx convex env set VAR 'value' --prod`.

## Currently set in Vercel (names only; values encrypted, not re-verified)

Verified with `vercel env ls` on 2026-08-14. **All fifteen are scoped to
Production *and* Preview** — there is currently no Production-only variable:

`CONVEX_AUTH_PROVISION_SECRET`, `BETA_ALLOWED_X_HANDLES`, `X_CLIENT_ID`,
`X_CLIENT_SECRET`, `CONVEX_DEPLOY_KEY`, `NEXT_PUBLIC_CONVEX_URL`,
`NEXT_PUBLIC_APP_URL`, `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`,
`CONVEX_DEPLOYMENT`, `NEXT_PUBLIC_CONVEX_SITE_URL`,
`CONVEX_SERVER_TOKEN_ACCESS_SECRET`, plus three vars not in `.env.example`
— `bearer_token`, `consumer_key`, `consumer_secret` — whose purpose is
unclear; confirm whether they're still needed before relying on them.

Two consequences of the blanket Production+Preview scoping worth deciding on:

- `CONVEX_DEPLOY_KEY` — production deploy credential in every preview build
  (see "Preview deploy key" above). Highest-value one to fix.
- `ANTHROPIC_API_KEY` / `X_CLIENT_SECRET` — every preview deployment can
  spend real AI and X quota. WP40-S8's spend caps are enforced per user in
  Convex, not per Vercel environment, so preview traffic draws on the same
  budget.

Nothing has been verified as *correct* for prod (e.g. `NEXT_PUBLIC_APP_URL`
was an empty placeholder as of this writing) — confirm real values before
the first production traffic.

## Troubleshooting: "Sign in with X" fails

The landing page surfaces a specific error code for each known failure. Map
them to fixes:

| `/?error=` | Meaning | Fix |
|---|---|---|
| `provisioning` | `CONVEX_AUTH_PROVISION_SECRET` missing in the Next.js env, missing in Convex, or the two values differ. Non-demo provisioning fails closed. | Set the **same** random value in Vercel and `npx convex env set CONVEX_AUTH_PROVISION_SECRET <value> --prod`, then redeploy Vercel. |
| `beta_config` | `BETA_ACCESS_MODE` resolved to `allowlist` (the production default) with no valid handles in `BETA_ALLOWED_X_HANDLES`, so every identity is denied. | Set `BETA_ALLOWED_X_HANDLES` to a comma-separated handle list in Vercel (or set `BETA_ACCESS_MODE=open`). |
| `token_key` | OAuth and the beta check succeeded, but Convex could not encrypt the X token at rest: `X_TOKEN_ENCRYPTION_KEY` is not set on the Convex deployment. | `npx convex env set X_TOKEN_ENCRYPTION_KEY <value> --prod`. |
| `private_beta` | The signed-in X handle is not on the allowlist. | Add the handle to `BETA_ALLOWED_X_HANDLES`. |
| `oauth_token` | X rejected the code→token exchange. | Check `X_CLIENT_ID`/`X_CLIENT_SECRET` in Vercel and that the X app's callback URL exactly matches `NEXT_PUBLIC_APP_URL/api/auth/callback`. |
| `oauth_profile` | Token accepted but `GET /2/users/me` failed (scope or X API tier/rate limit). | Confirm `users.read` scope and the X API tier's `/users/me` rate limit. |
| `oauth` | State/PKCE cookie mismatch or an unclassified server error. | Check the Vercel function logs for `X OAuth callback failed:`; make sure the browser origin matches `NEXT_PUBLIC_APP_URL` (cookies set on one host are invisible on another, e.g. `www.` vs apex vs `*.vercel.app`). |

The login route also pre-checks `provisioning` and `beta_config` before
redirecting to X, so guaranteed-dead sign-ins fail immediately with the right
message instead of bouncing through X first.

## Still needed before going live

- [ ] Verify/replace every "set to real value" item above — several Vercel
      Production vars were empty placeholders as of this writing
- [ ] **`npx convex env list --prod` currently returns zero variables** —
      every "Convex prod" item in the table above (`X_CLIENT_ID/SECRET`,
      `X_TOKEN_ENCRYPTION_KEY`, `CONVEX_AUTH_PROVISION_SECRET`,
      `CONVEX_SERVER_TOKEN_ACCESS_SECRET`, Stripe,
      PostHog, Sentry, VAPID, `RESEND_*`, `APP_URL`) still needs
      `npx convex env set VAR value --prod`. Without these, the first real
      production deploy will run in whatever demo/no-op fallback each
      integration has (per this repo's demo-mode principle) rather than
      actually publishing, refreshing tokens, or sending notifications.
- [ ] Re-add `ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL` locally to `.env.local`
      (lost during this setup, see chat history)
- [ ] Confirm a custom domain / the right `replyai-*.vercel.app` alias is
      what you want serving production traffic (Vercel project currently
      shows `live: false`)
