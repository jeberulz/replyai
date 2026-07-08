# WP1 Progress - Security hardening batch

## 2026-07-08 - Initial read-in

- Read `PRD.md`, `AGENTS.md`, `docs/AGENT_PLAYBOOK.md`,
  `docs/PRODUCT_STRATEGY.md` sections 4, 8.1-8.4, and 14 WP1,
  `convex/_generated/ai/guidelines.md`, `design.md`, and the installed Next
  docs for route handlers, Server Actions, CSP, production checklist, and
  `next.config` headers.
- `docs/wp/RULINGS.md` is not present in this worktree.
- `node_modules` was absent, so `npm ci` was run to make the installed Next
  docs available. It reported two moderate advisories in Next's transitive
  PostCSS range; `npm audit --audit-level=moderate` fails, but the available
  fix is a breaking downgrade. The planned dependency gate will therefore fail
  on high/critical advisories for this WP unless the orchestrator separately
  approves dependency changes.
- Current baseline stores session tokens and X OAuth tokens as plaintext.
  `users.xAuthForSession` is a public query that returns X tokens to any holder
  of a valid session token, so S2 will remove public token return paths and
  decrypt only in server/internal paths.

## 2026-07-08 - S1 session hashing and renewal

- Added optional `sessions.tokenHash`, `lastSeenAt`, and `absoluteExpiresAt`
  fields plus a `by_token_hash` index. `sessions.token` is now optional and
  deprecated for a zero-downtime migration fallback.
- New sessions store `SHA-256(sessionToken)` and never write the plaintext
  bearer token. Lookup checks `by_token_hash` first and falls back to
  `by_token` for legacy rows.
- `userBySessionToken` rejects both sliding-expired and absolute-expired
  sessions. Mutating callers renew sessions within seven days of expiry, capped
  at a 90-day absolute lifetime; query callers remain read-only.
- `logout` now deletes via the hashed lookup with the same legacy fallback.
- Verification: `npm run typecheck`, `npm test -- tests/sessionSecurity.test.ts`,
  and full `npm test` all passed.

## 2026-07-08 - S2 X token encryption

- Added `convex/tokenSecurity.ts` with AES-GCM token encryption. The key is
  derived from `X_TOKEN_ENCRYPTION_KEY` in Convex env; missing key fails real
  token writes but does not affect demo login because demo users have no X token
  row.
- Added optional encrypted token fields to `xTokens`; plaintext `accessToken`
  and `refreshToken` are now optional deprecated migration fallbacks.
- New OAuth/token-refresh writes encrypt tokens and clear/migrate plaintext
  fields on patch. New inserts write only encrypted fields.
- Public `users.xAuthForSession` now returns X identity metadata only, never
  token material. Token-bearing reads moved to `users.xAuthForServerSession`,
  which requires `CONVEX_SERVER_TOKEN_ACCESS_SECRET` in addition to a valid
  session. Next server actions use that server-only path; browser-accessible
  Convex calls cannot read plaintext or ciphertext tokens.
- Internal scanner/research/publish token paths decrypt stored tokens via the
  shared helper and keep legacy plaintext fallback for existing rows.
- Verification: `npm run typecheck`, `npm test -- tests/xTokenSecurity.test.ts`,
  and full `npm test` all passed.

## 2026-07-08 - S3 route and header hardening

- Added static security headers through `next.config.ts`: CSP, HSTS,
  `X-Frame-Options: DENY`, `Referrer-Policy`,
  `Permissions-Policy`, and `X-Content-Type-Options`; also disabled the
  `X-Powered-By` header.
- Used `next.config` headers rather than nonce CSP because the installed Next
  docs say nonce CSP forces dynamic rendering for all pages. The static CSP
  keeps the current build model and allows the expected Convex/X/Anthropic/
  PostHog/Sentry connection origins.
- Added `src/lib/authSecurity.ts` with Origin validation and per-IP, per-route
  auth rate limiting. OAuth GET flows allow missing Origin for top-level
  redirects/navigation but reject mismatches; logout POST requires a matching
  Origin.
- Wired guards into login, demo login, OAuth callback, and logout route
  handlers. Demo mode still works without X credentials because the demo route
  is guarded but does not require external keys.
- Verification: `npm run typecheck`, focused auth/header tests, full
  `npm test`, `npm run lint` (0 errors; pre-existing generated/component
  warnings only), and `npm run build` all passed.

## 2026-07-08 - S4 CI security audit

- Added `scripts/security-audit.mjs` and `npm run security:audit`.
- The audit checks every exported public Convex query/mutation/action and fails
  unless the function body uses `requireUser`, `userBySessionToken`,
  `sessionByToken`, or the vetted `requireOwnedAnalysis` wrapper. Three public
  functions are explicitly allow-listed with reasons: `cache.get`, `cache.put`,
  and `users.upsertAndCreateSession`.
