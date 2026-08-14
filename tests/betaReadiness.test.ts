import { describe, expect, it } from "vitest";

import {
  CONVEX_REQUIREMENTS,
  REQUIRED_SECURITY_HEADERS,
  VERCEL_REQUIREMENTS,
  checkSecurityHeaders,
  evaluatePlane,
  evaluateReadiness,
  parseConvexEnvNames,
  parseVercelEnvNames,
} from "../scripts/beta-readiness.mjs";

type Requirement = { name: string; why: string; required: boolean };

const vercelRequirements = VERCEL_REQUIREMENTS as Requirement[];
const convexRequirements = CONVEX_REQUIREMENTS as Requirement[];

describe("beta readiness parsing", () => {
  it("takes only the name column from `vercel env ls` output", () => {
    const stdout = [
      "Vercel CLI 59.0.0",
      "> Environment Variables found for team/replyai [198ms]",
      "",
      " name                          value               type            environments",
      " CONVEX_DEPLOY_KEY             Hidden              Sensitive       Production, Preview",
      " BETA_ALLOWED_X_HANDLES        eyJ2IjoidjIiLCJj…   Non-sensitive   Preview, Production",
    ].join("\n");

    expect(parseVercelEnvNames(stdout)).toEqual([
      "CONVEX_DEPLOY_KEY",
      "BETA_ALLOWED_X_HANDLES",
    ]);
  });

  it("never returns a value from `convex env list` output", () => {
    const stdout = [
      "ANTHROPIC_API_KEY=sk-ant-super-secret-value",
      "AI_SPEND_KILL_SWITCH=false",
      "VAPID_SUBJECT=mailto:someone@example.com",
    ].join("\n");

    const names = parseConvexEnvNames(stdout);
    expect(names).toEqual([
      "ANTHROPIC_API_KEY",
      "AI_SPEND_KILL_SWITCH",
      "VAPID_SUBJECT",
    ]);
    for (const name of names) {
      expect(name).not.toContain("=");
      expect(name).not.toContain("sk-ant");
      expect(name).not.toContain("@");
    }
  });

  it("handles values that themselves contain '='", () => {
    expect(parseConvexEnvNames("X_TOKEN_ENCRYPTION_KEY=abc==def=")).toEqual([
      "X_TOKEN_ENCRYPTION_KEY",
    ]);
  });

  it("ignores blank and non-variable lines", () => {
    expect(parseConvexEnvNames("\n  \nnot a var line\n")).toEqual([]);
    expect(parseVercelEnvNames("\n> Retrieving project…\n")).toEqual([]);
  });
});

describe("plane evaluation", () => {
  it("separates missing required from missing optional", () => {
    const requirements: Requirement[] = [
      { name: "REQUIRED_ONE", why: "", required: true },
      { name: "REQUIRED_TWO", why: "", required: true },
      { name: "OPTIONAL_ONE", why: "", required: false },
    ];

    const plane = evaluatePlane(requirements, ["REQUIRED_ONE", "EXTRA"]);

    expect(plane.missingRequired.map((r: Requirement) => r.name)).toEqual([
      "REQUIRED_TWO",
    ]);
    expect(plane.missingOptional.map((r: Requirement) => r.name)).toEqual([
      "OPTIONAL_ONE",
    ]);
    expect(plane.unknown).toEqual(["EXTRA"]);
  });

  it("is not ready when a required name is absent in either plane", () => {
    const allVercel = vercelRequirements.map((r) => r.name);
    const allConvex = convexRequirements.map((r) => r.name);

    expect(evaluateReadiness({ vercel: allVercel, convex: allConvex }).ok).toBe(
      true,
    );
    expect(
      evaluateReadiness({ vercel: allVercel.slice(1), convex: allConvex }).ok,
    ).toBe(false);
    expect(
      evaluateReadiness({ vercel: allVercel, convex: allConvex.slice(1) }).ok,
    ).toBe(false);
  });

  it("is not ready when an HTTP check fails", () => {
    const allVercel = vercelRequirements.map((r) => r.name);
    const allConvex = convexRequirements.map((r) => r.name);

    const report = evaluateReadiness({
      vercel: allVercel,
      convex: allConvex,
      http: [
        { id: "GET /", ok: true, detail: "status 200" },
        { id: "GET /privacy", ok: false, detail: "status 404" },
      ],
    });

    expect(report.ok).toBe(false);
    expect(report.httpFailures).toHaveLength(1);
  });
});

describe("requirement catalogue", () => {
  it("requires the spend controls that must fail closed", () => {
    const required = new Set(
      convexRequirements.filter((r) => r.required).map((r) => r.name),
    );
    for (const name of [
      "AI_SPEND_LIMITS_REQUIRED",
      "AI_SPEND_KILL_SWITCH",
      "AI_ANALYSIS_HOURLY_LIMIT",
      "AI_GENERATION_HOURLY_LIMIT",
      "X_READ_LIMITS_REQUIRED",
      "X_READ_KILL_SWITCH",
      "X_READ_USER_DAILY_LIMIT",
      "X_READ_GLOBAL_DAILY_LIMIT",
    ]) {
      expect(required).toContain(name);
    }
  });

  it("does not require Stripe for the no-card design-partner cohort", () => {
    const names = [...vercelRequirements, ...convexRequirements]
      .filter((r) => r.required)
      .map((r) => r.name);
    expect(names.filter((n) => n.startsWith("STRIPE_"))).toEqual([]);
  });

  it("keeps every catalogue entry unique per plane", () => {
    for (const requirements of [vercelRequirements, convexRequirements]) {
      const names = requirements.map((r) => r.name);
      expect(new Set(names).size).toBe(names.length);
    }
  });
});

describe("security headers", () => {
  it("flags an absent header and passes a present one", () => {
    const response = new Response(null, {
      headers: { "x-content-type-options": "nosniff" },
    });

    const results = checkSecurityHeaders(response);
    expect(results).toHaveLength(REQUIRED_SECURITY_HEADERS.length);

    const byId = (id: string) =>
      results.find((r: { id: string }) => r.id === id);

    expect(byId("header:x-content-type-options")?.ok).toBe(true);
    expect(byId("header:content-security-policy")?.ok).toBe(false);
  });
});

describe("vercel table parsing edge cases", () => {
  it("keeps lowercase variable names that really exist in this project", () => {
    const stdout = [
      "Vercel CLI 59.0.0 (Node.js 22.23.1)",
      "Retrieving project…",
      " bearer_token   Hidden   Sensitive   Production, Preview   35d ago",
    ].join("\n");
    expect(parseVercelEnvNames(stdout)).toEqual(["bearer_token"]);
  });

  it("does not mistake CLI banner lines for variables", () => {
    const stdout = ["Vercel CLI 59.0.0", "Retrieving project…", ""].join("\n");
    expect(parseVercelEnvNames(stdout)).toEqual([]);
  });
});
