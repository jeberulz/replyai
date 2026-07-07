import { afterEach, describe, expect, it, vi } from "vitest";

// The real src/lib/analytics/server.ts imports "server-only", a marker
// package that throws unconditionally outside a bundler that understands
// its "react-server" export condition (Next.js sets this up at build time;
// plain Node/Vitest does not). Stub it so the module under test can be
// imported here exactly as production code imports it.
vi.mock("server-only", () => ({}));

import { FUNNEL_STEPS } from "../src/lib/analytics/events";
import {
  __setAnalyticsDebugSink,
  captureServerException,
  trackServer,
} from "../src/lib/analytics/server";
import {
  initAnalyticsClient,
  identifyClient,
  trackClient,
} from "../src/lib/analytics/client";

describe("analytics event catalog", () => {
  it("orders the funnel steps as documented", () => {
    expect(FUNNEL_STEPS).toEqual([
      "opportunity_surfaced",
      "opportunity_opened",
      "generation_requested",
      "option_selected",
      "draft_saved",
      "published",
    ]);
  });
});

describe("trackServer", () => {
  afterEach(() => {
    __setAnalyticsDebugSink(null);
    delete process.env.POSTHOG_KEY;
  });

  it("no-ops without throwing when POSTHOG_KEY is unset (demo mode)", async () => {
    delete process.env.POSTHOG_KEY;
    await expect(
      trackServer("draft_saved", "user_1", { kind: "reply" })
    ).resolves.toBeUndefined();
  });

  it("routes the exact event name, distinct id, and properties through an injected debug sink", async () => {
    const seen: Array<{ event: string; distinctId: string; properties: unknown }> = [];
    __setAnalyticsDebugSink((event, distinctId, properties) => {
      seen.push({ event, distinctId, properties });
    });

    await trackServer("published", "user_42", {
      draftId: "draft_1",
      kind: "quote",
      publishMode: "url_quote",
      scheduled: false,
      editedBeforeSend: true,
    });

    expect(seen).toHaveLength(1);
    expect(seen[0]).toEqual({
      event: "published",
      distinctId: "user_42",
      properties: {
        draftId: "draft_1",
        kind: "quote",
        publishMode: "url_quote",
        scheduled: false,
        editedBeforeSend: true,
      },
    });
  });

  it("still calls the debug sink when POSTHOG_KEY is unset — the sink is how this is verified without a live key", async () => {
    delete process.env.POSTHOG_KEY;
    const seen: string[] = [];
    __setAnalyticsDebugSink((event) => seen.push(event));

    await trackServer("opportunity_surfaced", "user_1", { count: 3 });

    expect(seen).toEqual(["opportunity_surfaced"]);
  });
});

describe("captureServerException", () => {
  it("never throws, even without a Sentry DSN configured", () => {
    expect(() =>
      captureServerException(new Error("boom"), { action: "test" })
    ).not.toThrow();
  });

  it("accepts non-Error values without throwing", () => {
    expect(() => captureServerException("plain string error")).not.toThrow();
  });
});

describe("client analytics adapter (demo mode — no NEXT_PUBLIC_POSTHOG_KEY)", () => {
  it("initAnalyticsClient no-ops without a public key", () => {
    delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
    expect(() => initAnalyticsClient()).not.toThrow();
  });

  it("trackClient no-ops before/without init rather than throwing", () => {
    expect(() => trackClient("draft_saved", { kind: "reply" })).not.toThrow();
  });

  it("identifyClient no-ops before/without init rather than throwing", () => {
    expect(() => identifyClient("user_1")).not.toThrow();
  });
});
