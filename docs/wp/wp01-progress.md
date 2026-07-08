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
