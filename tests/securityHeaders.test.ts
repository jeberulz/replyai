import { describe, expect, it } from "vitest";
import nextConfig, {
  contentSecurityPolicy,
  securityHeaders,
} from "../next.config";

describe("security headers", () => {
  it("defines the launch hardening headers", () => {
    const headers = new Map(securityHeaders.map((h) => [h.key, h.value]));

    expect(headers.get("Content-Security-Policy")).toBe(contentSecurityPolicy);
    expect(headers.get("Strict-Transport-Security")).toContain("max-age=");
    expect(headers.get("X-Frame-Options")).toBe("DENY");
    expect(headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(headers.get("Permissions-Policy")).toContain("camera=()");
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
  });

  it("allows only expected script/connect origins in CSP", () => {
    expect(contentSecurityPolicy).toContain("script-src 'self' 'unsafe-inline'");
    expect(contentSecurityPolicy).toContain("https://*.convex.cloud");
    expect(contentSecurityPolicy).toContain("wss://*.convex.cloud");
    expect(contentSecurityPolicy).toContain("https://api.x.com");
    expect(contentSecurityPolicy).toContain("frame-ancestors 'none'");
  });

  it("wires headers through next.config", async () => {
    const headers = await nextConfig.headers?.();

    expect(headers).toEqual([
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/push-sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Service-Worker-Allowed",
            value: "/",
          },
        ],
      },
      {
        source: "/manifest.webmanifest",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=3600",
          },
        ],
      },
    ]);
  });
});
