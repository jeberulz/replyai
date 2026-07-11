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
      for await (const row of ctx.db
        .query("sessions")
        .withIndex("by_user", (q) => q.eq("userId", userId))) {
        if (row._id) count += 1;
      }
      return count;
    case "xTokens":
      for await (const row of ctx.db
        .query("xTokens")
        .withIndex("by_user", (q) => q.eq("userId", userId))) {
        if (row._id) count += 1;
      }
      return count;
    case "accountIdentities":
      for await (const row of ctx.db
        .query("accountIdentities")
        .withIndex("by_user", (q) => q.eq("userId", userId))) {
        if (row._id) count += 1;
      }
      return count;
    case "scannerSettings":
      for await (const row of ctx.db
        .query("scannerSettings")
        .withIndex("by_user", (q) => q.eq("userId", userId))) {
        if (row._id) count += 1;
      }
      return count;
    case "pushSubscriptions":
      for await (const row of ctx.db
        .query("pushSubscriptions")
        .withIndex("by_user", (q) => q.eq("userId", userId))) {
        if (row._id) count += 1;
      }
      return count;
    case "notificationSettings":
      for await (const row of ctx.db
        .query("notificationSettings")
        .withIndex("by_user", (q) => q.eq("userId", userId))) {
        if (row._id) count += 1;
      }
      return count;
    case "notificationDailyCounts":
      for await (const row of ctx.db
        .query("notificationDailyCounts")
        .withIndex("by_user_date", (q) => q.eq("userId", userId))) {
        if (row._id) count += 1;
      }
      return count;
    case "notificationAlerts":
      for await (const row of ctx.db
        .query("notificationAlerts")
        .withIndex("by_user", (q) => q.eq("userId", userId))) {
        if (row._id) count += 1;
      }
      return count;
    case "briefingSettings":
      for await (const row of ctx.db
        .query("briefingSettings")
        .withIndex("by_user", (q) => q.eq("userId", userId))) {
        if (row._id) count += 1;
      }
      return count;
    case "briefingRuns":
      for await (const row of ctx.db
        .query("briefingRuns")
        .withIndex("by_user", (q) => q.eq("userId", userId))) {
        if (row._id) count += 1;
      }
      return count;
    case "composeRuns":
      for await (const row of ctx.db
        .query("composeRuns")
        .withIndex("by_user", (q) => q.eq("userId", userId))) {
        if (row._id) count += 1;
      }
      return count;
    case "authors":
      for await (const row of ctx.db
        .query("authors")
        .withIndex("by_user", (q) => q.eq("userId", userId))) {
        if (row._id) count += 1;
      }
      return count;
    case "usage":
      for await (const row of ctx.db
        .query("usage")
        .withIndex("by_user_month", (q) => q.eq("userId", userId))) {
        if (row._id) count += 1;
      }
      return count;
    case "aiSpendLedger":
      for await (const row of ctx.db
        .query("aiSpendLedger")
        .withIndex("by_user", (q) => q.eq("userId", userId))) {
        if (row._id) count += 1;
      }
      return count;
    case "shadowGrokDiscoveryRuns":
      for await (const row of ctx.db
        .query("shadowGrokDiscoveryRuns")
        .withIndex("by_user", (q) => q.eq("userId", userId))) {
        if (row._id) count += 1;
      }
      return count;
    case "xReadLedger":
      for await (const row of ctx.db
        .query("xReadLedger")
        .withIndex("by_user", (q) => q.eq("userId", userId))) {
        if (row._id) count += 1;
      }
      return count;
    case "opportunities":
      for await (const row of ctx.db
        .query("opportunities")
        .withIndex("by_user", (q) => q.eq("userId", userId))) {
        if (row._id) count += 1;
      }
      return count;
    case "savedDrafts":
      for await (const row of ctx.db
        .query("savedDrafts")
        .withIndex("by_user", (q) => q.eq("userId", userId))) {
        if (row._id) count += 1;
      }
      return count;
    case "variantGroups":
      for await (const row of ctx.db
        .query("variantGroups")
        .withIndex("by_user", (q) => q.eq("userId", userId))) {
        if (row._id) count += 1;
      }
      return count;
    case "generatedReplies":
      for await (const row of ctx.db
        .query("generatedReplies")
        .withIndex("by_user", (q) => q.eq("userId", userId))) {
        if (row._id) count += 1;
      }
      return count;
    case "evalJudgments":
      for await (const row of ctx.db
        .query("evalJudgments")
        .withIndex("by_user", (q) => q.eq("userId", userId))) {
        if (row._id) count += 1;
      }
      return count;
    case "evalOutputs":
      for await (const row of ctx.db
        .query("evalOutputs")
        .withIndex("by_user", (q) => q.eq("userId", userId))) {
        if (row._id) count += 1;
      }
      return count;
    case "evalRuns":
      for await (const row of ctx.db
        .query("evalRuns")
        .withIndex("by_user", (q) => q.eq("userId", userId))) {
        if (row._id) count += 1;
      }
      return count;
    case "evalDecisions":
      for await (const row of ctx.db
        .query("evalDecisions")
        .withIndex("by_user", (q) => q.eq("userId", userId))) {
        if (row._id) count += 1;
      }
      return count;
    case "evalExperiments":
      for await (const row of ctx.db
        .query("evalExperiments")
        .withIndex("by_user", (q) => q.eq("userId", userId))) {
        if (row._id) count += 1;
      }
      return count;
    case "evalCases":
      for await (const row of ctx.db
        .query("evalCases")
        .withIndex("by_user", (q) => q.eq("userId", userId))) {
        if (row._id) count += 1;
      }
      return count;
    case "evalDatasets":
      for await (const row of ctx.db
        .query("evalDatasets")
        .withIndex("by_user", (q) => q.eq("userId", userId))) {
        if (row._id) count += 1;
      }
      return count;
    case "modelEvals":
      for await (const row of ctx.db
        .query("modelEvals")
        .withIndex("by_user", (q) => q.eq("userId", userId))) {
        if (row._id) count += 1;
      }
      return count;
    case "tweetAnalyses":
      for await (const row of ctx.db
        .query("tweetAnalyses")
        .withIndex("by_user", (q) => q.eq("userId", userId))) {
        if (row._id) count += 1;
      }
      return count;
    case "voiceDriftRuns":
      for await (const row of ctx.db
        .query("voiceDriftRuns")
        .withIndex("by_user", (q) => q.eq("userId", userId))) {
        if (row._id) count += 1;
      }
      return count;
    case "onboardingConciergeRuns":
      for await (const row of ctx.db
        .query("onboardingConciergeRuns")
        .withIndex("by_user", (q) => q.eq("userId", userId))) {
        if (row._id) count += 1;
      }
      return count;
    case "voiceProfiles":
      for await (const row of ctx.db
        .query("voiceProfiles")
        .withIndex("by_user", (q) => q.eq("userId", userId))) {
        if (row._id) count += 1;
      }
      return count;
    case "researchProfiles":
      for await (const row of ctx.db
        .query("researchProfiles")
        .withIndex("by_user", (q) => q.eq("userId", userId))) {
        if (row._id) count += 1;
      }
      return count;
    case "researchRuns":
      for await (const row of ctx.db
        .query("researchRuns")
        .withIndex("by_user", (q) => q.eq("userId", userId))) {
        if (row._id) count += 1;
      }
      return count;
    case "projects":
      for await (const row of ctx.db
        .query("projects")
        .withIndex("by_user", (q) => q.eq("userId", userId))) {
        if (row._id) count += 1;
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
    case "accountIdentities":
      for await (const row of ctx.db
        .query("accountIdentities")
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
    case "pushSubscriptions":
      for await (const row of ctx.db
        .query("pushSubscriptions")
        .withIndex("by_user", (q) => q.eq("userId", userId))) {
        rows.push(row as unknown as Record<string, unknown>);
      }
      return rows;
    case "notificationSettings":
      for await (const row of ctx.db
        .query("notificationSettings")
        .withIndex("by_user", (q) => q.eq("userId", userId))) {
        rows.push(row as unknown as Record<string, unknown>);
      }
      return rows;
    case "notificationDailyCounts":
      for await (const row of ctx.db
        .query("notificationDailyCounts")
        .withIndex("by_user_date", (q) => q.eq("userId", userId))) {
        rows.push(row as unknown as Record<string, unknown>);
      }
      return rows;
    case "notificationAlerts":
      for await (const row of ctx.db
        .query("notificationAlerts")
        .withIndex("by_user", (q) => q.eq("userId", userId))) {
        rows.push(row as unknown as Record<string, unknown>);
      }
      return rows;
    case "briefingSettings":
      for await (const row of ctx.db
        .query("briefingSettings")
        .withIndex("by_user", (q) => q.eq("userId", userId))) {
        rows.push(row as unknown as Record<string, unknown>);
      }
      return rows;
    case "briefingRuns":
      for await (const row of ctx.db
        .query("briefingRuns")
        .withIndex("by_user", (q) => q.eq("userId", userId))) {
        rows.push(row as unknown as Record<string, unknown>);
      }
      return rows;
    case "composeRuns":
      for await (const row of ctx.db
        .query("composeRuns")
        .withIndex("by_user", (q) => q.eq("userId", userId))) {
        rows.push(row as unknown as Record<string, unknown>);
      }
      return rows;
    case "authors":
      for await (const row of ctx.db
        .query("authors")
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
    case "aiSpendLedger":
      for await (const row of ctx.db
        .query("aiSpendLedger")
        .withIndex("by_user", (q) => q.eq("userId", userId))) {
        rows.push(row as unknown as Record<string, unknown>);
      }
      return rows;
    case "shadowGrokDiscoveryRuns":
      for await (const row of ctx.db
        .query("shadowGrokDiscoveryRuns")
        .withIndex("by_user", (q) => q.eq("userId", userId))) {
        rows.push(row as unknown as Record<string, unknown>);
      }
      return rows;
    case "xReadLedger":
      for await (const row of ctx.db
        .query("xReadLedger")
        .withIndex("by_user", (q) => q.eq("userId", userId))) {
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
    case "variantGroups":
      for await (const row of ctx.db
        .query("variantGroups")
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
    case "evalJudgments":
      for await (const row of ctx.db
        .query("evalJudgments")
        .withIndex("by_user", (q) => q.eq("userId", userId))) {
        rows.push(row as unknown as Record<string, unknown>);
      }
      return rows;
    case "evalOutputs":
      for await (const row of ctx.db
        .query("evalOutputs")
        .withIndex("by_user", (q) => q.eq("userId", userId))) {
        rows.push(row as unknown as Record<string, unknown>);
      }
      return rows;
    case "evalRuns":
      for await (const row of ctx.db
        .query("evalRuns")
        .withIndex("by_user", (q) => q.eq("userId", userId))) {
        rows.push(row as unknown as Record<string, unknown>);
      }
      return rows;
    case "evalDecisions":
      for await (const row of ctx.db
        .query("evalDecisions")
        .withIndex("by_user", (q) => q.eq("userId", userId))) {
        rows.push(row as unknown as Record<string, unknown>);
      }
      return rows;
    case "evalExperiments":
      for await (const row of ctx.db
        .query("evalExperiments")
        .withIndex("by_user", (q) => q.eq("userId", userId))) {
        rows.push(row as unknown as Record<string, unknown>);
      }
      return rows;
    case "evalCases":
      for await (const row of ctx.db
        .query("evalCases")
        .withIndex("by_user", (q) => q.eq("userId", userId))) {
        rows.push(row as unknown as Record<string, unknown>);
      }
      return rows;
    case "evalDatasets":
      for await (const row of ctx.db
        .query("evalDatasets")
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
    case "voiceDriftRuns":
      for await (const row of ctx.db
        .query("voiceDriftRuns")
        .withIndex("by_user", (q) => q.eq("userId", userId))) {
        rows.push(row as unknown as Record<string, unknown>);
      }
      return rows;
    case "onboardingConciergeRuns":
      for await (const row of ctx.db
        .query("onboardingConciergeRuns")
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
    case "accountIdentities":
      return (
        await ctx.db
          .query("accountIdentities")
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
    case "pushSubscriptions":
      return (
        await ctx.db
          .query("pushSubscriptions")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .take(ACCOUNT_DELETION_BATCH_SIZE)
      ).map((row) => row._id);
    case "notificationSettings":
      return (
        await ctx.db
          .query("notificationSettings")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .take(ACCOUNT_DELETION_BATCH_SIZE)
      ).map((row) => row._id);
    case "notificationDailyCounts":
      return (
        await ctx.db
          .query("notificationDailyCounts")
          .withIndex("by_user_date", (q) => q.eq("userId", userId))
          .take(ACCOUNT_DELETION_BATCH_SIZE)
      ).map((row) => row._id);
    case "notificationAlerts":
      return (
        await ctx.db
          .query("notificationAlerts")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .take(ACCOUNT_DELETION_BATCH_SIZE)
      ).map((row) => row._id);
    case "briefingSettings":
      return (
        await ctx.db
          .query("briefingSettings")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .take(ACCOUNT_DELETION_BATCH_SIZE)
      ).map((row) => row._id);
    case "briefingRuns":
      return (
        await ctx.db
          .query("briefingRuns")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .take(ACCOUNT_DELETION_BATCH_SIZE)
      ).map((row) => row._id);
    case "composeRuns":
      return (
        await ctx.db
          .query("composeRuns")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .take(ACCOUNT_DELETION_BATCH_SIZE)
      ).map((row) => row._id);
    case "authors":
      return (
        await ctx.db
          .query("authors")
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
    case "aiSpendLedger":
      return (
        await ctx.db
          .query("aiSpendLedger")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .take(ACCOUNT_DELETION_BATCH_SIZE)
      ).map((row) => row._id);
    case "shadowGrokDiscoveryRuns":
      return (
        await ctx.db
          .query("shadowGrokDiscoveryRuns")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .take(ACCOUNT_DELETION_BATCH_SIZE)
      ).map((row) => row._id);
    case "xReadLedger":
      return (
        await ctx.db
          .query("xReadLedger")
          .withIndex("by_user", (q) => q.eq("userId", userId))
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
    case "variantGroups":
      return (
        await ctx.db
          .query("variantGroups")
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
    case "evalJudgments":
      return (
        await ctx.db
          .query("evalJudgments")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .take(ACCOUNT_DELETION_BATCH_SIZE)
      ).map((row) => row._id);
    case "evalOutputs":
      return (
        await ctx.db
          .query("evalOutputs")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .take(ACCOUNT_DELETION_BATCH_SIZE)
      ).map((row) => row._id);
    case "evalRuns":
      return (
        await ctx.db
          .query("evalRuns")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .take(ACCOUNT_DELETION_BATCH_SIZE)
      ).map((row) => row._id);
    case "evalDecisions":
      return (
        await ctx.db
          .query("evalDecisions")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .take(ACCOUNT_DELETION_BATCH_SIZE)
      ).map((row) => row._id);
    case "evalExperiments":
      return (
        await ctx.db
          .query("evalExperiments")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .take(ACCOUNT_DELETION_BATCH_SIZE)
      ).map((row) => row._id);
    case "evalCases":
      return (
        await ctx.db
          .query("evalCases")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .take(ACCOUNT_DELETION_BATCH_SIZE)
      ).map((row) => row._id);
    case "evalDatasets":
      return (
        await ctx.db
          .query("evalDatasets")
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
    case "voiceDriftRuns":
      return (
        await ctx.db
          .query("voiceDriftRuns")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .take(ACCOUNT_DELETION_BATCH_SIZE)
      ).map((row) => row._id);
    case "onboardingConciergeRuns":
      return (
        await ctx.db
          .query("onboardingConciergeRuns")
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
