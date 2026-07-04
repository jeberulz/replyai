"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import {
  analyzeTweet,
  generateOptions,
  judgeModelEval,
  rewriteText,
  REWRITE_DIRECTIONS,
  type RewriteDirection,
} from "@/lib/ai";
import { estimateCostUsd, isKnownModel, MODELS } from "../../shared/models";
import { convexServer } from "@/lib/convex";
import { getSessionUser } from "@/lib/session";
import {
  fetchTweetBundle,
  fetchTweetReplySettings,
  fetchUserTweets,
  manualTweetBundle,
  type TweetBundle,
} from "@/lib/x";
import { parseTweetUrl, scoreConversation } from "../../shared/scoring";
import { buildVoiceStyleFromTweets, type VoiceStyle } from "../../shared/voice";

async function requireSession() {
  const session = await getSessionUser();
  if (!session) redirect("/");
  return session;
}

async function xAccessToken(sessionToken: string): Promise<string | null> {
  const auth = await convexServer().query(api.users.xAuthForSession, {
    sessionToken,
  });
  return auth?.accessToken ?? null;
}

function bundleFromAnalysis(analysis: Doc<"tweetAnalyses">): TweetBundle {
  return {
    tweetId: analysis.tweetId,
    ...analysis.tweet,
    topReplies: analysis.topReplies,
    isDemoData: false,
  };
}

/**
 * Resolve which Claude model to generate with: explicit per-request override
 * → the user's saved default → undefined (env-configured default in ai.ts).
 */
async function resolveModel(
  sessionToken: string,
  override?: string
): Promise<string | undefined> {
  if (override && isKnownModel(override)) return override;
  const me = await convexServer().query(api.users.me, { sessionToken });
  const saved = me?.defaultModel;
  return saved && isKnownModel(saved) ? saved : undefined;
}

async function defaultVoice(
  sessionToken: string,
  voiceProfileId?: string
): Promise<{ profile: Doc<"voiceProfiles"> | null }> {
  const profiles = await convexServer().query(api.voiceProfiles.list, {
    sessionToken,
  });
  const profile = voiceProfileId
    ? (profiles.find((p) => p._id === voiceProfileId) ?? null)
    : (profiles.find((p) => p.isDefault) ?? profiles[0] ?? null);
  return { profile };
}

// ---------------------------------------------------------------------------
// Analyze
// ---------------------------------------------------------------------------

