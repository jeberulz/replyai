"use node";

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { v } from "convex/values";
import { z } from "zod";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalAction, type ActionCtx } from "./_generated/server";
import { demoResearchProfiles } from "../shared/demoData";
import {
  rankResearchProfiles,
  type ResearchTweetSample,
  type ScoredResearchProfile,
} from "../shared/researchScoring";
import { refreshAccessToken } from "../shared/xOAuth";

const MAX_SEED_HANDLES = 5;
const RESEARCH_MODEL = process.env.ANTHROPIC_RESEARCH_MODEL ?? "claude-sonnet-5";

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
  query: string,
  accessToken: string
): Promise<ResearchTweetSample[]> {
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
  if (!res.ok) return [];
  const json = (await res.json()) as XTimelineResponse;
  return mapSearchResponse(json);
}

async function fetchHandleTweets(
  handle: string,
  accessToken: string
): Promise<ResearchTweetSample[]> {
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
  if (!res.ok) return [];
  const json = (await res.json()) as XTimelineResponse;
  return mapSearchResponse(json);
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
      tweets.push(...(await fetchSearchTweets(query, accessToken)));
      for (const handle of uniqueSeeds) {
        tweets.push(...(await fetchHandleTweets(handle, accessToken)));
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
