// Build command wiring for Vercel + Convex.
//
// Production builds deploy the current convex/ functions to the project's
// production Convex deployment first, and Convex injects the fresh prod
// deployment URL as NEXT_PUBLIC_CONVEX_URL for the build — no manually-set
// Convex URL env var needed. Requires a production CONVEX_DEPLOY_KEY in the
// Vercel Production environment (see docs/production-deployment.md).
//
// Preview builds must NOT run that command against a *production* deploy key:
// Convex hard-fails with "Detected a non-production build environment and
// CONVEX_DEPLOY_KEY for a production Convex deployment", which failed every
// preview deployment on every branch. Two supported preview modes:
//
//   1. A Convex *preview* deploy key is present (keys are prefixed
//      "preview:") — build a per-branch Convex preview deployment.
//   2. No preview key — build the Next.js app only, against the
//      NEXT_PUBLIC_CONVEX_URL configured for the Preview environment.
//
// Mode 2 means preview builds talk to whatever deployment that URL points at,
// so a preview deploy key (mode 1) is the safer end state. See
// docs/production-deployment.md.

const CONVEX_BUILD =
  "npx convex deploy --cmd 'npm run build' --cmd-url-env-var-name NEXT_PUBLIC_CONVEX_URL";

const isProduction = process.env.VERCEL_ENV === "production";
const hasPreviewDeployKey = (process.env.CONVEX_DEPLOY_KEY ?? "").startsWith(
  "preview:",
);

function buildCommand(): string {
  if (isProduction) return CONVEX_BUILD;
  if (hasPreviewDeployKey) {
    // Convex names the preview deployment after the branch being built.
    return `${CONVEX_BUILD} --preview-create "$VERCEL_GIT_COMMIT_REF"`;
  }
  return "npm run build";
}

export const config = {
  framework: "nextjs",
  buildCommand: buildCommand(),
};
