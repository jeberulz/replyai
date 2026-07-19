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

function publicConvexExports() {
  const out = [];
  for (const relPath of walk("convex")) {
    const source = read(relPath);
    const exportPattern =
      /export\s+const\s+([A-Za-z0-9_]+)\s*=\s*(query|mutation|action)\s*\(/g;
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

function auditRequireUser() {
  const failures = [];
  for (const fn of publicConvexExports()) {
    if (publicAllowList.has(fn.id)) continue;
    const hasOwnedAnalysisWrapper =
      fn.body.includes("requireOwnedAnalysis(") &&
      /function\s+requireOwnedAnalysis[\s\S]*requireUser\(/.test(fn.source);
    const hasEvalOperatorWrapper =
      fn.body.includes("requireEvalOperator(") &&
      ((/function\s+requireEvalOperator[\s\S]*requireUser\(/.test(fn.source)) ||
        (/import\s+\{\s*[^}]*requireEvalOperator[^}]*\}\s+from\s+["']\.\/helpers["'];/.test(
          fn.source
        ) &&
          /export\s+async\s+function\s+requireEvalOperator[\s\S]*requireUser\(/.test(
            read("convex/helpers.ts")
          )));
    if (
      fn.body.includes("requireUser(") ||
      fn.body.includes("userBySessionToken(") ||
      fn.body.includes("sessionByToken(") ||
      hasOwnedAnalysisWrapper ||
      hasEvalOperatorWrapper
    ) {
      continue;
    }
    failures.push(`${fn.id} (${fn.kind}) in ${fn.relPath}`);
  }
  return failures.map(
    (failure) =>
      `Public Convex function does not authenticate with requireUser/session helper: ${failure}`
  );
}

function auditTokenSchema() {
  const schema = read("convex/schema.ts");
  const failures = [];
  if (!/sessions:\s*defineTable\(\{[\s\S]*tokenHash:\s*v\.optional\(v\.string\(\)\)/.test(schema)) {
    failures.push("sessions schema must include optional tokenHash.");
  }
  if (/sessions:\s*defineTable\(\{[\s\S]*token:\s*v\.string\(\)/.test(schema)) {
    failures.push("sessions.token must not be a required plaintext string.");
  }
  if (!/xTokens:\s*defineTable\(\{[\s\S]*encryptedAccessToken:\s*v\.optional\(v\.string\(\)\)/.test(schema)) {
    failures.push("xTokens schema must include optional encryptedAccessToken.");
  }
  if (!/xTokens:\s*defineTable\(\{[\s\S]*encryptedRefreshToken:\s*v\.optional\(v\.string\(\)\)/.test(schema)) {
    failures.push("xTokens schema must include optional encryptedRefreshToken.");
  }
  if (/xTokens:\s*defineTable\(\{[\s\S]*accessToken:\s*v\.string\(\)/.test(schema)) {
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
