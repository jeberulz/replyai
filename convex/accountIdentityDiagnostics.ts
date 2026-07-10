import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { query } from "./_generated/server";
import { requireUser } from "./helpers";
import { chooseDuplicateAccountSurvivor } from "../shared/onboardingIdentity";

const TOKEN_ACCESS_SECRET_ENV = "CONVEX_SERVER_TOKEN_ACCESS_SECRET";
const X_PROVIDER = "x";
const DEFAULT_SCAN_LIMIT = 1000;
const MAX_SCAN_LIMIT = 5000;

function requireServerTokenAccess(secret: string) {
  const expected = process.env[TOKEN_ACCESS_SECRET_ENV]?.trim();
  if (!expected || secret !== expected) {
    throw new Error("Unauthorized");
  }
}

function scanLimit(limit: number | undefined): number {
  if (!Number.isFinite(limit ?? DEFAULT_SCAN_LIMIT)) return DEFAULT_SCAN_LIMIT;
  return Math.max(1, Math.min(MAX_SCAN_LIMIT, Math.floor(limit!)));
}

type UserCounts = {
  sessions: number;
  xTokens: number;
  voiceProfiles: number;
  defaultVoiceProfiles: number;
  tweetAnalyses: number;
  savedDrafts: number;
};

async function countUserRows(
  ctx: QueryCtx,
  userId: Id<"users">
): Promise<UserCounts> {
  const counts: UserCounts = {
    sessions: 0,
    xTokens: 0,
    voiceProfiles: 0,
    defaultVoiceProfiles: 0,
    tweetAnalyses: 0,
    savedDrafts: 0,
  };

  for await (const row of ctx.db
    .query("sessions")
    .withIndex("by_user", (q) => q.eq("userId", userId))) {
    if (row._id) counts.sessions += 1;
  }
  for await (const row of ctx.db
    .query("xTokens")
    .withIndex("by_user", (q) => q.eq("userId", userId))) {
    if (row._id) counts.xTokens += 1;
  }
  for await (const row of ctx.db
    .query("voiceProfiles")
    .withIndex("by_user", (q) => q.eq("userId", userId))) {
    counts.voiceProfiles += 1;
    if (row.isDefault) counts.defaultVoiceProfiles += 1;
  }
  for await (const row of ctx.db
    .query("tweetAnalyses")
    .withIndex("by_user", (q) => q.eq("userId", userId))) {
    if (row._id) counts.tweetAnalyses += 1;
  }
  for await (const row of ctx.db
    .query("savedDrafts")
    .withIndex("by_user", (q) => q.eq("userId", userId))) {
    if (row._id) counts.savedDrafts += 1;
  }

  return counts;
}

function productRows(counts: UserCounts): number {
  return counts.voiceProfiles + counts.tweetAnalyses + counts.savedDrafts;
}

async function userReport(ctx: QueryCtx, user: Doc<"users">) {
  const counts = await countUserRows(ctx, user._id);
  return {
    userId: user._id,
    username: user.username,
    displayName: user.displayName,
    xUserId: user.xUserId,
    createdAt: user.createdAt,
    counts,
    productRows: productRows(counts),
  };
}

async function duplicateUserGroup(
  ctx: QueryCtx,
  xUserId: string,
  users: Doc<"users">[]
) {
  const candidates = await Promise.all(users.map((user) => userReport(ctx, user)));
  return {
    xUserId,
    recommendedSurvivorUserId: chooseDuplicateAccountSurvivor(candidates),
    candidates,
  };
}

export const dryRun = query({
  args: {
    sessionToken: v.string(),
    serverSecret: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { sessionToken, serverSecret, limit }) => {
    await requireUser(ctx, sessionToken);
    requireServerTokenAccess(serverSecret);
    const max = scanLimit(limit);
    const usersByXUserId = new Map<string, Doc<"users">[]>();
    const identitiesByProviderUserId = new Map<
      string,
      Doc<"accountIdentities">[]
    >();

    let scannedUsers = 0;
    for await (const user of ctx.db.query("users")) {
      const group = usersByXUserId.get(user.xUserId) ?? [];
      group.push(user);
      usersByXUserId.set(user.xUserId, group);
      scannedUsers += 1;
      if (scannedUsers >= max) break;
    }

    let scannedIdentities = 0;
    for await (const identity of ctx.db
      .query("accountIdentities")
      .withIndex("by_provider", (q) => q.eq("provider", X_PROVIDER))) {
      const group =
        identitiesByProviderUserId.get(identity.providerUserId) ?? [];
      group.push(identity);
      identitiesByProviderUserId.set(identity.providerUserId, group);
      scannedIdentities += 1;
      if (scannedIdentities >= max) break;
    }

    const duplicateUsers = [];
    for (const [xUserId, users] of usersByXUserId) {
      if (users.length > 1) {
        duplicateUsers.push(await duplicateUserGroup(ctx, xUserId, users));
      }
    }

    const duplicateIdentities = [];
    for (const [providerUserId, identities] of identitiesByProviderUserId) {
      if (identities.length <= 1) continue;
      const users = await Promise.all(
        identities.map((identity) => ctx.db.get(identity.userId))
      );
      const existingUsers = users.filter((user): user is Doc<"users"> =>
        Boolean(user)
      );
      duplicateIdentities.push({
        provider: X_PROVIDER,
        providerUserId,
        identityRows: identities.map((identity) => ({
          identityId: identity._id,
          userId: identity.userId,
          createdAt: identity.createdAt,
          lastLoginAt: identity.lastLoginAt,
        })),
        recommendedSurvivorUserId:
          existingUsers.length > 0
            ? chooseDuplicateAccountSurvivor(
                await Promise.all(
                  existingUsers.map(async (user) => {
                    const counts = await countUserRows(ctx, user._id);
                    return {
                      userId: user._id,
                      createdAt: user.createdAt,
                      productRows: productRows(counts),
                    };
                  })
                )
              )
            : null,
      });
    }

    return {
      dryRun: true,
      generatedAt: new Date().toISOString(),
      scannedUsers,
      scannedIdentities,
      scanLimit: max,
      duplicateUsers,
      duplicateIdentities,
    };
  },
});
