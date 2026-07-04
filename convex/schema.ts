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
    isDemo: v.boolean(),
    createdAt: v.number(),
  }).index("by_x_user_id", ["xUserId"]),

  sessions: defineTable({
    userId: v.id("users"),
    token: v.string(),
    createdAt: v.number(),
    expiresAt: v.number(),
  }).index("by_token", ["token"]),

  // X OAuth tokens, kept out of the users table so they are never
  // returned to the client by user queries.
  xTokens: defineTable({
    userId: v.id("users"),
    accessToken: v.string(),
    refreshToken: v.optional(v.string()),
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

  tweetAnalyses: defineTable({
    userId: v.id("users"),
    tweetUrl: v.string(),
    tweetId: v.string(),
    tweet: tweetSnapshot,
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
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_tweet", ["userId", "tweetId"]),

  generatedReplies: defineTable({
    analysisId: v.id("tweetAnalyses"),
    userId: v.id("users"),
    kind: v.union(v.literal("reply"), v.literal("quote")),
    category: v.string(),
    content: v.string(),
    // A short reason this option is worth sending — no fake precision scores.
    reason: v.string(),
    voiceProfileId: v.optional(v.id("voiceProfiles")),
    editedBeforeSend: v.optional(v.boolean()),
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
    status: v.union(
      v.literal("draft"),
      v.literal("scheduled"),
      v.literal("published"),
      v.literal("failed")
    ),
    scheduledFor: v.optional(v.number()),
    publishedTweetId: v.optional(v.string()),
    publishedAt: v.optional(v.number()),
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
  })
    .index("by_user", ["userId"])
    .index("by_user_status", ["userId", "status"])
    .index("by_user_tweet", ["userId", "tweetId"]),

  scannerSettings: defineTable({
    userId: v.id("users"),
    enabled: v.boolean(),
    keywords: v.array(v.string()),
    lastScanAt: v.optional(v.number()),
  }).index("by_user", ["userId"]),

  cachedResponses: defineTable({
    key: v.string(),
    value: v.string(), // JSON payload
    expiresAt: v.number(),
  }).index("by_key", ["key"]),
});
