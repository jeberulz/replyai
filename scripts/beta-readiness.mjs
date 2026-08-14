#!/usr/bin/env node
// WP40-S8 production readiness gate for the first-10 private beta.
//
// Prints variable NAMES and presence only — never a value, and never a
// handle, email, DSN, or token. Anything that would identify a person or
// authorize an API call stays in the owner's private launch inventory.
//
// Usage:
//   npm run beta:readiness                 # env presence only
//   npm run beta:readiness -- --http       # also run production HTTP checks
//   npm run beta:readiness -- --origin=... # override the origin to probe
//   npm run beta:readiness -- --json       # machine-readable report
//
// Exits non-zero when a required name is absent or an HTTP check fails, so
// it can gate the launch runbook.

import { execFileSync } from "node:child_process";

// --- Requirement catalogue -------------------------------------------------
//
// `required` is scoped to the WP40 cohort: ten no-card design partners.
// Stripe is deliberately not required — the WP40 ruling puts live charging
// behind the later paid-beta gate.

/** @typedef {{name: string, why: string, required: boolean}} Requirement */

/** @type {Requirement[]} */
export const VERCEL_REQUIREMENTS = [
  { name: "NEXT_PUBLIC_APP_URL", why: "OAuth callback + cookie origin must match exactly", required: true },
  { name: "CONVEX_AUTH_PROVISION_SECRET", why: "every real X sign-in fails closed without it", required: true },
  { name: "CONVEX_SERVER_TOKEN_ACCESS_SECRET", why: "shared secret with Convex; must match", required: true },
  { name: "BETA_ALLOWED_X_HANDLES", why: "empty allowlist denies every sign-in", required: true },
  { name: "X_CLIENT_ID", why: "X OAuth starts in Next.js", required: true },
  { name: "X_CLIENT_SECRET", why: "X OAuth code exchange", required: true },
  { name: "ANTHROPIC_API_KEY", why: "analysis + generation run in server actions", required: true },
  { name: "REPLYPILOT_SUPPORT_EMAIL", why: "legal/support copy must not ship a placeholder", required: true },
  { name: "REPLYPILOT_OPERATOR_NAME", why: "legal/support copy must not ship a placeholder", required: true },
  { name: "NEXT_PUBLIC_POSTHOG_KEY", why: "browser funnel events", required: true },
  { name: "NEXT_PUBLIC_POSTHOG_HOST", why: "browser funnel events", required: true },
  { name: "POSTHOG_KEY", why: "server-side Next.js events", required: true },
  { name: "POSTHOG_HOST", why: "server-side Next.js events", required: true },
  { name: "NEXT_PUBLIC_SENTRY_DSN", why: "browser error tracking", required: true },
  { name: "SENTRY_DSN", why: "Next.js server error tracking", required: true },
  { name: "NEXT_PUBLIC_VAPID_PUBLIC_KEY", why: "browser cannot subscribe to push without it", required: true },
  { name: "BETA_ACCESS_MODE", why: "defaults to allowlist in production; set explicitly to be sure", required: false },
  { name: "BETA_ACCESS_DAYS", why: "beta entitlement window; has a default", required: false },
  { name: "NEXT_PUBLIC_CONVEX_URL", why: "auto-injected by the production build command", required: false },
  { name: "ENABLE_PUBLIC_DEMO", why: "must stay unset/false in production (WP40 ruling 3)", required: false },
];

/** @type {Requirement[]} */
export const CONVEX_REQUIREMENTS = [
  { name: "CONVEX_AUTH_PROVISION_SECRET", why: "must match the Vercel value", required: true },
  { name: "CONVEX_SERVER_TOKEN_ACCESS_SECRET", why: "must match the Vercel value", required: true },
  { name: "X_TOKEN_ENCRYPTION_KEY", why: "real X sign-in throws when storing the token without it", required: true },
  { name: "X_CLIENT_ID", why: "scheduled-post token refresh runs in Convex", required: true },
  { name: "X_CLIENT_SECRET", why: "scheduled-post token refresh runs in Convex", required: true },
  { name: "ANTHROPIC_API_KEY", why: "Convex actions call Anthropic directly", required: true },
  { name: "AI_SPEND_LIMITS_REQUIRED", why: "spend must fail closed, never silently unlimited", required: true },
  { name: "AI_SPEND_KILL_SWITCH", why: "operator kill switch for incidents", required: true },
  { name: "AI_ANALYSIS_HOURLY_LIMIT", why: "per-user hourly analysis cap", required: true },
  { name: "AI_GENERATION_HOURLY_LIMIT", why: "per-user hourly generation cap", required: true },
  { name: "X_READ_LIMITS_REQUIRED", why: "X reads must fail closed", required: true },
  { name: "X_READ_KILL_SWITCH", why: "operator kill switch for X spend", required: true },
  { name: "X_READ_USER_DAILY_LIMIT", why: "per-user X unique-read cap", required: true },
  { name: "X_READ_GLOBAL_DAILY_LIMIT", why: "global X unique-read cap", required: true },
  { name: "POSTHOG_KEY", why: "scanner/publish events fire from Convex", required: true },
  { name: "POSTHOG_HOST", why: "scanner/publish events fire from Convex", required: true },
  { name: "SENTRY_DSN", why: "Convex-side error tracking", required: true },
  { name: "VAPID_PUBLIC_KEY", why: "push delivery runs in Convex actions", required: true },
  { name: "VAPID_PRIVATE_KEY", why: "push delivery runs in Convex actions", required: true },
  { name: "VAPID_SUBJECT", why: "push delivery runs in Convex actions", required: true },
  { name: "APP_URL", why: "absolute origin for digest email links", required: true },
  { name: "RESEND_API_KEY", why: "hot-window fallback email", required: true },
  { name: "RESEND_FROM_EMAIL", why: "hot-window fallback email", required: true },
  { name: "SCANNER_MIN_CADENCE_MINUTES", why: "scan cadence floor; has a default", required: false },
];

