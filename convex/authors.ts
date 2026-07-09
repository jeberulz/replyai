import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import {
  internalMutation,
  query,
} from "./_generated/server";
import {
  demoAuthorDossierByHandle,
  emptyPostHourCounts,
  formatAuthorDossierSnippet,
  formatCadenceHint,
  mergeAuthorUpsert,
  normalizeAuthorHandle,
  type AuthorDossierSnapshot,
  type AuthorInteractionKind,
} from "../shared/authors";
import { requireUser } from "./helpers";

const replySettingsEntryValidator = v.object({
  settings: v.string(),
  seenAt: v.number(),
});

const dossierReturnValidator = v.object({
  authorHandle: v.string(),
  authorName: v.optional(v.string()),
  authorXUserId: v.optional(v.string()),
  interactionCount: v.number(),
  sentCount: v.number(),
  responseCount: v.number(),
  lastInteractedAt: v.optional(v.number()),
  lastRespondedAt: v.optional(v.number()),
  lastSentAt: v.optional(v.number()),
  topicsResponded: v.array(v.string()),
  replySettingsHistory: v.array(replySettingsEntryValidator),
  postHourCounts: v.array(v.number()),
  cadenceHint: v.union(v.string(), v.null()),
  snippet: v.union(v.string(), v.null()),
  source: v.union(v.literal("stored"), v.literal("demo")),
  updatedAt: v.number(),
});

function toSnapshot(row: Doc<"authors">): AuthorDossierSnapshot {
  return {
    authorHandle: row.authorHandle,
    authorName: row.authorName,
    authorXUserId: row.authorXUserId,
    interactionCount: row.interactionCount,
    sentCount: row.sentCount,
    responseCount: row.responseCount,
    lastInteractedAt: row.lastInteractedAt,
    lastRespondedAt: row.lastRespondedAt,
    lastSentAt: row.lastSentAt,
    topicsResponded: row.topicsResponded,
    replySettingsHistory: row.replySettingsHistory,
    postHourCounts:
      row.postHourCounts.length === 24
        ? row.postHourCounts
        : emptyPostHourCounts(),
    updatedAt: row.updatedAt,
  };
}

function serializeDossier(
  snapshot: AuthorDossierSnapshot,
  source: "stored" | "demo",
  cadenceNote?: string
) {
  const cadenceHint =
    cadenceNote?.trim() || formatCadenceHint(snapshot.postHourCounts);
  return {
    authorHandle: snapshot.authorHandle,
    authorName: snapshot.authorName,
    authorXUserId: snapshot.authorXUserId,
    interactionCount: snapshot.interactionCount,
    sentCount: snapshot.sentCount,
    responseCount: snapshot.responseCount,
    lastInteractedAt: snapshot.lastInteractedAt,
    lastRespondedAt: snapshot.lastRespondedAt,
    lastSentAt: snapshot.lastSentAt,
    topicsResponded: snapshot.topicsResponded,
    replySettingsHistory: snapshot.replySettingsHistory,
    postHourCounts: snapshot.postHourCounts,
    cadenceHint,
    snippet: formatAuthorDossierSnippet({
      authorHandle: snapshot.authorHandle,
      responseCount: snapshot.responseCount,
      topicsResponded: snapshot.topicsResponded,
      postHourCounts: snapshot.postHourCounts,
      cadenceNote: cadenceHint ?? undefined,
    }),
    source,
    updatedAt: snapshot.updatedAt,
  };
}

