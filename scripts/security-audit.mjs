#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const publicAllowList = new Map([
  [
    "cache.get",
    "Keyed external-response cache; values are content-addressed and not user-authorized data.",
  ],
  [
    "cache.put",
    "Server-side cache writer; no user data ownership decision is made here.",
  ],
  [
    "users.upsertAndCreateSession",
    "Server-only OAuth/demo auth entrypoint that creates the session being authenticated.",
  ],
]);

function read(relPath) {
  return readFileSync(path.join(repoRoot, relPath), "utf8");
}

function walk(dir) {
  const abs = path.join(repoRoot, dir);
  if (!existsSync(abs)) return [];
  return readdirSync(abs, { withFileTypes: true }).flatMap((entry) => {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "_generated") return [];
      return walk(rel);
    }
    return entry.isFile() && entry.name.endsWith(".ts") ? [rel] : [];
  });
}

// All Convex function exports, public and internal. Internal functions are
// reachable only via ctx.run{Query,Mutation,Action} from other Convex
// functions (never over the wire directly), but a public function that
// delegates its auth check to one (e.g. an action calling an internalQuery
// that calls requireUser) is still authorized — the transitive check below
// walks into these so that pattern doesn't have to be allow-listed by hand.
const PUBLIC_KINDS = new Set(["query", "mutation", "action"]);

