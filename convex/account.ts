import { v } from "convex/values";
import {
  ACCOUNT_DELETION_BATCH_SIZE,
  ACCOUNT_USER_TABLES,
  buildAccountInventory,
  buildAccountExportPayload,
  type AccountRowsByTable,
  type AccountTable,
} from "../shared/accountData";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { internalMutation, mutation, query } from "./_generated/server";
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

async function listByUser(
  ctx: QueryCtx,
  table: (typeof ACCOUNT_USER_TABLES)[number]["table"],
  userId: Id<"users">
): Promise<Record<string, unknown>[]> {
  const rows: Record<string, unknown>[] = [];

  switch (table) {
    case "sessions":
      for await (const row of ctx.db
        .query("sessions")
        .withIndex("by_user", (q) => q.eq("userId", userId))) {
        rows.push(row as unknown as Record<string, unknown>);
      }
      return rows;
    case "xTokens":
      for await (const row of ctx.db
        .query("xTokens")
        .withIndex("by_user", (q) => q.eq("userId", userId))) {
        rows.push(row as unknown as Record<string, unknown>);
      }
      return rows;
    case "scannerSettings":
      for await (const row of ctx.db
        .query("scannerSettings")
        .withIndex("by_user", (q) => q.eq("userId", userId))) {
        rows.push(row as unknown as Record<string, unknown>);
      }
      return rows;
    case "usage":
      for await (const row of ctx.db
        .query("usage")
        .withIndex("by_user_month", (q) => q.eq("userId", userId))) {
        rows.push(row as unknown as Record<string, unknown>);
      }
      return rows;
    case "opportunities":
      for await (const row of ctx.db
        .query("opportunities")
        .withIndex("by_user", (q) => q.eq("userId", userId))) {
        rows.push(row as unknown as Record<string, unknown>);
      }
      return rows;
    case "savedDrafts":
      for await (const row of ctx.db
        .query("savedDrafts")
        .withIndex("by_user", (q) => q.eq("userId", userId))) {
        rows.push(row as unknown as Record<string, unknown>);
      }
      return rows;
    case "generatedReplies":
      for await (const row of ctx.db
        .query("generatedReplies")
        .withIndex("by_user", (q) => q.eq("userId", userId))) {
        rows.push(row as unknown as Record<string, unknown>);
      }
      return rows;
    case "modelEvals":
      for await (const row of ctx.db
        .query("modelEvals")
        .withIndex("by_user", (q) => q.eq("userId", userId))) {
        rows.push(row as unknown as Record<string, unknown>);
      }
      return rows;
    case "tweetAnalyses":
      for await (const row of ctx.db
        .query("tweetAnalyses")
        .withIndex("by_user", (q) => q.eq("userId", userId))) {
        rows.push(row as unknown as Record<string, unknown>);
      }
      return rows;
    case "voiceProfiles":
      for await (const row of ctx.db
        .query("voiceProfiles")
        .withIndex("by_user", (q) => q.eq("userId", userId))) {
        rows.push(row as unknown as Record<string, unknown>);
      }
      return rows;
    case "researchProfiles":
      for await (const row of ctx.db
        .query("researchProfiles")
        .withIndex("by_user", (q) => q.eq("userId", userId))) {
        rows.push(row as unknown as Record<string, unknown>);
      }
      return rows;
    case "researchRuns":
      for await (const row of ctx.db
        .query("researchRuns")
        .withIndex("by_user", (q) => q.eq("userId", userId))) {
        rows.push(row as unknown as Record<string, unknown>);
      }
      return rows;
    case "projects":
      for await (const row of ctx.db
        .query("projects")
        .withIndex("by_user", (q) => q.eq("userId", userId))) {
        rows.push(row as unknown as Record<string, unknown>);
      }
      return rows;
  }
}

