#!/usr/bin/env node
// Vercel build entry point. `vercel.ts` must declare a static buildCommand,
// so the per-environment decision is made here at build time.
//
// Production builds deploy the current convex/ functions to the production
// Convex deployment first, and Convex injects the fresh deployment URL as
// NEXT_PUBLIC_CONVEX_URL for the build — no manually-set Convex URL needed.
//
// Preview builds must NOT run that against a *production* deploy key: Convex
// hard-fails with "Detected a non-production build environment and
// CONVEX_DEPLOY_KEY for a production Convex deployment", which failed every
// preview deployment on every branch. Two supported preview modes:
//
//   1. A Convex *preview* deploy key (prefix "preview:") — build a per-branch
//      Convex preview deployment.
//   2. No preview key — build the Next.js app only, against the
//      NEXT_PUBLIC_CONVEX_URL configured for the Preview environment.
//
// Mode 2 means previews talk to whatever deployment that URL points at, so a
// preview deploy key (mode 1) is the safer end state.
// See docs/production-deployment.md.

import { spawn } from "node:child_process";

/**
 * @param {{ VERCEL_ENV?: string, CONVEX_DEPLOY_KEY?: string, VERCEL_GIT_COMMIT_REF?: string }} env
 * @returns {{ command: string, args: string[], mode: string }}
 */
export function resolveBuild(env) {
  const convexDeploy = [
    "convex",
    "deploy",
    "--cmd",
    "npm run build",
    "--cmd-url-env-var-name",
    "NEXT_PUBLIC_CONVEX_URL",
  ];

  if (env.VERCEL_ENV === "production") {
    return { command: "npx", args: convexDeploy, mode: "production-convex-deploy" };
  }

  if ((env.CONVEX_DEPLOY_KEY ?? "").startsWith("preview:")) {
    // Convex names the preview deployment after the branch being built.
    // Fall back to a stable name when the ref is unset, since
    // --preview-create requires a non-empty value.
    const name = (env.VERCEL_GIT_COMMIT_REF ?? "").trim() || "preview";
    return {
      command: "npx",
      args: [...convexDeploy, "--preview-create", name],
      mode: "preview-convex-deploy",
    };
  }

  return { command: "npm", args: ["run", "build"], mode: "next-build-only" };
}

const invokedDirectly =
  process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href;

if (invokedDirectly) {
  const { command, args, mode } = resolveBuild(process.env);
  console.log(`[vercel-build] mode=${mode} → ${command} ${args.join(" ")}`);
  const child = spawn(command, args, { stdio: "inherit" });
  child.on("exit", (code, signal) => {
    if (signal) process.kill(process.pid, signal);
    else process.exit(code ?? 1);
  });
  child.on("error", (error) => {
    console.error(`[vercel-build] failed to start ${command}: ${error.message}`);
    process.exit(1);
  });
}