export async function analyzeTweetAction(
  _prev: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string } | null> {
  const { sessionToken } = await requireSession();
  const text = String(formData.get("text") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();
  const authorHandle = String(formData.get("authorHandle") ?? "").trim();
  const followersRaw = String(formData.get("authorFollowers") ?? "").replace(
    /[^0-9]/g,
    ""
  );
  const authorFollowers = followersRaw ? Number(followersRaw) : 0;

  const urlTweetId = url ? parseTweetUrl(url) : null;
  if (!text && !url) {
    return { error: "Paste the tweet text (recommended), or a tweet URL." };
  }
  if (!text && !urlTweetId) {
    return {
      error:
        "That doesn't look like a tweet URL (expected x.com/user/status/…). Or just paste the tweet text.",
    };
  }

  const convex = convexServer();
  let analysisId: Id<"tweetAnalyses">;
  try {
    let bundle: TweetBundle;
    let replySettings: string | undefined;
    if (text) {
      // Paste-text path: analyze the real tweet without a paid X read tier.
      bundle = manualTweetBundle({
        tweetId: urlTweetId ?? `manual-${Date.now()}`,
        text,
        authorHandle,
        authorFollowers,
      });
      if (urlTweetId) {
        const accessToken = await xAccessToken(sessionToken);
        if (accessToken) {
          replySettings = await fetchTweetReplySettings(urlTweetId, accessToken);
        }
      }
    } else {
      const accessToken = await xAccessToken(sessionToken);
      bundle = await fetchTweetBundle(urlTweetId as string, accessToken);
      replySettings = bundle.replySettings;
    }

    const { analysis, usage } = await analyzeTweet(bundle);
    const score = scoreConversation({
      followers: bundle.authorFollowers,
      likes: bundle.likes,
      retweets: bundle.retweets,
      replies: bundle.replies,
      quotes: bundle.quotes,
      ageMinutes: (Date.now() - bundle.postedAt) / 60_000,
    });

    analysisId = await convex.mutation(api.analyses.create, {
      sessionToken,
      tweetUrl: url,
      tweetId: bundle.tweetId,
      tweet: {
        authorName: bundle.authorName,
        authorHandle: bundle.authorHandle,
        authorAvatar: bundle.authorAvatar,
        authorFollowers: bundle.authorFollowers,
        authorBio: bundle.authorBio,
        text: bundle.text,
        postedAt: bundle.postedAt,
        likes: bundle.likes,
        retweets: bundle.retweets,
        replies: bundle.replies,
        quotes: bundle.quotes,
        views: bundle.views,
        mediaText: bundle.mediaText,
      },
      topReplies: bundle.topReplies,
      summary: analysis.summary,
      topic: analysis.topic,
      stance: analysis.stance,
      existingOpinions: analysis.existingOpinions,
      missingAngles: analysis.missingAngles,
      score: {
        value: score.value,
        reason: score.reason,
        factors: score.factors,
      },
      replySettings,
    });

    // Generate the initial 3 replies and 3 quote tweets. The tweet context
    // block is cache-marked, so these reuse the analysis call's prefix.
    const { profile } = await defaultVoice(sessionToken);
    const voice = (profile?.style as VoiceStyle | undefined) ?? null;
    const examples = profile?.examples ?? [];
    const model = await resolveModel(sessionToken);

    const [replies, quotes] = await Promise.all([
      generateOptions({
        kind: "reply",
        bundle,
        analysis,
        voice,
        voiceExamples: examples,
        model,
      }),
      generateOptions({
        kind: "quote",
        bundle,
        analysis,
        voice,
        voiceExamples: examples,
        model,
      }),
    ]);

    for (const [kind, result] of [
      ["reply", replies],
      ["quote", quotes],
    ] as const) {
      await convex.mutation(api.replies.insertMany, {
        sessionToken,
        analysisId,
        voiceProfileId: profile?._id,
        model,
        options: result.options.map((o) => ({ kind, ...o })),
      });
    }

    await convex.mutation(api.usage.record, {
      sessionToken,
      tokensIn: usage.tokensIn + replies.usage.tokensIn + quotes.usage.tokensIn,
      tokensOut: usage.tokensOut + replies.usage.tokensOut + quotes.usage.tokensOut,
      analyses: 1,
      generations: replies.options.length + quotes.options.length,
    });
  } catch (error) {
    console.error("Analyze failed:", error);
    return { error: "Analysis failed. Check that Convex is running and try again." };
  }

  redirect(`/analysis/${analysisId}`);
}

// ---------------------------------------------------------------------------
// Generate more
// ---------------------------------------------------------------------------

export async function generateMoreAction(args: {
  analysisId: string;
  kind: "reply" | "quote";
  voiceProfileId?: string;
  model?: string;
}) {
  const { sessionToken } = await requireSession();
  const convex = convexServer();
  const analysisId = args.analysisId as Id<"tweetAnalyses">;

  const analysis = await convex.query(api.analyses.get, {
    sessionToken,
    analysisId,
  });
  if (!analysis) throw new Error("Analysis not found");

  const existing = await convex.query(api.replies.listByAnalysis, {
    sessionToken,
    analysisId,
  });
  const { profile } = await defaultVoice(sessionToken, args.voiceProfileId);
  const model = await resolveModel(sessionToken, args.model);

  const bundle = bundleFromAnalysis(analysis);
  const result = await generateOptions({
    kind: args.kind,
    bundle,
    analysis: {
      summary: analysis.summary,
      topic: analysis.topic,
      stance: analysis.stance,
      existingOpinions: analysis.existingOpinions,
      missingAngles: analysis.missingAngles,
    },
    voice: (profile?.style as VoiceStyle | undefined) ?? null,
    voiceExamples: profile?.examples ?? [],
    avoidContents: existing
      .filter((r) => r.kind === args.kind)
      .map((r) => r.content),
    model,
  });

  await convex.mutation(api.replies.insertMany, {
    sessionToken,
    analysisId,
    voiceProfileId: profile?._id,
    model,
    options: result.options.map((o) => ({ kind: args.kind, ...o })),
  });
  await convex.mutation(api.usage.record, {
    sessionToken,
    tokensIn: result.usage.tokensIn,
    tokensOut: result.usage.tokensOut,
    analyses: 0,
    generations: result.options.length,
  });
  revalidatePath(`/analysis/${args.analysisId}`);
}

// ---------------------------------------------------------------------------
// Rewrite / edit
// ---------------------------------------------------------------------------

export async function rewriteAction(args: {
  replyId: string;
  analysisId: string;
  direction: string;
}) {
  const { sessionToken } = await requireSession();
  const convex = convexServer();
  const direction = REWRITE_DIRECTIONS.find((d) => d === args.direction);
  if (!direction) throw new Error("Unknown rewrite direction");

  const analysis = await convex.query(api.analyses.get, {
    sessionToken,
    analysisId: args.analysisId as Id<"tweetAnalyses">,
  });
  if (!analysis) throw new Error("Analysis not found");
  const replies = await convex.query(api.replies.listByAnalysis, {
    sessionToken,
    analysisId: analysis._id,
  });
  const reply = replies.find((r) => r._id === args.replyId);
  if (!reply) throw new Error("Reply not found");

  const { profile } = await defaultVoice(sessionToken, reply.voiceProfileId);
  const model = await resolveModel(sessionToken, reply.model);
  const result = await rewriteText({
    text: reply.content,
    direction: direction as RewriteDirection,
    bundle: bundleFromAnalysis(analysis),
    voice: (profile?.style as VoiceStyle | undefined) ?? null,
    model,
  });

  await convex.mutation(api.replies.updateContent, {
    sessionToken,
    replyId: reply._id,
    content: result.text,
    markEdited: false,
  });
  await convex.mutation(api.usage.record, {
    sessionToken,
    tokensIn: result.usage.tokensIn,
    tokensOut: result.usage.tokensOut,
    analyses: 0,
    generations: 1,
  });
  revalidatePath(`/analysis/${args.analysisId}`);
}

export async function saveEditAction(args: {
  replyId: string;
  analysisId: string;
  content: string;
}) {
  const { sessionToken } = await requireSession();
  await convexServer().mutation(api.replies.updateContent, {
    sessionToken,
    replyId: args.replyId as Id<"generatedReplies">,
    content: args.content,
    markEdited: true,
  });
  revalidatePath(`/analysis/${args.analysisId}`);
}

// ---------------------------------------------------------------------------
// Model selection & eval
// ---------------------------------------------------------------------------

export async function setDefaultModelAction(model: string) {
  const { sessionToken } = await requireSession();
  if (!isKnownModel(model)) throw new Error("Unknown model");
  await convexServer().mutation(api.users.setDefaultModel, {
    sessionToken,
    model,
  });
  revalidatePath("/settings");
}

/**
 * Run the same reply generation across every catalog model against one
 * analysis, blind-judge the sets with the analyze-tier model, and store the
 * comparison (quality score + actual cost per run). Powers the "which model
 * is good enough?" decision.
 */
export async function runModelEvalAction(analysisId: string) {
  const { sessionToken } = await requireSession();
  const convex = convexServer();

  const analysis = await convex.query(api.analyses.get, {
    sessionToken,
    analysisId: analysisId as Id<"tweetAnalyses">,
  });
  if (!analysis) throw new Error("Analysis not found");

  const { profile } = await defaultVoice(sessionToken);
  const voice = (profile?.style as VoiceStyle | undefined) ?? null;
  const examples = profile?.examples ?? [];
  const bundle = bundleFromAnalysis(analysis);
  const analysisInput = {
    summary: analysis.summary,
    topic: analysis.topic,
    stance: analysis.stance,
    existingOpinions: analysis.existingOpinions,
    missingAngles: analysis.missingAngles,
  };

  // Same generation, once per catalog model. The shared tweet-context block
  // is cache-marked, so the per-model cost is mostly output tokens.
  const runs = await Promise.all(
    MODELS.map(async (m) => {
      const result = await generateOptions({
        kind: "reply",
        bundle,
        analysis: analysisInput,
        voice,
        voiceExamples: examples,
        model: m.id,
      });
      return { model: m.id, ...result };
    })
  );

  const { verdict, usage: judgeUsage, judgeModel } = await judgeModelEval({
    bundle,
    analysis: analysisInput,
    voice,
    voiceExamples: examples,
    candidates: runs.map((r) => ({ model: r.model, options: r.options })),
  });

  const scoreFor = (model: string) =>
    verdict.scores.find((s) => s.model === model);

  await convex.mutation(api.evals.save, {
    sessionToken,
    analysisId: analysis._id,
    judgeModel,
    candidates: runs.map((r) => ({
      model: r.model,
      options: r.options,
      tokensIn: r.usage.tokensIn,
      tokensOut: r.usage.tokensOut,
      costUsd: estimateCostUsd(r.model, r.usage.tokensIn, r.usage.tokensOut),
      score: scoreFor(r.model)?.score ?? 0,
      notes: scoreFor(r.model)?.notes ?? "",
    })),
    winnerModel: verdict.winnerModel,
    summary: verdict.summary,
  });

  const totalIn =
    runs.reduce((n, r) => n + r.usage.tokensIn, 0) + judgeUsage.tokensIn;
  const totalOut =
    runs.reduce((n, r) => n + r.usage.tokensOut, 0) + judgeUsage.tokensOut;
  await convex.mutation(api.usage.record, {
    sessionToken,
    tokensIn: totalIn,
    tokensOut: totalOut,
    analyses: 0,
    generations: runs.reduce((n, r) => n + r.options.length, 0),
  });

  revalidatePath(`/analysis/${analysisId}`);
}

// ---------------------------------------------------------------------------
// Publish / drafts — always triggered by an explicit user click (PRD §10)
// ---------------------------------------------------------------------------

export async function publishAction(args: {
  text: string;
  kind: "reply" | "quote";
  analysisId?: string;
  replyId?: string;
  targetTweetId?: string;
  targetTweetUrl?: string;
  scheduledFor?: number;
  publishMode?: "threaded" | "standalone" | "url_quote";
}): Promise<string> {
  const { sessionToken } = await requireSession();
  const draftId = await convexServer().mutation(api.drafts.publish, {
    sessionToken,
    text: args.text,
    kind: args.kind,
    analysisId: args.analysisId as Id<"tweetAnalyses"> | undefined,
    replyId: args.replyId as Id<"generatedReplies"> | undefined,
    targetTweetId: args.targetTweetId,
    targetTweetUrl: args.targetTweetUrl,
    scheduledFor: args.scheduledFor,
    publishMode: args.publishMode,
  });
  revalidatePath("/dashboard");
  if (args.analysisId) revalidatePath(`/analysis/${args.analysisId}`);
  return draftId;
}

export async function retryDraftAsStandaloneAction(draftId: string) {
  const { sessionToken } = await requireSession();
  await convexServer().mutation(api.drafts.retryAsStandalone, {
    sessionToken,
    draftId: draftId as Id<"savedDrafts">,
  });
  revalidatePath("/dashboard");
}

export async function saveDraftAction(args: {
  text: string;
  kind: "reply" | "quote";
  analysisId?: string;
  replyId?: string;
  targetTweetId?: string;
  targetTweetUrl?: string;
}) {
  const { sessionToken } = await requireSession();
  await convexServer().mutation(api.drafts.save, {
    sessionToken,
    text: args.text,
    kind: args.kind,
    analysisId: args.analysisId as Id<"tweetAnalyses"> | undefined,
    replyId: args.replyId as Id<"generatedReplies"> | undefined,
    targetTweetId: args.targetTweetId,
    targetTweetUrl: args.targetTweetUrl,
  });
  revalidatePath("/dashboard");
}

export async function deleteDraftAction(draftId: string) {
  const { sessionToken } = await requireSession();
  await convexServer().mutation(api.drafts.remove, {
    sessionToken,
    draftId: draftId as Id<"savedDrafts">,
  });
  revalidatePath("/dashboard");
}

// ---------------------------------------------------------------------------
// Voice profiles
// ---------------------------------------------------------------------------

export async function trainVoiceAction(name: string) {
  const { sessionToken } = await requireSession();
  const convex = convexServer();
  const auth = await convex.query(api.users.xAuthForSession, { sessionToken });
  const tweets = await fetchUserTweets(auth?.xUserId ?? "", auth?.accessToken ?? null);
  const style = buildVoiceStyleFromTweets(tweets);
  await convex.mutation(api.voiceProfiles.create, {
    sessionToken,
    name: name || "Trained voice",
    style,
    examples: tweets.slice(0, 8),
    source: "trained",
  });
  revalidatePath("/voice");
}

export async function createVoiceProfileAction(args: {
  name: string;
  style: VoiceStyle;
  examples: string[];
}) {
  const { sessionToken } = await requireSession();
  await convexServer().mutation(api.voiceProfiles.create, {
    sessionToken,
    name: args.name,
    style: args.style,
    examples: args.examples,
    source: "manual",
  });
  revalidatePath("/voice");
}

export async function updateVoiceProfileAction(args: {
  profileId: string;
  name: string;
  style: VoiceStyle;
  examples: string[];
}) {
  const { sessionToken } = await requireSession();
  await convexServer().mutation(api.voiceProfiles.update, {
    sessionToken,
    profileId: args.profileId as Id<"voiceProfiles">,
    name: args.name,
    style: args.style,
    examples: args.examples,
  });
  revalidatePath("/voice");
}

export async function setDefaultVoiceAction(profileId: string) {
  const { sessionToken } = await requireSession();
  await convexServer().mutation(api.voiceProfiles.setDefault, {
    sessionToken,
    profileId: profileId as Id<"voiceProfiles">,
  });
  revalidatePath("/voice");
}

export async function deleteVoiceProfileAction(profileId: string) {
  const { sessionToken } = await requireSession();
  await convexServer().mutation(api.voiceProfiles.remove, {
    sessionToken,
    profileId: profileId as Id<"voiceProfiles">,
  });
  revalidatePath("/voice");
}

// ---------------------------------------------------------------------------
// Feed scanner
// ---------------------------------------------------------------------------

export async function updateScannerAction(args: {
  enabled: boolean;
  keywords: string[];
}) {
  const { sessionToken } = await requireSession();
  const convex = convexServer();
  await convex.mutation(api.scanner.updateSettings, {
    sessionToken,
    enabled: args.enabled,
    keywords: args.keywords,
  });
  if (args.enabled) {
    await convex.mutation(api.scanner.scanNow, { sessionToken });
  }
  revalidatePath("/feed");
}

export async function scanNowAction() {
  const { sessionToken } = await requireSession();
  await convexServer().mutation(api.scanner.scanNow, { sessionToken });
  revalidatePath("/feed");
}

export async function dismissOpportunityAction(opportunityId: string) {
  const { sessionToken } = await requireSession();
  await convexServer().mutation(api.opportunities.dismiss, {
    sessionToken,
    opportunityId: opportunityId as Id<"opportunities">,
  });
  revalidatePath("/feed");
  revalidatePath("/dashboard");
}