function allConvexExports() {
  const out = [];
  for (const relPath of walk("convex")) {
    const source = read(relPath);
    const exportPattern =
      /export\s+const\s+([A-Za-z0-9_]+)\s*=\s*(query|mutation|action|internalQuery|internalMutation|internalAction|httpAction)\s*\(/g;
    const matches = [...source.matchAll(exportPattern)];
    for (let i = 0; i < matches.length; i += 1) {
      const match = matches[i];
      const next = matches[i + 1]?.index ?? source.length;
      const fileModule = path.basename(relPath, ".ts");
      out.push({
        id: `${fileModule}.${match[1]}`,
        relPath,
        kind: match[2],
        source,
        body: source.slice(match.index, next),
      });
    }
  }
  return out;
}

function publicConvexExports() {
  return allConvexExports().filter((fn) => PUBLIC_KINDS.has(fn.kind));
}

/**
 * Strip comments (respecting string/template literals) before matching auth
 * calls, so `// TODO: add requireUser(...)` or a stale docblock mentioning
 * it can't make an unauthenticated function look authorized. Not a full
 * parser — doesn't handle `${...}` expressions nested inside template
 * literals — but that pattern doesn't occur in these Convex function bodies.
 */
function stripComments(code) {
  let out = "";
  for (let i = 0; i < code.length; ) {
    const ch = code[i];
    if (ch === '"' || ch === "'" || ch === "`") {
      const quote = ch;
      out += ch;
      i += 1;
      while (i < code.length) {
        if (code[i] === "\\") {
          out += code.slice(i, i + 2);
          i += 2;
          continue;
        }
        out += code[i];
        const closed = code[i] === quote;
        i += 1;
        if (closed) break;
      }
      continue;
    }
    if (ch === "/" && code[i + 1] === "/") {
      while (i < code.length && code[i] !== "\n") i += 1;
      continue;
    }
    if (ch === "/" && code[i + 1] === "*") {
      i += 2;
      while (i < code.length && !(code[i] === "*" && code[i + 1] === "/")) i += 1;
      i += 2;
      continue;
    }
    out += ch;
    i += 1;
  }
  return out;
}

function directlyAuthorizes(fn) {
  const body = stripComments(fn.body);
  const source = stripComments(fn.source);
  const hasOwnedAnalysisWrapper =
    body.includes("requireOwnedAnalysis(") &&
    /function\s+requireOwnedAnalysis[\s\S]*requireUser\(/.test(source);
  return (
    body.includes("requireUser(") ||
    body.includes("userBySessionToken(") ||
    body.includes("sessionByToken(") ||
    hasOwnedAnalysisWrapper
  );
}

/**
 * A function authorizes if it checks auth directly, or if it delegates to
 * another Convex function (ctx.run{Query,Mutation,Action}(internal.mod.fn,
 * ...)) that does — the actions-can't-touch-the-db pattern every Node action
 * in this codebase uses (e.g. billingNode's checkout/portal actions call
 * `internal.billing.viewerForSession`, which calls requireUser). Bounded
 * depth + visited set guards against reference cycles.
 */
function authorizes(fn, byId, visited = new Set(), depth = 0) {
  if (directlyAuthorizes(fn)) return true;
  if (depth >= 4 || visited.has(fn.id)) return false;
  visited.add(fn.id);

  const refPattern = /internal\.([A-Za-z0-9_]+)\.([A-Za-z0-9_]+)/g;
  for (const [, mod, name] of stripComments(fn.body).matchAll(refPattern)) {
    const referenced = byId.get(`${mod}.${name}`);
    if (referenced && authorizes(referenced, byId, visited, depth + 1)) {
      return true;
    }
  }
  return false;
}

function auditRequireUser() {
  const failures = [];
  const all = allConvexExports();
  const byId = new Map(all.map((fn) => [fn.id, fn]));
  for (const fn of publicConvexExports()) {
    if (publicAllowList.has(fn.id)) continue;
    if (authorizes(fn, byId)) continue;
    failures.push(`${fn.id} (${fn.kind}) in ${fn.relPath}`);
  }
  return failures.map(
    (failure) =>
      `Public Convex function does not authenticate with requireUser/session helper: ${failure}`
  );
}

/**
 * Extract just one table's `defineTable({ ... })` body via brace matching,
 * rather than an unbounded `[\s\S]*` that keeps scanning past the table's
 * own closing brace into whatever comes later in the file. An unbounded scan
 * means a field the check requires (e.g. `encryptedAccessToken`) could be
 * satisfied by an unrelated, later table — silently defeating the guard.
 */
function extractTableBlock(schema, tableName) {
  const marker = `${tableName}: defineTable({`;
  const start = schema.indexOf(marker);
  if (start === -1) return null;
  let depth = 0;
  for (let i = start + marker.length - 1; i < schema.length; i += 1) {
    if (schema[i] === "{") depth += 1;
    else if (schema[i] === "}") {
      depth -= 1;
      if (depth === 0) return schema.slice(start, i + 1);
    }
  }
  return schema.slice(start);
}

function auditTokenSchema() {
  const schema = read("convex/schema.ts");
  const failures = [];
  const sessions = extractTableBlock(schema, "sessions");
  const xTokens = extractTableBlock(schema, "xTokens");

  if (!sessions || !/tokenHash:\s*v\.optional\(v\.string\(\)\)/.test(sessions)) {
    failures.push("sessions schema must include optional tokenHash.");
  }
  if (sessions && /token:\s*v\.string\(\)/.test(sessions)) {
    failures.push("sessions.token must not be a required plaintext string.");
  }
  if (!xTokens || !/encryptedAccessToken:\s*v\.optional\(v\.string\(\)\)/.test(xTokens)) {
    failures.push("xTokens schema must include optional encryptedAccessToken.");
  }
  if (!xTokens || !/encryptedRefreshToken:\s*v\.optional\(v\.string\(\)\)/.test(xTokens)) {
    failures.push("xTokens schema must include optional encryptedRefreshToken.");
  }
  if (xTokens && /accessToken:\s*v\.string\(\)/.test(xTokens)) {
    failures.push("xTokens.accessToken must not be a required plaintext string.");
  }
  return failures;
}

function auditTokenLogging() {
  const failures = [];
  const consolePattern =
    /console\.(log|warn|error|info|debug)\s*\((?:(?!\);)[\s\S])*(accessToken|refreshToken|sessionToken|encryptedAccessToken|encryptedRefreshToken)/g;
  for (const relPath of [
    ...walk("convex"),
    ...walk("src/app"),
    ...walk("src/lib"),
  ]) {
    const source = read(relPath);
    for (const match of source.matchAll(consolePattern)) {
      const line = source.slice(0, match.index).split("\n").length;
      failures.push(`Potential token logging in ${relPath}:${line}`);
    }
  }
  return failures;
}

function auditDependencies() {
  try {
    execFileSync("npm", ["audit", "--audit-level=high"], {
      cwd: repoRoot,
      stdio: "pipe",
      encoding: "utf8",
    });
    return [];
  } catch (error) {
    const output = [error.stdout, error.stderr].filter(Boolean).join("\n");
    return [`npm audit --audit-level=high failed:\n${output.trim()}`];
  }
}

function main() {
  const failures = [
    ...auditRequireUser(),
    ...auditTokenSchema(),
    ...auditTokenLogging(),
    ...auditDependencies(),
  ];

  if (failures.length > 0) {
    console.error("Security audit failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log(
    `Security audit passed (${publicConvexExports().length} public Convex functions checked, ${publicAllowList.size} allow-listed).`
  );
}

// Only run as a CLI when executed directly (`node scripts/security-audit.mjs`
// / `npm run security:audit`) — importing this module for unit tests must not
// print to the console or call process.exit.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}

export {
  authorizes,
  directlyAuthorizes,
  allConvexExports,
  publicConvexExports,
  stripComments,
  extractTableBlock,
};
