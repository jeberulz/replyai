"use node";

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { createHash } from "node:crypto";
import { v } from "convex/values";
import { z } from "zod";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalAction, type ActionCtx } from "./_generated/server";
import { captureConvexException } from "./lib/sentry";
import { demoResearchProfiles } from "../shared/demoData";
import {
  rankResearchProfiles,
  type ResearchTweetSample,
  type ScoredResearchProfile,
} from "../shared/researchScoring";
import {
  MAX_REPLACEMENT_SUGGESTIONS,
  demoCuratorArtifact,
  replacementReason,
} from "../shared/researchCurator";
import { refreshAccessToken } from "../shared/xOAuth";
import type { XReadSource } from "../shared/xReadLimits";

const MAX_SEED_HANDLES = 5;
const RESEARCH_MODEL = process.env.ANTHROPIC_RESEARCH_MODEL ?? "claude-sonnet-5";

type XReadAttempt =
  | { allowed: true; ledgerId?: Id<"xReadLedger"> }
  | { allowed: false; message?: string };

function hashXReadResource(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

async function beginXRead(
  ctx: ActionCtx,
  args: {
    userId: Id<"users">;
    isDemo: boolean;
    source: XReadSource;
    endpoint: string;
  }
): Promise<XReadAttempt> {
  return await ctx.runMutation(internal.xReads.recordAttemptForUserInternal, {
    userId: args.userId,
    isDemo: args.isDemo,
    source: args.source,
    endpoint: args.endpoint,
    priority: "low",
  });
}

async function finishXRead(
  ctx: ActionCtx,
  args: {
    userId: Id<"users">;
    attempt: XReadAttempt;
    tweets: ResearchTweetSample[];
    status?: "succeeded" | "failed";
  }
) {
  if (!args.attempt.allowed) return;
  await ctx.runMutation(internal.xReads.completeAttemptInternal, {
    userId: args.userId,
    ledgerId: args.attempt.ledgerId,
    rawResourceCount: args.tweets.length,
    resourceHashes: args.tweets.map((tweet) =>
      hashXReadResource(`tweet:${tweet.tweetId}`)
    ),
    status: args.status ?? "succeeded",
  });
}

type XTimelineResponse = {
  data?: Array<{
    id: string;
    text: string;
    author_id: string;
    created_at: string;
    public_metrics: {
      like_count: number;
      retweet_count: number;
      reply_count: number;
      quote_count: number;
    };
  }>;
  includes?: {
    users?: Array<{
      id: string;
      name: string;
      username: string;
      description?: string;
      public_metrics?: { followers_count: number };
    }>;
  };
};

const SynthesisSchema = z.object({
  profiles: z.array(
    z.object({
      handle: z.string(),
      reason: z
        .string()
        .describe(
          "Plain-language why this account is worth following — no percentages or fake scores"
        ),
    })
  ),
});

function hasAnthropicKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

function mapSearchResponse(json: XTimelineResponse): ResearchTweetSample[] {
  const authors = new Map(
    (json.includes?.users ?? []).map((u) => [u.id, u] as const)
  );
  const out: ResearchTweetSample[] = [];
  for (const t of json.data ?? []) {
    const author = authors.get(t.author_id);
    out.push({
      tweetId: t.id,
      text: t.text,
      likes: t.public_metrics.like_count,
      replies: t.public_metrics.reply_count,
      postedAt: Date.parse(t.created_at),
      authorHandle: author?.username ?? "unknown",
      authorName: author?.name ?? "Unknown",
      authorFollowers: author?.public_metrics?.followers_count ?? 0,
      authorBio: author?.description,
      authorId: author?.id,
    });
  }
  return out;
}

async function resolveAccessToken(
  ctx: ActionCtx,
  userId: Id<"users">
): Promise<string | null> {
  const context = await ctx.runQuery(internal.scanner.scanContext, { userId });
  if (!context?.accessToken && !context?.refreshToken) return null;

  let accessToken = context.accessToken;
  if (!accessToken || context.expiresAt <= Date.now()) {
    if (!context.refreshToken) return null;
    try {
      const refreshed = await refreshAccessToken(context.refreshToken);
      accessToken = refreshed.accessToken;
      await ctx.runMutation(internal.xTokens.updateXTokens, {
        userId,
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken,
        expiresAt: refreshed.expiresAt,
        scope: refreshed.scope || context.scope,
      });
    } catch {
      return null;
    }
  }
  return accessToken;
}

async function fetchSearchTweets(
  ctx: ActionCtx,
  userId: Id<"users">,
  isDemo: boolean,
  query: string,
  accessToken: string
): Promise<ResearchTweetSample[]> {
  const attempt = await beginXRead(ctx, {
    userId,
    isDemo,
    source: "research",
    endpoint: "tweets/search/recent",
  });
  if (!attempt.allowed) return [];
  const url = new URL("https://api.x.com/2/tweets/search/recent");
  url.searchParams.set("query", `${query} -is:retweet -is:reply lang:en`);
  url.searchParams.set("max_results", "50");
  url.searchParams.set(
    "tweet.fields",
    "public_metrics,created_at,author_id"
  );
  url.searchParams.set("expansions", "author_id");
  url.searchParams.set(
    "user.fields",
    "public_metrics,username,name,description"
  );

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    await finishXRead(ctx, { userId, attempt, tweets: [], status: "failed" });
    return [];
  }
  const json = (await res.json()) as XTimelineResponse;
  const tweets = mapSearchResponse(json);
  await finishXRead(ctx, { userId, attempt, tweets });
  return tweets;
}