- The same script also fails plaintext token schema regressions, direct token
  logging patterns, and high/critical `npm audit` findings. Moderate PostCSS
  advisories remain noted from read-in; the high/critical gate is green.
- CI now runs `npm run security:audit` after the eval gate and before the
  production build.
- Added a Vitest smoke test for the audit script.
- Verification: `npm run typecheck`, `npm run lint` (0 errors; pre-existing
  warnings only), full `npm test`, and `npm run security:audit` all passed.

## 2026-07-08 - Review fix: token secret setup docs

- Added `.env.example` entries and setup comments for `X_TOKEN_ENCRYPTION_KEY`
  and `CONVEX_SERVER_TOKEN_ACCESS_SECRET`.
- Updated `README.md` Real integrations setup to mirror the existing Convex env
  pattern: `X_TOKEN_ENCRYPTION_KEY` must be set in Convex, and
  `CONVEX_SERVER_TOKEN_ACCESS_SECRET` must use the same value in `.env.local`
  and Convex.
- Documented that demo mode still works without these secrets, while live X
  OAuth/publish paths fail closed until configured.

## 2026-07-08 - Orchestrator review pass (code-review + security-review)

Ran /security-review (no HIGH/MEDIUM findings) and /code-review at high
effort (8 finder angles + verification). Fixed:

- **Security-audit script couldn't see WP2's auth pattern.** `billingNode.ts`'s
  checkout/portal actions authorize by calling
  `ctx.runQuery(internal.billing.viewerForSession, ...)`, which itself calls
  `requireUser` — but `auditRequireUser`'s same-body string match can't see
  auth that happens in a called function, so both actions would fail CI once
  WP1 and WP2 merge together. Added transitive resolution: a function
  authorizes if it or any `internal.mod.fn` it calls (bounded depth + visited
  set) does. Covered by new tests in `tests/securityAudit.test.ts`.
- **Decrypt failures now propagate where a plain field read never could.**
  `readStoredXTokens` threw on a corrupted ciphertext, a rotated/misconfigured
  `X_TOKEN_ENCRYPTION_KEY`, or an unsupported format — unhandled, this could
  abort the scan cron for every remaining user (`scanContext` runs before
  `scanUser`'s own try/catch), wedge a scheduled publish forever
  (`getForPublish`), or 500 a server action (`xAuthForServerSession`). Now
  catches, reports via `captureConvexException`, and returns null tokens so
  the existing "reconnect X" UX takes over instead.
- **Legacy plaintext sessions never got upgraded.** `maybeRenewSession` only
  patched `expiresAt`/`lastSeenAt`, so a user already logged in when hashing
  shipped kept a raw bearer token in `sessions.token`, resolved via the
  `by_token` fallback, for up to the full 90-day absolute lifetime. Now
  backfills `tokenHash` (and clears `token`) the moment a legacy session is
  seen in a mutation context, independent of TTL proximity.
- **Timing-unsafe secret comparison.** `requireServerTokenAccess` (the only
  gate in front of `xAuthForServerSession`, an Internet-callable query that
  can return decrypted X tokens) used `!==`, leaking match progress via
  response timing. Now hashes both sides to a fixed-length digest and
  compares without short-circuiting.
- **Audit script hardening.** `auditRequireUser`'s string match could be
  satisfied by a comment (`// requireUser(...)`) with no real call; now
  strips comments/strings before matching. `auditTokenSchema`'s per-table
  field checks used an unbounded `[\s\S]*` that could be satisfied by an
  unrelated later table; now bounded to each table's own brace-matched block.
- **Efficiency**: the AES key was re-derived (hash + import) on every single
  encrypt/decrypt call — cached per-secret at module scope now. Independent
  access/refresh token encrypt/decrypt pairs now run via `Promise.all`
  instead of serially. `bytesToHex` was duplicated between `helpers.ts` and
  the new `tokenSecurity.ts` — the latter now imports it.
- **Rate-limiter map growth**: `authRateLimits` entries were never evicted;
  sweeps once the map crosses 5,000 entries.

Verified: `npm run typecheck && npm run lint && npm test && npm run build &&
npm run security:audit` all pass; 186 tests (up from 174), all new fixes
covered by regression tests.

**Documented, not code-fixed** (in the PR under "Found, not fixed"):
sliding session renewal only fires from mutation contexts (Convex queries
can't write) — a purely read-only user could still expire at the original
30-day mark; given nearly every meaningful interaction in this app is a
mutation (save/generate/dismiss), judged a narrow edge case. `authClientIp`
trusts `X-Forwarded-For` per the deployment's actual proxy trust model —
documented as a best-effort limitation rather than "fixed" by guessing at
proxy topology. Two `process.env` reads in this diff should move to the
typed Convex `env` pattern, deferred until WP2 merges (it introduces
`convex/convex.config.ts`; creating it here first would collide).
