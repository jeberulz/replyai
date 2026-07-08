import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import {
  authorizes,
  directlyAuthorizes,
  extractTableBlock,
} from "../scripts/security-audit.mjs";

describe("security audit script", () => {
  it("passes on the committed Convex auth/token surface", () => {
    const output = execFileSync(process.execPath, ["scripts/security-audit.mjs"], {
      encoding: "utf8",
    });

    expect(output).toContain("Security audit passed");
    expect(output).toContain("public Convex functions checked");
  }, 15_000);

  it("accepts a public action that delegates auth to an internal query it calls", () => {
    // Mirrors convex/billingNode.ts's createCheckoutSession/createPortalSession:
    // a public action with no `requireUser(` in its own body, authorizing by
    // calling `ctx.runQuery(internal.billing.viewerForSession, ...)`, which
    // itself calls requireUser. A naive same-body string match would flag
    // this as unauthenticated; it must not.
    const viewerForSession = {
      id: "billing.viewerForSession",
      body: "async (ctx, { sessionToken }) => { const user = await requireUser(ctx, sessionToken); return user; }",
      source: "",
    };
    const createCheckoutSession = {
      id: "billingNode.createCheckoutSession",
      body: "async (ctx, { sessionToken }) => { const viewer = await ctx.runQuery(internal.billing.viewerForSession, { sessionToken }); return viewer; }",
      source: "",
    };
    const byId = new Map([
      [viewerForSession.id, viewerForSession],
      [createCheckoutSession.id, createCheckoutSession],
    ]);

    expect(authorizes(createCheckoutSession, byId)).toBe(true);
  });

  it("still rejects a public function whose delegate does not authorize", () => {
    const unauthenticatedHelper = {
      id: "cache.rawGet",
      body: "async (ctx, { key }) => { return await ctx.db.query('cache').first(); }",
      source: "",
    };
    const exposedAction = {
      id: "leaky.exposeCache",
      body: "async (ctx, { key }) => { return await ctx.runQuery(internal.cache.rawGet, { key }); }",
      source: "",
    };
    const byId = new Map([
      [unauthenticatedHelper.id, unauthenticatedHelper],
      [exposedAction.id, exposedAction],
    ]);

    expect(authorizes(exposedAction, byId)).toBe(false);
  });

  it("does not treat a mention of requireUser in a comment as real authorization", () => {
    const commentOnly = {
      id: "leaky.commentedOut",
      body: "async (ctx, { key }) => { // TODO: add requireUser(ctx, sessionToken) before shipping\n return await ctx.db.query('secrets').first(); }",
      source: "",
    };

    expect(directlyAuthorizes(commentOnly)).toBe(false);
  });

  it("still recognizes a real requireUser call sitting next to a comment mentioning it", () => {
    const realCall = {
      id: "safe.fn",
      body: "async (ctx, { sessionToken }) => { // authed\n const user = await requireUser(ctx, sessionToken); return user; }",
      source: "",
    };

    expect(directlyAuthorizes(realCall)).toBe(true);
  });

  it("scopes a table field check to that table, not a later table in the same schema", () => {
    const schema = `
      export default defineSchema({
        sessions: defineTable({
          userId: v.id("users"),
        }).index("by_user", ["userId"]),
        xTokens: defineTable({
          userId: v.id("users"),
          encryptedAccessToken: v.optional(v.string()),
        }).index("by_user", ["userId"]),
      });
    `;

    const sessionsBlock = extractTableBlock(schema, "sessions");
    expect(sessionsBlock).not.toContain("encryptedAccessToken");
  });

  it("does not infinite-loop on a reference cycle with no real authorization", () => {
    const a = {
      id: "cyclic.a",
      body: "async (ctx) => { return await ctx.runQuery(internal.cyclic.b, {}); }",
      source: "",
    };
    const b = {
      id: "cyclic.b",
      body: "async (ctx) => { return await ctx.runQuery(internal.cyclic.a, {}); }",
      source: "",
    };
    const byId = new Map([
      [a.id, a],
      [b.id, b],
    ]);

    expect(authorizes(a, byId)).toBe(false);
  });
});