async function takeDeletionBatch(
  ctx: MutationCtx,
  table: (typeof ACCOUNT_USER_TABLES)[number]["table"],
  userId: Id<"users">
): Promise<Id<AccountTable>[]> {
  switch (table) {
    case "sessions":
      return (
        await ctx.db
          .query("sessions")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .take(ACCOUNT_DELETION_BATCH_SIZE)
      ).map((row) => row._id);
    case "xTokens":
      return (
        await ctx.db
          .query("xTokens")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .take(ACCOUNT_DELETION_BATCH_SIZE)
      ).map((row) => row._id);
    case "scannerSettings":
      return (
        await ctx.db
          .query("scannerSettings")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .take(ACCOUNT_DELETION_BATCH_SIZE)
      ).map((row) => row._id);
    case "usage":
      return (
        await ctx.db
          .query("usage")
          .withIndex("by_user_month", (q) => q.eq("userId", userId))
          .take(ACCOUNT_DELETION_BATCH_SIZE)
      ).map((row) => row._id);
    case "opportunities":
      return (
        await ctx.db
          .query("opportunities")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .take(ACCOUNT_DELETION_BATCH_SIZE)
      ).map((row) => row._id);
    case "savedDrafts":
      return (
        await ctx.db
          .query("savedDrafts")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .take(ACCOUNT_DELETION_BATCH_SIZE)
      ).map((row) => row._id);
    case "generatedReplies":
      return (
        await ctx.db
          .query("generatedReplies")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .take(ACCOUNT_DELETION_BATCH_SIZE)
      ).map((row) => row._id);
    case "modelEvals":
      return (
        await ctx.db
          .query("modelEvals")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .take(ACCOUNT_DELETION_BATCH_SIZE)
      ).map((row) => row._id);
    case "tweetAnalyses":
      return (
        await ctx.db
          .query("tweetAnalyses")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .take(ACCOUNT_DELETION_BATCH_SIZE)
      ).map((row) => row._id);
    case "voiceProfiles":
      return (
        await ctx.db
          .query("voiceProfiles")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .take(ACCOUNT_DELETION_BATCH_SIZE)
      ).map((row) => row._id);
    case "researchProfiles":
      return (
        await ctx.db
          .query("researchProfiles")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .take(ACCOUNT_DELETION_BATCH_SIZE)
      ).map((row) => row._id);
    case "researchRuns":
      return (
        await ctx.db
          .query("researchRuns")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .take(ACCOUNT_DELETION_BATCH_SIZE)
      ).map((row) => row._id);
    case "projects":
      return (
        await ctx.db
          .query("projects")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .take(ACCOUNT_DELETION_BATCH_SIZE)
      ).map((row) => row._id);
  }
}

async function runDeletionBatch(ctx: MutationCtx, userId: Id<"users">) {
  for (const descriptor of ACCOUNT_USER_TABLES) {
    const ids = await takeDeletionBatch(ctx, descriptor.table, userId);
    if (ids.length > 0) {
      for (const id of ids) {
        await ctx.db.delete(id);
      }
      await ctx.scheduler.runAfter(0, internal.account.continueDelete, {
        userId,
      });
      return {
        done: false,
        table: descriptor.table,
        deletedRows: ids.length,
        deletedUser: false,
        scheduledContinuation: true,
      };
    }
  }

  const user = await ctx.db.get(userId);
  if (user) {
    await ctx.db.delete(userId);
    return {
      done: true,
      table: "users" as const,
      deletedRows: 1,
      deletedUser: true,
      scheduledContinuation: false,
    };
  }

  return {
    done: true,
    table: null,
    deletedRows: 0,
    deletedUser: false,
    scheduledContinuation: false,
  };
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

export const exportData = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const user = await requireUser(ctx, sessionToken);
    const rowsByTable: AccountRowsByTable = {
      users: [user as unknown as Record<string, unknown>],
    };

    for (const descriptor of ACCOUNT_USER_TABLES) {
      rowsByTable[descriptor.table] = await listByUser(
        ctx,
        descriptor.table,
        user._id
      );
    }

    return buildAccountExportPayload({
      userId: user._id,
      exportedAt: new Date().toISOString(),
      rowsByTable,
    });
  },
});

export const deleteAccount = mutation({
  args: {
    sessionToken: v.string(),
    confirmationUsername: v.string(),
  },
  handler: async (ctx, { sessionToken, confirmationUsername }) => {
    const user = await requireUser(ctx, sessionToken);
    if (confirmationUsername !== user.username) {
      throw new Error("Account deletion confirmation did not match username");
    }

    const counts = {} as AccountCounts;
    for (const descriptor of ACCOUNT_USER_TABLES) {
      counts[descriptor.table] = await countByUser(
        ctx,
        descriptor.table,
        user._id
      );
    }
    counts.users = 1;

    const inventory = buildAccountInventory({
      userId: user._id,
      generatedAt: new Date().toISOString(),
      counts,
    });
    const deletion = await runDeletionBatch(ctx, user._id);

    return {
      inventory,
      deletion,
      batchSize: ACCOUNT_DELETION_BATCH_SIZE,
    };
  },
});

export const continueDelete = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await runDeletionBatch(ctx, userId);
  },
});
