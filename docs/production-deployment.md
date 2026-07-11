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
- **`vercel.ts`** sets the Vercel build command to:
  ```
  npx convex deploy --cmd 'npm run build' --cmd-url-env-var-name NEXT_PUBLIC_CONVEX_URL
  ```
  Every Vercel **production** build now also pushes `convex/` functions to
  `calculating-mandrill-742` first, and Convex injects the fresh prod
  deployment URL as `NEXT_PUBLIC_CONVEX_URL` for that build — so you do
  **not** need to hand-maintain `NEXT_PUBLIC_CONVEX_URL` as a static Vercel
  env var; any value set there for Production is effectively unused (the
  build command overrides it).
- This requires **`CONVEX_DEPLOY_KEY`** set in Vercel's Production
  environment — already done (see below). Preview deployments don't get
  this build command wired up yet; they still build with `npm run build`
  directly (add a preview deploy key + `--preview-name` wiring later if
  preview environments need their own Convex deployment).

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
| `CONVEX_DEPLOY_KEY` | ✅ **already set** (Production only) — lets Vercel's build push Convex functions | n/a, this *is* the credential that authorizes deploys |

Set the Vercel side with `vercel env add VAR production` (add `preview` too
if preview deployments need it) and the Convex side with
`npx convex env set VAR 'value' --prod`.

## Currently set in Vercel Production (values encrypted, not re-verified here)

`NEXT_PUBLIC_CONVEX_URL`, `NEXT_PUBLIC_APP_URL`, `ANTHROPIC_API_KEY`,
`ANTHROPIC_MODEL`, `X_CLIENT_ID`, `X_CLIENT_SECRET`, `CONVEX_DEPLOYMENT`,
`NEXT_PUBLIC_CONVEX_SITE_URL`, `CONVEX_SERVER_TOKEN_ACCESS_SECRET`,
`CONVEX_DEPLOY_KEY` (added by this setup), plus three vars not in
`.env.example` — `bearer_token`, `consumer_key`, `consumer_secret` — whose
purpose is unclear; confirm whether they're still needed before relying on
them.

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