// --- Pure helpers (unit-tested; no I/O) ------------------------------------

/**
 * `vercel env ls` prints a name-first table. Take column 1 of each data row
 * and never look at the value column.
 *
 * Data rows are identified by their environments column rather than by the
 * shape of the name, because this project has lowercase variables
 * (`bearer_token`, `consumer_key`) that an uppercase heuristic would drop —
 * while CLI banner lines ("Vercel CLI 59.0.0") would sneak through it.
 * @param {string} stdout
 * @returns {string[]}
 */
export function parseVercelEnvNames(stdout) {
  const names = [];
  for (const rawLine of stdout.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("name")) continue;
    if (!/\b(Production|Preview|Development)\b/.test(line)) continue;
    const [first] = line.split(/\s+/);
    if (!first || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(first)) continue;
    names.push(first);
  }
  return [...new Set(names)];
}

/**
 * `convex env list` prints NAME=value. Split on the first `=` and discard
 * everything after it, so no value ever enters the report.
 * @param {string} stdout
 * @returns {string[]}
 */
export function parseConvexEnvNames(stdout) {
  const names = [];
  for (const rawLine of stdout.split("\n")) {
    const line = rawLine.trim();
    if (!line || !line.includes("=")) continue;
    const name = line.slice(0, line.indexOf("=")).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) continue;
    names.push(name);
  }
  return [...new Set(names)];
}

/**
 * @param {Requirement[]} requirements
 * @param {string[]} presentNames
 */
export function evaluatePlane(requirements, presentNames) {
  const present = new Set(presentNames);
  const missingRequired = requirements.filter((r) => r.required && !present.has(r.name));
  const missingOptional = requirements.filter((r) => !r.required && !present.has(r.name));
  const satisfied = requirements.filter((r) => present.has(r.name));
  const unknown = presentNames.filter((n) => !requirements.some((r) => r.name === n));
  return { satisfied, missingRequired, missingOptional, unknown };
}

/**
 * @param {{ vercel: string[], convex: string[], http?: HttpCheckResult[] }} input
 */
export function evaluateReadiness(input) {
  const vercel = evaluatePlane(VERCEL_REQUIREMENTS, input.vercel);
  const convex = evaluatePlane(CONVEX_REQUIREMENTS, input.convex);
  const http = input.http ?? [];
  const httpFailures = http.filter((c) => !c.ok);
  const ok =
    vercel.missingRequired.length === 0 &&
    convex.missingRequired.length === 0 &&
    httpFailures.length === 0;
  return { ok, vercel, convex, http, httpFailures };
}

/** @typedef {{ id: string, ok: boolean, detail: string }} HttpCheckResult */

export const REQUIRED_SECURITY_HEADERS = [
  "content-security-policy",
  "strict-transport-security",
  "x-frame-options",
  "referrer-policy",
  "permissions-policy",
  "x-content-type-options",
];

/**
 * @param {Response} response
 * @returns {HttpCheckResult[]}
 */
export function checkSecurityHeaders(response) {
  return REQUIRED_SECURITY_HEADERS.map((header) => ({
    id: `header:${header}`,
    ok: response.headers.get(header) !== null,
    detail: response.headers.get(header) === null ? "absent" : "present",
  }));
}

// --- I/O -------------------------------------------------------------------

function capture(command, args) {
  try {
    return {
      ok: true,
      stdout: execFileSync(command, args, { encoding: "utf8", stdio: "pipe" }),
    };
  } catch (error) {
    return {
      ok: false,
      stdout: "",
      error: [error.stdout, error.stderr, error.message]
        .filter(Boolean)
        .join("\n")
        .split("\n")[0],
    };
  }
}

