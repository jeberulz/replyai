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
