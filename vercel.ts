// Every production build also deploys the current convex/ functions to the
// project's production Convex deployment, and Convex injects the fresh prod
// deployment URL as NEXT_PUBLIC_CONVEX_URL for the build — no manually-set
// Convex URL env var needed on Vercel. Requires CONVEX_DEPLOY_KEY set in the
// Vercel Production environment (see docs/production-deployment.md).
export const config = {
  framework: "nextjs",
  buildCommand:
    "npx convex deploy --cmd 'npm run build' --cmd-url-env-var-name NEXT_PUBLIC_CONVEX_URL",
};
