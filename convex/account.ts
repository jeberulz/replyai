import { v } from "convex/values";
import {
  ACCOUNT_USER_TABLES,
  buildAccountInventory,
  type AccountTable,
} from "../shared/accountData";
import type { Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { query } from "./_generated/server";
import { requireUser } from "./helpers";

type AccountCounts = Record<AccountTable, number>;

async function countByUser(
  ctx: QueryCtx,
  table: (typeof ACCOUNT_USER_TABLES)[number]["table"],
  userId: Id<"users">
): Promise<number> {
  let count = 0;

  switch (table) {
    case "sessions":
      for await (const _row of ctx.db
        .query("sessions")
        .withIndex("by_user", (q) => q.eq("userId", userId))) {
        count += 1;
      }
      return count;
    case "xTokens":
      for await (const _row of ctx.db
        .query("xTokens")
        .withIndex("by_user", (q) => q.eq("userId", userId))) {
        count += 1;
      }
      return count;
    case "scannerSettings":
      for await (const _row of ctx.db
        .query("scannerSettings")
        .withIndex("by_user", (q) => q.eq("userId", userId))) {
        count += 1;
      }
      return count;
    case "usage":
      for await (const _row of ctx.db
        .query("usage")
        .withIndex("by_user_month", (q) => q.eq("userId", userId))) {
        count += 1;
      }
      return count;
    case "opportunities":
      for await (const _row of ctx.db
        .query("opportunities")
        .withIndex("by_user", (q) => q.eq("userId", userId))) {
        count += 1;
      }
      return count;
    case "savedDrafts":
      for await (const _row of ctx.db
        .query("savedDrafts")
        .withIndex("by_user", (q) => q.eq("userId", userId))) {
        count += 1;
      }
      return count;
    case "generatedReplies":
      for await (const _row of ctx.db
        .query("generatedReplies")
        .withIndex("by_user", (q) => q.eq("userId", userId))) {
        count += 1;
      }
      return count;
    case "modelEvals":
      for await (const _row of ctx.db
        .query("modelEvals")
        .withIndex("by_user", (q) => q.eq("userId", userId))) {
        count += 1;
      }
      return count;
    case "tweetAnalyses":
      for await (const _row of ctx.db
        .query("tweetAnalyses")
        .withIndex("by_user", (q) => q.eq("userId", userId))) {
        count += 1;
      }
      return count;
    case "voiceProfiles":
      for await (const _row of ctx.db
        .query("voiceProfiles")
        .withIndex("by_user", (q) => q.eq("userId", userId))) {
        count += 1;
      }
      return count;
    case "researchProfiles":
      for await (const _row of ctx.db
        .query("researchProfiles")
        .withIndex("by_user", (q) => q.eq("userId", userId))) {
        count += 1;
      }
      return count;
    case "researchRuns":
      for await (const _row of ctx.db
        .query("researchRuns")
        .withIndex("by_user", (q) => q.eq("userId", userId))) {
        count += 1;
      }
      return count;
    case "projects":
      for await (const _row of ctx.db
        .query("projects")
        .withIndex("by_user", (q) => q.eq("userId", userId))) {
        count += 1;
      }
      return count;
  }
}

export const inventory = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const user = await requireUser(ctx, sessionToken);
    const counts = {} as AccountCounts;

    for (const descriptor of ACCOUNT_USER_TABLES) {
      counts[descriptor.table] = await countByUser(
        ctx,
        descriptor.table,
        user._id
      );
    }
    counts.users = 1;

    return buildAccountInventory({
      userId: user._id,
      generatedAt: new Date().toISOString(),
      counts,
    });
  },
});
