// Vercel statically analyses this file and rejects computed values in static
// properties — a `buildCommand` built at module scope fails the deployment
// with "Dynamic values found in static properties: buildCommand". So the
// command must be a literal, and the per-environment decision lives inside
// scripts/vercel-build.mjs instead.
//
// See docs/production-deployment.md for what that script chooses and why.
export const config = {
  framework: "nextjs",
  buildCommand: "node scripts/vercel-build.mjs",
};