async function fetchHandleTweets(
  ctx: ActionCtx,
  userId: Id<"users">,
  isDemo: boolean,
  handle: string,
  accessToken: string
): Promise<ResearchTweetSample[]> {
  const attempt = await beginXRead(ctx, {
    userId,
    isDemo,
    source: "research",
    endpoint: "tweets/search/recent",
  });
  if (!attempt.allowed) return [];
  const url = new URL("https://api.x.com/2/tweets/search/recent");
  url.searchParams.set("query", `from:${handle} -is:retweet -is:reply`);
  url.searchParams.set("max_results", "10");
  url.searchParams.set(
    "tweet.fields",
    "public_metrics,created_at,author_id"
  );
  url.searchParams.set("expansions", "author_id");
  url.searchParams.set(
    "user.fields",
    "public_metrics,username,name,description"
  );

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    await finishXRead(ctx, { userId, attempt, tweets: [], status: "failed" });
    return [];
  }
  const json = (await res.json()) as XTimelineResponse;
  const tweets = mapSearchResponse(json);
  await finishXRead(ctx, { userId, attempt, tweets });
  return tweets;
}

async function synthesizeReasons(
  query: string,
  candidates: ScoredResearchProfile[],
  nicheKeywords: string[]
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (candidates.length === 0) return out;

  if (!hasAnthropicKey()) {
    for (const c of candidates) {
      out.set(
        c.handle.toLowerCase(),
        c.topicTags.length > 0
          ? `Active on ${c.topicTags.join(", ")} — ${c.postFrequency.toLowerCase()}, replies stay accessible.`
          : `Consistent ${c.postFrequency.toLowerCase()} with solid engagement for your niche.`
      );
    }
    return out;
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const model = RESEARCH_MODEL;

  const block = candidates
    .slice(0, 10)
    .map(
      (c, i) =>
        `${i + 1}. @${c.handle} (${c.displayName}, ${c.followers.toLocaleString()} followers)
Bio: ${c.bio || "n/a"}
Tags: ${c.topicTags.join(", ") || "general"}
Sample: "${c.exampleTweets[0]?.text.slice(0, 180) ?? ""}"`
    )
    .join("\n\n");

  const response = await anthropic.messages.create({
    model,
    max_tokens: 1200,
    system:
      "You help X creators find accounts worth engaging with. Write concise, specific 'why follow' reasons. Never output percentages, match scores, or engagement predictions.",
    messages: [
      {
        role: "user",
        content: `User search: "${query}"
Their niche keywords: ${nicheKeywords.join(", ") || "general tech/builder"}

Candidates:
${block}

Return a reason for each handle (same handles, top 10 max).`,
      },
    ],
    output_config: { format: zodOutputFormat(SynthesisSchema) },
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") return out;

  const parsed = SynthesisSchema.parse(JSON.parse(textBlock.text));
  for (const row of parsed.profiles) {
    out.set(row.handle.toLowerCase().replace(/^@/, ""), row.reason);
  }
  return out;
}

function demoProfilesToSave(
  query: string
): Array<{
  handle: string;
  displayName: string;
  bio?: string;
  xUserId?: string;
  followers: number;
  avgLikes: number;
  postFrequency?: string;
  topicTags: string[];
  score: number;
  reason: string;
  exampleTweets: { tweetId: string; text: string; likes: number }[];
}> {
  return demoResearchProfiles(query).map((p) => ({
    handle: p.handle,
    displayName: p.displayName,
    bio: p.bio,
    followers: p.followers,
    avgLikes: p.avgLikes,
    postFrequency: p.postFrequency,
    topicTags: p.topicTags,
    score: p.score,
    reason: p.reason,
    exampleTweets: p.exampleTweets,
  }));
}

/** Build an X recent-search query from niche keywords + recent topics. */
function curatorQueryFromNiche(
  keywords: string[],
  recentTopics: string[]
): string {
  const terms = [...keywords, ...recentTopics]
    .map((t) => t.trim())
    .filter((t) => t.length > 2)
    .slice(0, 5);
  const unique = [...new Set(terms.map((t) => t.toLowerCase()))];
  if (unique.length === 0) return "";
  if (unique.length === 1) return unique[0];
  return `(${unique.map((t) => (t.includes(" ") ? `"${t}"` : t)).join(" OR ")})`;
}

/**
 * WP33 monthly curator — prune quiet suggestions, then discover replacement
 * candidates (reuses the manual research pipeline). The run row is created by
 * the dispatcher; this only prunes + saves. No auto-watch, no auto-publish.
 */
export const runMonthlyCurator = internalAction({
  args: {
    userId: v.id("users"),
    runId: v.id("researchRuns"),
    month: v.string(),
    nowMs: v.number(),
  },
  handler: async (ctx, { userId, runId, nowMs }) => {
    try {
      // 1. Prune quiet suggested profiles (always runs, keys or not).
      const prunedCount = await ctx.runMutation(
        internal.research.pruneQuietSuggestedProfiles,
        { userId, nowMs }
      );

      const scanCtx = await ctx.runQuery(internal.scanner.scanContext, {
        userId,
      });

      // 2a. Demo path — deterministic candidates for demo accounts only.
      // A missing Anthropic key is NOT a demo trigger: real users still get
      // real discovery, with template reasons via synthesizeReasons (matches
      // the manual runResearch pipeline). Otherwise demo profiles would leak
      // into a real user's suggestions.
      if (scanCtx?.isDemo) {
        const { candidates } = demoCuratorArtifact(nowMs, prunedCount);
        await ctx.runMutation(internal.research.saveCuratorResults, {
          runId,
          userId,
          prunedCount,
          profiles: candidates.map((c) => ({
            xUserId: c.xUserId,
            handle: c.handle,
            displayName: c.displayName,
            bio: c.bio,
            followers: c.followers,
            avgLikes: c.avgLikes,
            postFrequency: c.postFrequency,
            topicTags: c.topicTags,
            score: c.score,
            reason: c.reason,
            exampleTweets: c.exampleTweets,
          })),
        });
        return;
      }

      // 2b. Real discovery — needs an X token; without one, keep the prune
      // result and close the run with zero new suggestions.
      const accessToken = await resolveAccessToken(ctx, userId);
      if (!accessToken) {
        await ctx.runMutation(internal.research.saveCuratorResults, {
          runId,
          userId,
          prunedCount,
          profiles: [],
        });
        return;
      }

      const niche = await ctx.runQuery(internal.scannerSemantic.nicheContext, {
        userId,
      });
      const query = curatorQueryFromNiche(niche.keywords, niche.recentTopics);

      const tweets: ResearchTweetSample[] = [];
      const isDemo = scanCtx?.isDemo ?? false;
      if (query) {
        tweets.push(
          ...(await fetchSearchTweets(
            ctx,
            userId,
            isDemo,
            query,
            accessToken
          ))
        );
      }
      const seeds = (scanCtx?.watchedHandles ?? [])
        .map((h) => h.replace(/^@/, "").toLowerCase())
        .filter(Boolean)
        .slice(0, MAX_SEED_HANDLES);
      for (const handle of seeds) {
        tweets.push(
          ...(await fetchHandleTweets(
            ctx,
            userId,
            isDemo,
            handle,
            accessToken
          ))
        );
      }

      const ranked = rankResearchProfiles(tweets, niche.keywords, 30).slice(
        0,
        MAX_REPLACEMENT_SUGGESTIONS * 2
      );
      const reasons = await synthesizeReasons(
        query || "your niche",
        ranked,
        niche.keywords
      );

      const profiles = ranked.map((p) => ({
        xUserId: p.xUserId,
        handle: p.handle,
        displayName: p.displayName,
        bio: p.bio,
        followers: p.followers,
        avgLikes: p.avgLikes,
        postFrequency: p.postFrequency,
        topicTags: p.topicTags,
        score: p.score,
        reason: replacementReason(
          reasons.get(p.handle.toLowerCase()) ??
            `Active in your niche — ${p.postFrequency.toLowerCase()}.`
        ),
        exampleTweets: p.exampleTweets,
      }));

      await ctx.runMutation(internal.research.saveCuratorResults, {
        runId,
        userId,
        prunedCount,
        profiles,
      });
    } catch (error) {
      console.error("runMonthlyCurator failed", { userId, runId, error });
      await captureConvexException(error, {
        action: "runMonthlyCurator",
        userId,
        runId,
      });
      await ctx.runMutation(internal.research.markRunFailed, {
        runId,
        error:
          error instanceof Error
            ? error.message
            : "Monthly curator run failed unexpectedly.",
      });
    }
  },
});

export const runResearch = internalAction({
  args: {
    userId: v.id("users"),
    runId: v.id("researchRuns"),
    query: v.string(),
    seedHandle: v.optional(v.string()),
  },
  handler: async (ctx, { userId, runId, query, seedHandle }) => {
    try {
      const scanCtx = await ctx.runQuery(internal.scanner.scanContext, { userId });
      const niche = await ctx.runQuery(internal.scannerSemantic.nicheContext, {
        userId,
      });
      const nicheKeywords = niche.keywords;

      if (scanCtx?.isDemo) {
        await ctx.runMutation(internal.research.saveRunResults, {
          runId,
          userId,
          profiles: demoProfilesToSave(query),
        });
        return;
      }

      const accessToken = await resolveAccessToken(ctx, userId);
      if (!accessToken) {
        await ctx.runMutation(internal.research.markRunFailed, {
          runId,
          error: "Connect your X account in Settings to run research.",
        });
        return;
      }

      const seedHandles = [
        ...(seedHandle ? [seedHandle] : []),
        ...(scanCtx?.watchedHandles ?? []),
      ]
        .map((h) => h.replace(/^@/, "").toLowerCase())
        .filter(Boolean);
      const uniqueSeeds = [...new Set(seedHandles)].slice(0, MAX_SEED_HANDLES);

      const tweets: ResearchTweetSample[] = [];
      const isDemo = scanCtx?.isDemo ?? false;
      tweets.push(
        ...(await fetchSearchTweets(
          ctx,
          userId,
          isDemo,
          query,
          accessToken
        ))
      );
      for (const handle of uniqueSeeds) {
        tweets.push(
          ...(await fetchHandleTweets(
            ctx,
            userId,
            isDemo,
            handle,
            accessToken
          ))
        );
      }

      if (tweets.length === 0) {
        await ctx.runMutation(internal.research.markRunFailed, {
          runId,
          error: "No posts found for that query. Try different keywords.",
        });
        return;
      }

      const ranked = rankResearchProfiles(tweets, nicheKeywords, 30).slice(0, 10);
      const reasons = await synthesizeReasons(query, ranked, nicheKeywords);

      const profiles = ranked.map((p) => ({
        xUserId: p.xUserId,
        handle: p.handle,
        displayName: p.displayName,
        bio: p.bio,
        followers: p.followers,
        avgLikes: p.avgLikes,
        postFrequency: p.postFrequency,
        topicTags: p.topicTags,
        score: p.score,
        reason:
          reasons.get(p.handle.toLowerCase()) ??
          `Worth watching for ${query} — ${p.postFrequency.toLowerCase()}.`,
        exampleTweets: p.exampleTweets,
      }));

      await ctx.runMutation(internal.research.saveRunResults, {
        runId,
        userId,
        profiles,
      });
    } catch (error) {
      console.error("runResearch failed", { userId, runId, error });
      await captureConvexException(error, { action: "runResearch", userId, runId });
      await ctx.runMutation(internal.research.markRunFailed, {
        runId,
        error:
          error instanceof Error
            ? error.message
            : "Research run failed unexpectedly.",
      });
    }
  },
});
