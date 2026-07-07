import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
};

// Source-map upload needs SENTRY_ORG/SENTRY_PROJECT/SENTRY_AUTH_TOKEN, none
// of which exist in this environment — disable it outright so `next build`
// never attempts a network call it can't make. Error/event capture at
// runtime (src/instrumentation.ts, src/instrumentation-client.ts) is
// unaffected by this; it only turns off the build-time upload step.
export default withSentryConfig(nextConfig, {
  silent: true,
  telemetry: false,
  sourcemaps: {
    disable: true,
  },
});
