"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

/**
 * Catches errors thrown while rendering the root layout itself (App Router
 * convention — this replaces <RootLayout> entirely when it fires, hence the
 * full <html>/<body>). Sentry.captureException no-ops when no DSN is
 * configured (see src/instrumentation-client.ts).
 */
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en" className="dark">
      <body className="flex min-h-screen items-center justify-center bg-black font-sans text-[#fafafa] antialiased">
        <div className="max-w-md space-y-2 px-6 text-center">
          <h1 className="text-lg font-semibold">Something went wrong</h1>
          <p className="text-sm text-[#a1a1aa]">
            The team has been notified. Try refreshing the page.
          </p>
        </div>
      </body>
    </html>
  );
}