async function upsertAuthorRow(
  ctx: MutationCtx,
  args: {
    userId: Id<"users">;
    kind: AuthorInteractionKind;
    at: number;
    authorHandle: string;
    authorName?: string;
    authorXUserId?: string;
    topic?: string;
    replySettings?: string;
    postedAt?: number;
  }
): Promise<Id<"authors"> | null> {
  const authorHandle = normalizeAuthorHandle(args.authorHandle);
  if (!authorHandle) return null;

  const existing = await ctx.db
    .query("authors")
    .withIndex("by_user_handle", (q) =>
      q.eq("userId", args.userId).eq("authorHandle", authorHandle)
    )
    .unique();

  const merged = mergeAuthorUpsert(
    existing ? toSnapshot(existing) : null,
    {
      kind: args.kind,
      at: args.at,
      authorHandle,
      authorName: args.authorName,
      authorXUserId: args.authorXUserId,
      topic: args.topic,
      replySettings: args.replySettings,
      postedAt: args.postedAt,
    }
  );

  if (existing) {
    await ctx.db.patch(existing._id, {
      authorName: merged.authorName,
      authorXUserId: merged.authorXUserId,
      interactionCount: merged.interactionCount,
      sentCount: merged.sentCount,
      responseCount: merged.responseCount,
      lastInteractedAt: merged.lastInteractedAt,
      lastRespondedAt: merged.lastRespondedAt,
      lastSentAt: merged.lastSentAt,
      topicsResponded: merged.topicsResponded,
      replySettingsHistory: merged.replySettingsHistory,
      postHourCounts: merged.postHourCounts,
      updatedAt: merged.updatedAt,
    });
    return existing._id;
  }

  return await ctx.db.insert("authors", {
    userId: args.userId,
    authorHandle: merged.authorHandle,
    authorName: merged.authorName,
    authorXUserId: merged.authorXUserId,
    interactionCount: merged.interactionCount,
    sentCount: merged.sentCount,
    responseCount: merged.responseCount,
    lastInteractedAt: merged.lastInteractedAt,
    lastRespondedAt: merged.lastRespondedAt,
    lastSentAt: merged.lastSentAt,
    topicsResponded: merged.topicsResponded,
    replySettingsHistory: merged.replySettingsHistory,
    postHourCounts: merged.postHourCounts,
    createdAt: args.at,
    updatedAt: merged.updatedAt,
  });
}

/** Upsert author dossier when a reply is published (outbound). */
export const recordSent = internalMutation({
  args: {
    userId: v.id("users"),
    authorHandle: v.string(),
    authorName: v.optional(v.string()),
    authorXUserId: v.optional(v.string()),
    topic: v.optional(v.string()),
    replySettings: v.optional(v.string()),
    postedAt: v.optional(v.number()),
    at: v.number(),
  },
  returns: v.union(v.id("authors"), v.null()),
  handler: async (ctx, args) => {
    return await upsertAuthorRow(ctx, { ...args, kind: "sent" });
  },
});

/** Upsert author dossier when an outcome is marked responded. */
export const recordResponded = internalMutation({
  args: {
    userId: v.id("users"),
    authorHandle: v.string(),
    authorName: v.optional(v.string()),
    authorXUserId: v.optional(v.string()),
    topic: v.optional(v.string()),
    replySettings: v.optional(v.string()),
    postedAt: v.optional(v.number()),
    at: v.number(),
  },
  returns: v.union(v.id("authors"), v.null()),
  handler: async (ctx, args) => {
    return await upsertAuthorRow(ctx, { ...args, kind: "responded" });
  },
});

export const getByHandle = query({
  args: {
    sessionToken: v.string(),
    authorHandle: v.string(),
    /** Client clock for demo fixture materialization (required for demo path). */
    now: v.optional(v.number()),
  },
  returns: v.union(dossierReturnValidator, v.null()),
  handler: async (ctx, { sessionToken, authorHandle, now }) => {
    const user = await requireUser(ctx, sessionToken);
    const handle = normalizeAuthorHandle(authorHandle);
    if (!handle) return null;

    const row = await ctx.db
      .query("authors")
      .withIndex("by_user_handle", (q) =>
        q.eq("userId", user._id).eq("authorHandle", handle)
      )
      .unique();

    if (row) {
      return serializeDossier(toSnapshot(row), "stored");
    }

    // Demo fixtures need a client-supplied `now` — queries stay deterministic.
    if (now === undefined) return null;
    const demoSnapshot = demoAuthorDossierByHandle(handle, now);
    if (!demoSnapshot) return null;
    return serializeDossier(demoSnapshot, "demo");
  },
});

export const listTop = query({
  args: {
    sessionToken: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(dossierReturnValidator),
  handler: async (ctx, { sessionToken, limit }) => {
    const user = await requireUser(ctx, sessionToken);
    const take = Math.min(Math.max(limit ?? 10, 1), 50);

    const rows = await ctx.db
      .query("authors")
      .withIndex("by_user_responseCount", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(take);

    return rows.map((row) => serializeDossier(toSnapshot(row), "stored"));
  },
});
