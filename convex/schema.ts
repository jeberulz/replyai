import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const tweetSnapshot = v.object({
  authorName: v.string(),
  authorHandle: v.string(),
  authorAvatar: v.optional(v.string()),
  authorFollowers: v.number(),
  authorBio: v.optional(v.string()),
  text: v.string(),
  postedAt: v.number(),
  likes: v.number(),
  retweets: v.number(),
  replies: v.number(),
  quotes: v.number(),
  views: v.optional(v.number()),
  // Text extracted from attached images (alt text / OCR), if any.
  mediaText: v.optional(v.string()),
});

export const tweetAncestorSnapshot = v.object({
  tweetId: v.string(),
  authorName: v.string(),
  authorHandle: v.string(),
  text: v.string(),
  postedAt: v.number(),
});

export const voiceStyle = v.object({
  tone: v.string(),
  sentenceLength: v.string(),
  formatting: v.string(),
  emojiUse: v.string(),
  punctuation: v.string(),
  readingLevel: v.string(),
  commonPhrases: v.array(v.string()),
});

export default defineSchema({
  users: defineTable({
    xUserId: v.string(),
    username: v.string(),
    displayName: v.string(),
    avatar: v.optional(v.string()),
    plan: v.string(), // "free" — monetization decision deferred until after launch testing
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    stripeSubscriptionStatus: v.optional(v.string()),
    stripePriceId: v.optional(v.string()),
    stripeCurrentPeriodEnd: v.optional(v.number()),
    stripeTrialEndsAt: v.optional(v.number()),
    // Preferred Claude model for generation; unset = app default (see shared/models.ts).
    defaultModel: v.optional(v.string()),
    // Primary goal chosen during onboarding — tunes scanner keywords and copy.
    goal: v.optional(
      v.union(v.literal("audience"), v.literal("leads"), v.literal("authority"))
    ),
    // When the onboarding wizard was finished or skipped; unset = new user.
    onboardingCompletedAt: v.optional(v.number()),
    // When the dashboard "finish setting up" card was dismissed.
    setupDismissedAt: v.optional(v.number()),
    isDemo: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_x_user_id", ["xUserId"])
    .index("by_stripe_customer_id", ["stripeCustomerId"]),

  sessions: defineTable({
    userId: v.id("users"),
    // Deprecated plaintext bearer token. Kept optional for a zero-downtime
    // migration window; new sessions write only tokenHash.
    token: v.optional(v.string()),
    tokenHash: v.optional(v.string()),
    createdAt: v.number(),
    lastSeenAt: v.optional(v.number()),
    expiresAt: v.number(),
    absoluteExpiresAt: v.optional(v.number()),
  })
    .index("by_token", ["token"])
    .index("by_token_hash", ["tokenHash"]),

  // X OAuth tokens, kept out of the users table so they are never
  // returned to the client by user queries.
  xTokens: defineTable({
    userId: v.id("users"),
    // Deprecated plaintext fields. New writes use encryptedAccessToken and
    // encryptedRefreshToken; plaintext is read only as a migration fallback.
    accessToken: v.optional(v.string()),
    refreshToken: v.optional(v.string()),
    encryptedAccessToken: v.optional(v.string()),
    encryptedRefreshToken: v.optional(v.string()),
    expiresAt: v.number(),
    scope: v.string(),
  }).index("by_user", ["userId"]),

  voiceProfiles: defineTable({
    userId: v.id("users"),
    name: v.string(),
    style: voiceStyle,
    examples: v.array(v.string()),
    source: v.union(v.literal("manual"), v.literal("trained")),
    isDefault: v.boolean(),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  projects: defineTable({
    userId: v.id("users"),
    name: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  tweetAnalyses: defineTable({
    userId: v.id("users"),
    projectId: v.optional(v.id("projects")),
    tweetUrl: v.string(),
    tweetId: v.string(),
    tweet: tweetSnapshot,
    threadAncestors: v.optional(v.array(tweetAncestorSnapshot)),
    topReplies: v.array(
      v.object({
        authorHandle: v.string(),
        text: v.string(),
        likes: v.number(),
      })
    ),
    summary: v.string(),
    topic: v.string(),
    stance: v.string(),
    existingOpinions: v.array(v.string()),
    missingAngles: v.array(v.string()),
    score: v.object({
      value: v.number(), // 0-100 "worth replying" score
      reason: v.string(),
      factors: v.object({
        audienceSize: v.number(),
        topicRelevance: v.number(),
        replyTiming: v.number(),
        growthVelocity: v.number(),
      }),
    }),
    // X reply_settings when available (everyone, following, mentionedUsers, …)
    replySettings: v.optional(v.string()),
    // Staged pipeline state; unset = legacy row, treated as "complete".
    status: v.optional(
      v.union(
        v.literal("analyzing"),
        v.literal("generating"),
        v.literal("complete"),
        v.literal("failed")
      )
    ),
    error: v.optional(v.string()),
    // Bumped on every stage transition — drives stale-pipeline detection.
    updatedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_tweet", ["userId", "tweetId"])
    .index("by_user_project", ["userId", "projectId"])
    .index("by_status_and_updatedAt", ["status", "updatedAt"]),

  generatedReplies: defineTable({
    analysisId: v.id("tweetAnalyses"),
    userId: v.id("users"),
    kind: v.union(v.literal("reply"), v.literal("quote")),
    category: v.string(),
    content: v.string(),
    // Latest AI-generated baseline for edit-distance measurement. Manual
    // edits compare against this; AI rewrites refresh it.
    baselineContent: v.optional(v.string()),
    // A short reason this option is worth sending — no fake precision scores.
    reason: v.string(),
    // Which Claude model generated this option (unset for pre-feature rows).
    model: v.optional(v.string()),
    voiceProfileId: v.optional(v.id("voiceProfiles")),
    editedBeforeSend: v.optional(v.boolean()),
    editDistanceNormalized: v.optional(v.number()),
    editBucket: v.optional(
      v.union(
        v.literal("no_edit"),
        v.literal("minor_edit"),
        v.literal("major_edit")
      )
    ),
    createdAt: v.number(),
  })
    .index("by_analysis", ["analysisId"])
    .index("by_user", ["userId"]),

  savedDrafts: defineTable({
    userId: v.id("users"),
    analysisId: v.optional(v.id("tweetAnalyses")),
    replyId: v.optional(v.id("generatedReplies")),
    kind: v.union(v.literal("reply"), v.literal("quote")),
    text: v.string(),
    targetTweetId: v.optional(v.string()),
    targetTweetUrl: v.optional(v.string()),
    publishMode: v.optional(
      v.union(
        v.literal("threaded"),
        v.literal("standalone"),
        v.literal("url_quote")
      )
    ),
    status: v.union(
      v.literal("draft"),
      v.literal("scheduled"),
      v.literal("published"),
      v.literal("failed")
    ),
    scheduledFor: v.optional(v.number()),
    publishedTweetId: v.optional(v.string()),
    publishedAt: v.optional(v.number()),
    editDistanceNormalized: v.optional(v.number()),
    editBucket: v.optional(
      v.union(
        v.literal("no_edit"),
        v.literal("minor_edit"),
        v.literal("major_edit")
      )
    ),
    error: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_status", ["userId", "status"]),

  usage: defineTable({
    userId: v.id("users"),
    month: v.string(), // "YYYY-MM"
    tokensIn: v.number(),
    tokensOut: v.number(),
    requests: v.number(),
    analyses: v.number(),
    generations: v.number(),
  }).index("by_user_month", ["userId", "month"]),

  opportunities: defineTable({
    userId: v.id("users"),
    tweetId: v.string(),
    tweetUrl: v.string(),
    authorHandle: v.string(),
    authorName: v.string(),
    authorFollowers: v.number(),
    text: v.string(),
    score: v.number(),
    reason: v.string(),
    suggestedAngle: v.string(),
    replyCount: v.number(),
    // Engagement per hour since posting — how fast the conversation is moving.
    velocity: v.number(),
    postedAt: v.number(),
    scannedAt: v.number(),
    status: v.union(
      v.literal("new"),
      v.literal("dismissed"),
      v.literal("analyzed")
    ),
    source: v.optional(
      v.union(
        v.literal("following"),
        v.literal("list"),
        v.literal("watched"),
        v.literal("search")
      )
    ),
    // e.g. "AI Builders list" — only set for source "list".
    sourceLabel: v.optional(v.string()),
    // Phase 3 semantic relevance (cached 24h when tweet text unchanged).
    keywordRelevance: v.optional(v.number()),
    semanticRelevance: v.optional(v.number()),
    topicRelevance: v.optional(v.number()),
    semanticClassifiedAt: v.optional(v.number()),
    textFingerprint: v.optional(v.string()),
    // Phase 5 outcome funnel (internal ranking + dashboard conversion).
    outcome: v.optional(
      v.union(
        v.literal("ignored"),
        v.literal("analyzed"),
        v.literal("sent"),
        v.literal("responded")
      )
    ),
    analyzedAt: v.optional(v.number()),
    sentAt: v.optional(v.number()),
    respondedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_user_status", ["userId", "status"])
    .index("by_user_tweet", ["userId", "tweetId"]),

  scannerSettings: defineTable({
    userId: v.id("users"),
    enabled: v.boolean(),
    keywords: v.array(v.string()),
    lastScanAt: v.optional(v.number()),
    lastScanError: v.optional(v.string()),
    lastScanCount: v.optional(v.number()),
    // Max 5, enforced in the mutation (not the schema).
    engageListIds: v.optional(v.array(v.string())),
    // Display cache, parallel array to engageListIds.
    engageListNames: v.optional(v.array(v.string())),
    // Max 50, enforced in the mutation (not the schema).
    watchedHandles: v.optional(v.array(v.string())),
    // Discovery keywords for search/recent (separate from filter keywords).
    searchKeywords: v.optional(v.array(v.string())),
    // Authors dismissed from feed; hidden until `until` (7-day default).
    dismissedAuthors: v.optional(
      v.array(v.object({ handle: v.string(), until: v.number() }))
    ),
    enabledSources: v.optional(
      v.array(
        v.union(
          v.literal("following"),
          v.literal("lists"),
          v.literal("watched"),
          v.literal("search")
        )
      )
    ),
    // Learned scan ranking multipliers — never surfaced as ML % in UI.
    rankingWeights: v.optional(
      v.object({
        updatedAt: v.number(),
        sourceMultipliers: v.optional(
          v.object({
            following: v.optional(v.number()),
            list: v.optional(v.number()),
            watched: v.optional(v.number()),
            search: v.optional(v.number()),
          })
        ),
        followerBandMultipliers: v.optional(
          v.object({
            micro: v.optional(v.number()),
            small: v.optional(v.number()),
            medium: v.optional(v.number()),
            large: v.optional(v.number()),
          })
        ),
        scoreDecileMultipliers: v.optional(v.record(v.string(), v.number())),
      })
    ),
  }).index("by_user", ["userId"]),

  // Side-by-side model comparisons: the same generation run across several
  // models against one analysis, judged by a stronger model. Powers the
  // "which model is good enough?" cost/quality decision.
  modelEvals: defineTable({
    userId: v.id("users"),
    analysisId: v.id("tweetAnalyses"),
    judgeModel: v.string(),
    candidates: v.array(
      v.object({
        model: v.string(),
        options: v.array(
          v.object({
            category: v.string(),
            content: v.string(),
            reason: v.string(),
          })
        ),
        tokensIn: v.number(),
        tokensOut: v.number(),
        costUsd: v.number(),
        // 0-100 judge score with a plain-language note.
        score: v.number(),
        notes: v.string(),
      })
    ),
    winnerModel: v.string(),
    summary: v.string(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_analysis", ["analysisId"]),

  cachedResponses: defineTable({
    key: v.string(),
    value: v.string(), // JSON payload
    expiresAt: v.number(),
  }).index("by_key", ["key"]),

  researchRuns: defineTable({
    userId: v.id("users"),
    query: v.string(),
    seedHandles: v.array(v.string()),
    resultCount: v.number(),
    status: v.union(
      v.literal("running"),
      v.literal("complete"),
      v.literal("failed")
    ),
    error: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_created", ["userId", "createdAt"]),

  researchProfiles: defineTable({
    userId: v.id("users"),
    runId: v.id("researchRuns"),
    xUserId: v.optional(v.string()),
    handle: v.string(),
    displayName: v.string(),
    bio: v.optional(v.string()),
    followers: v.number(),
    avgLikes: v.number(),
    postFrequency: v.optional(v.string()),
    topicTags: v.array(v.string()),
    /** Internal sort key — never shown as a fake-precision % in the UI. */
    score: v.number(),
    reason: v.string(),
    exampleTweets: v.array(
      v.object({
        tweetId: v.string(),
        text: v.string(),
        likes: v.number(),
      })
    ),
    status: v.union(
      v.literal("suggested"),
      v.literal("watching"),
      v.literal("passed")
    ),
    discoveredAt: v.number(),
  })
    .index("by_user_status", ["userId", "status"])
    .index("by_run", ["runId"])
    .index("by_user_handle", ["userId", "handle"]),
});