async function runHttpChecks(origin) {
  /** @type {HttpCheckResult[]} */
  const results = [];
  const get = async (path, init) => {
    const url = new URL(path, origin).toString();
    return fetch(url, { redirect: "manual", ...init });
  };

  try {
    const root = await get("/");
    results.push({
      id: "GET /",
      ok: root.status === 200,
      detail: `status ${root.status}`,
    });
    results.push(...checkSecurityHeaders(root));
  } catch (error) {
    results.push({ id: "GET /", ok: false, detail: `request failed: ${error.message}` });
  }

  for (const path of ["/privacy", "/terms", "/manifest.webmanifest"]) {
    try {
      const response = await get(path);
      results.push({
        id: `GET ${path}`,
        ok: response.status === 200,
        detail: `status ${response.status}`,
      });
    } catch (error) {
      results.push({ id: `GET ${path}`, ok: false, detail: `request failed: ${error.message}` });
    }
  }

  // An unauthenticated app route must not render; it should bounce to landing.
  try {
    const feed = await get("/feed");
    const redirected = feed.status >= 300 && feed.status < 400;
    results.push({
      id: "GET /feed unauthenticated",
      ok: redirected || feed.status === 401 || feed.status === 403,
      detail: `status ${feed.status}${redirected ? " (redirect)" : ""}`,
    });
  } catch (error) {
    results.push({
      id: "GET /feed unauthenticated",
      ok: false,
      detail: `request failed: ${error.message}`,
    });
  }

  return results;
}

function formatPlane(label, plane) {
  const lines = [`\n## ${label}`];
  lines.push(`  present & required: ${plane.satisfied.filter((r) => r.required).length}`);
  if (plane.missingRequired.length > 0) {
    lines.push(`  MISSING (required): ${plane.missingRequired.length}`);
    for (const r of plane.missingRequired) lines.push(`    ✗ ${r.name} — ${r.why}`);
  } else {
    lines.push("  MISSING (required): none");
  }
  if (plane.missingOptional.length > 0) {
    lines.push(`  absent (optional): ${plane.missingOptional.map((r) => r.name).join(", ")}`);
  }
  if (plane.unknown.length > 0) {
    lines.push(`  set but not in the catalogue: ${plane.unknown.join(", ")}`);
  }
  return lines.join("\n");
}

async function main() {
  const args = process.argv.slice(2);
  const wantHttp = args.includes("--http");
  const wantJson = args.includes("--json");
  const originArg = args.find((a) => a.startsWith("--origin="));
  const origin =
    originArg?.slice("--origin=".length) ??
    process.env.BETA_READINESS_ORIGIN ??
    "https://replyai-three.vercel.app";

  const vercelRaw = capture("npx", ["vercel", "env", "ls"]);
  const convexRaw = capture("npx", ["convex", "env", "list", "--prod"]);

  const gatherErrors = [];
  if (!vercelRaw.ok) gatherErrors.push(`vercel env ls failed: ${vercelRaw.error}`);
  if (!convexRaw.ok) gatherErrors.push(`convex env list --prod failed: ${convexRaw.error}`);

  const vercelNames = parseVercelEnvNames(vercelRaw.stdout);
  const convexNames = parseConvexEnvNames(convexRaw.stdout);
  const http = wantHttp ? await runHttpChecks(origin) : [];

  const report = evaluateReadiness({ vercel: vercelNames, convex: convexNames, http });

  if (wantJson) {
    console.log(
      JSON.stringify(
        {
          ok: report.ok && gatherErrors.length === 0,
          gatherErrors,
          vercel: {
            missingRequired: report.vercel.missingRequired.map((r) => r.name),
            missingOptional: report.vercel.missingOptional.map((r) => r.name),
          },
          convex: {
            missingRequired: report.convex.missingRequired.map((r) => r.name),
            missingOptional: report.convex.missingOptional.map((r) => r.name),
          },
          http: report.http,
        },
        null,
        2,
      ),
    );
  } else {
    console.log("WP40 beta readiness — names and presence only, no values.");
    for (const err of gatherErrors) console.log(`  ! ${err}`);
    console.log(formatPlane("Vercel (Next.js plane)", report.vercel));
    console.log(formatPlane("Convex production", report.convex));
    if (wantHttp) {
      console.log(`\n## Production HTTP (${origin})`);
      for (const check of report.http) {
        console.log(`  ${check.ok ? "✓" : "✗"} ${check.id} — ${check.detail}`);
      }
    } else {
      console.log("\n## Production HTTP\n  skipped (pass --http to run)");
    }
    console.log(
      `\nResult: ${report.ok && gatherErrors.length === 0 ? "READY" : "NOT READY"}`,
    );
  }

  if (!report.ok || gatherErrors.length > 0) process.exit(1);
}

const invokedDirectly =
  process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href;
if (invokedDirectly) {
  await main();
}
