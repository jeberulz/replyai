# WP1 Stories - Security hardening batch

WP1 scope: `convex/helpers.ts`, `sessions`/`xTokens` auth and token handling,
`next.config`, and new CI/security audit scripts/tests.

## Story S1 - Hash and renew sessions

- [ ] Store only a SHA-256 hash for newly created session tokens; keep a
  documented migration fallback for legacy plaintext session rows.
- [ ] Enforce an absolute session lifetime and a sliding renewal window in
  `requireUser`/session lookup without breaking demo login.
- [ ] Make logout and session lookup work through the hashed index.
- [ ] Add focused tests proving new tokens are hashed, legacy tokens still
  authenticate during the migration window, expired sessions fail, and sliding
  renewal is bounded by the absolute expiry.

## Story S2 - Encrypt X OAuth tokens

- [ ] Encrypt newly stored X access and refresh tokens at rest with AES-GCM
  using a Convex environment key.
- [ ] Decrypt tokens only in server/internal token resolution paths; public
  Convex queries must never return token ciphertext or plaintext.
- [ ] Preserve deterministic demo mode when the encryption key or X credentials
  are missing.
- [ ] Add focused tests proving encrypted storage, decrypt-on-read behavior,
  legacy plaintext fallback, and refresh persistence.

## Story S3 - Harden route handlers and platform headers

- [ ] Add security headers in `next.config.ts`: CSP, HSTS,
  `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, and
  `X-Content-Type-Options`.
- [ ] Verify Origin on OAuth callback and mutating auth route handlers.
- [ ] Add per-IP auth route rate limiting for login/demo/callback/logout without
  breaking local demo mode.
- [ ] Add focused tests for header values, Origin checks, and route rate-limit
  behavior where practical.

## Story S4 - Add CI security audit gates

- [ ] Add a `requireUser` surface audit script that fails on any exported public
  Convex query/mutation/action unless it calls `requireUser`/`userBySessionToken`
  or is explicitly allow-listed.
- [ ] Add secret/logging/dependency hygiene checks that fail on token logging,
  plaintext token schema regressions, or high/critical `npm audit` findings.
- [ ] Wire the security checks into CI before the production build.
- [ ] Run the full required suite:
  `npm run typecheck && npm run lint && npm test && npm run build`.
