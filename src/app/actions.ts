"use server";

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import {
  analyzeTweet,
  generateOptions,
  judgeModelEval,
  refineVoiceStyleLabels,
  rewriteText,
  REWRITE_DIRECTIONS,
  type RewriteDirection,
} from "@/lib/ai";
import { estimateCostUsd, isKnownModel, MODELS } from "../../shared/models";
import { hasProAccess } from "../../shared/billing";
import {
  captureServerException,
  trackServer,
} from "@/lib/analytics/server";
import { convexServer } from "@/lib/convex";
import { env, hasAnthropicKey } from "@/lib/env";
import { getSessionUser } from "@/lib/session";
import {
  fetchOwnedLists,
  fetchTweetBundle,
  fetchTweetReplySettings,
  fetchUserTweets,
  manualTweetBundle,
  type TweetBundle,
} from "@/lib/x";
import { DEMO_TWEETS } from "../../shared/demoData";
import { isGoalId, type GoalId } from "../../shared/onboarding";
import {
  parseTweetUrl,
  scoreConversation,
  topicRelevanceForKeywords,
} from "../../shared/scoring";
import {
  demoSemanticRelevance,
  resolveManualTopicRelevance,
  SEMANTIC_HAIKU_MODEL,
  type NicheContext,
  type SemanticScore,
} from "../../shared/semanticRelevance";
import { refreshAccessToken } from "../../shared/xOAuth";
import {
  buildVoiceNegativeConstraints,
  buildVoiceStyleFromTweets,
  normalizeNegativeConstraints,
  VOICE_PROMPT_EXAMPLES_MAX,
  type VoiceNegativeConstraints,
  type VoiceStyle,
} from "../../shared/voice";

async function requireSession() {
  const session = await getSessionUser();
  if (!session) redirect("/");
  return session;
}

async function resolveXAccessToken(sessionToken: string): Promise<string | null> {
  const convex = convexServer();
  const serverSecret = process.env.CONVEX_SERVER_TOKEN_ACCESS_SECRET;
  if (!serverSecret) return null;
  const auth = await convex.query(api.users.xAuthForServerSession, {
    sessionToken,
    serverSecret,
  });
  if (!auth || auth.isDemo || auth.expiresAt === 0) return null;

  if (auth.expiresAt > Date.now()) {
    return auth.accessToken;
  }

  if (!auth.refreshToken) return null;

  try {
    const refreshed = await refreshAccessToken(auth.refreshToken);
    await convex.mutation(api.users.persistXTokensFromSession, {
      sessionToken,
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken,
      expiresAt: refreshed.expiresAt,
      scope: refreshed.scope || auth.scope,
    });
    return refreshed.accessToken;
  } catch (error) {
    console.error("X token refresh failed:", error);
    return null;
  }
}

function bundleFromAnalysis(analysis: Doc<"tweetAnalyses">): TweetBundle {
  return {
    tweetId: analysis.tweetId,
    ...analysis.tweet,
    threadAncestors: analysis.threadAncestors ?? [],
    topReplies: analysis.topReplies,
    isDemoData: false,
  };
}

/**
 * Per-user generation preferences, resolved in one users.me read:
 * - model: explicit per-request override → saved default → undefined
 *   (env-configured default in ai.ts)
 * - goal: the onboarding goal, which leans generation tone + categories
 */
async function resolveGenerationPrefs(
  sessionToken: string,
  override?: string
): Promise<{ model: string | undefined; goal: GoalId | undefined }> {
  const me = await convexServer().query(api.users.me, { sessionToken });
  const saved = me?.defaultModel;
  const model =
    override && isKnownModel(override)
      ? override
      : saved && isKnownModel(saved)
        ? saved
        : undefined;
  return { model, goal: me?.goal };
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

function negativeConstraintsForProfile(
  profile: Doc<"voiceProfiles"> | null
): VoiceNegativeConstraints | undefined {
  if (!profile) return undefined;
  if (profile.bannedPhrases === undefined && profile.antiPatterns === undefined) {
    return undefined;
  }
  return normalizeNegativeConstraints({
    bannedPhrases: profile.bannedPhrases,
    antiPatterns: profile.antiPatterns,
  });
}

const ManualSemanticSchema = z.object({
  relevance: z.number().min(0).max(1),
  brandSafety: z.enum(["safe", "unsafe"]),
  reason: z.string(),
});

function buildManualSemanticPrompt(
  niche: NicheContext,
  text: string
): string {
  const nicheBlock = [
    niche.keywords.length > 0
      ? `Focus keywords: ${niche.keywords.join(", ")}`
      : null,
    niche.recentTopics.length > 0
      ? `Recent analysis topics: ${niche.recentTopics.join("; ")}`
      : null,
    niche.voiceTopics.length > 0
      ? `Voice / interest signals: ${niche.voiceTopics.slice(0, 12).join("; ")}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  return `Score this X post for niche relevance to the user's interests (0 = off-topic, 1 = perfect fit) and decide whether replying is brand-safe. Catch paraphrases — exact keyword overlap is NOT required.

USER NICHE:
${nicheBlock || "(general tech/builder audience)"}

POST:
"""${text}"""

Return a single JSON object.

Brand-safety rules:
- Mark "unsafe" for partisan politics, tragedy/disaster threads, outrage-bait, dogpiles, harassment, or culture-war fights.
- A niche policy/regulation discussion can still be "safe" when it is clearly professional and squarely inside the user's focus.
- Unsafe posts should have relevance 0.`;
}

async function buildManualNicheContext(sessionToken: string): Promise<NicheContext> {
  const convex = convexServer();
  const [scannerSettings, profiles, recentAnalyses] = await Promise.all([
    convex.query(api.scanner.settings, { sessionToken }),
    convex.query(api.voiceProfiles.list, { sessionToken }),
    convex.query(api.analyses.listRecent, { sessionToken, limit: 10 }),
  ]);

  const defaultProfile =
    profiles.find((profile) => profile.isDefault) ?? profiles[0] ?? null;

  const voiceTopics: string[] = [];
  if (defaultProfile) {
    voiceTopics.push(defaultProfile.name);
    voiceTopics.push(...defaultProfile.style.commonPhrases.slice(0, 8));
    for (const example of defaultProfile.examples.slice(0, 3)) {
      voiceTopics.push(example.slice(0, 80));
    }
  }

  const recentTopics = recentAnalyses
    .map((analysis) => analysis.topic.trim())
    .filter((topic) => topic.length > 0)
    .slice(0, 10);

  const keywords = [
    ...new Set([
      ...(scannerSettings?.keywords ?? []),
      ...(scannerSettings?.searchKeywords ?? []),
    ]),
  ];

  return { keywords, voiceTopics, recentTopics };
}

async function classifyManualSemanticRelevance(
  text: string,
  niche: NicheContext
): Promise<SemanticScore> {
  if (!hasAnthropicKey()) {
    return demoSemanticRelevance(text, niche);
  }

  try {
    const anthropic = new Anthropic({ apiKey: env.anthropicApiKey });
    const model = process.env.ANTHROPIC_SEMANTIC_MODEL ?? SEMANTIC_HAIKU_MODEL;
    const response = await anthropic.messages.create({
      model,
      max_tokens: 256,
      system:
        "You classify X posts for niche relevance. Output structured JSON only.",
      messages: [
        {
          role: "user",
          content: buildManualSemanticPrompt(niche, text),
        },
      ],
      output_config: { format: zodOutputFormat(ManualSemanticSchema) },
    });

    const block = response.content.find((item) => item.type === "text");
    if (!block || block.type !== "text") {
      throw new Error("Empty semantic classifier response");
    }
    return ManualSemanticSchema.parse(JSON.parse(block.text));
  } catch (error) {
    console.error("Manual semantic classification failed, falling back to demo", error);
    return demoSemanticRelevance(text, niche);
  }
}

// ---------------------------------------------------------------------------
// Analyze
// ---------------------------------------------------------------------------

// The analyze pipeline runs in two stages so the chat thread can render
// progressively via Convex reactivity (PRD §8): startAnalysisAction captures
// the tweet and creates the doc fast; continueAnalysisAction runs the AI
// stages, patching the doc as each completes. No token streaming needed.

export async function startAnalysisAction(input: {
  text?: string;
  url?: string;
  authorHandle?: string;
  authorFollowers?: number;
  projectId?: string;
}): Promise<{ analysisId: string } | { error: string }> {
  const { sessionToken } = await requireSession();
  const text = (input.text ?? "").trim();
  const url = (input.url ?? "").trim();
  const authorHandle = (input.authorHandle ?? "").trim();
  const authorFollowers = input.authorFollowers ?? 0;

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
        const accessToken = await resolveXAccessToken(sessionToken);
        if (accessToken) {
          replySettings = await fetchTweetReplySettings(urlTweetId, accessToken);
        }
      }
    } else {
      const accessToken = await resolveXAccessToken(sessionToken);
      bundle = await fetchTweetBundle(urlTweetId as string, accessToken);
      replySettings = bundle.replySettings;
    }

    // Score manual analyzes with the same signals the scanner uses: keyword
    // overlap plus semantic niche-fit, with a deterministic demo fallback
    // when the semantic classifier key is missing.
    const convex = convexServer();
    const [me, nicheContext] = await Promise.all([
      convex.query(api.users.me, { sessionToken }),
      buildManualNicheContext(sessionToken),
    ]);
    const keywordRelevance =
      nicheContext.keywords.length > 0
        ? topicRelevanceForKeywords(bundle.text, nicheContext.keywords)
        : 0;
    const semantic = await classifyManualSemanticRelevance(
      bundle.text,
      nicheContext
    );
    const topicRelevance = resolveManualTopicRelevance(
      keywordRelevance,
      semantic
    );

    const score = scoreConversation({
      followers: bundle.authorFollowers,
      likes: bundle.likes,
      retweets: bundle.retweets,
      replies: bundle.replies,
      quotes: bundle.quotes,
      ageMinutes: (Date.now() - bundle.postedAt) / 60_000,
      topicRelevance,
      brandSafety: semantic.brandSafety,
      goal: me?.goal,
    });

    const analysisId = await convex.mutation(api.analyses.start, {
      sessionToken,
      ...(input.projectId
        ? { projectId: input.projectId as Id<"projects"> }
        : {}),
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
      threadAncestors: bundle.threadAncestors,
      topReplies: bundle.topReplies,
      score: {
        value: score.value,
        reason: score.reason,
        factors: score.factors,
      },
      replySettings,
    });
    return { analysisId };
  } catch (error) {
    console.error("Start analysis failed:", error);
    return {
      error: "Couldn't capture that tweet. Check that Convex is running and try again.",
    };
  }
}

/**
 * Runs the AI stages for an analysis created by startAnalysisAction.
 * Resumable: re-runs only the stages whose results are missing, so Retry
 * after a failure and Resume after an abandoned tab both call this.
 */
export async function continueAnalysisAction(
  analysisId: string
): Promise<{ ok: true } | { error: string }> {
  const { sessionToken, user } = await requireSession();
  const convex = convexServer();
  const id = analysisId as Id<"tweetAnalyses">;

  const doc = await convex.query(api.analyses.get, {
    sessionToken,
    analysisId: id,
  });
  if (!doc) return { error: "Analysis not found." };
  if (doc.status === "complete" || doc.status === undefined) {
    return { ok: true };
  }

  try {
    const bundle = bundleFromAnalysis(doc);

    // Stage 1: conversation breakdown (skipped when already stored).
    let analysis = {
      summary: doc.summary,
      topic: doc.topic,
      stance: doc.stance,
      existingOpinions: doc.existingOpinions,
      missingAngles: doc.missingAngles,
    };
    if (!doc.summary) {
      const result = await analyzeTweet(bundle);
      analysis = result.analysis;
      await convex.mutation(api.analyses.setAnalysis, {
        sessionToken,
        analysisId: id,
        ...result.analysis,
      });
      await convex.mutation(api.usage.record, {
        sessionToken,
        tokensIn: result.usage.tokensIn,
        tokensOut: result.usage.tokensOut,
        analyses: 1,
        generations: 0,
      });
    }

    // Stage 2: initial options, 3 per kind (PRD: exactly 3 + "generate
    // more"). Each set is inserted the moment it resolves so the thread
    // shows replies while quotes are still generating.
    const existing = await convex.query(api.replies.listByAnalysis, {
      sessionToken,
      analysisId: id,
    });
    const { profile } = await defaultVoice(sessionToken);
    const voice = (profile?.style as VoiceStyle | undefined) ?? null;
    const examples = profile?.examples ?? [];
    const negativeConstraints = negativeConstraintsForProfile(profile);
    const { model, goal } = await resolveGenerationPrefs(sessionToken);

    const generateKind = async (kind: "reply" | "quote") => {
      if (existing.some((r) => r.kind === kind)) return;
      // Fired per kind, only when a generation call is actually about to
      // run — a retry where both kinds already exist (e.g. re-entering this
      // try block after analyses.complete failed) must not report a
      // generation that didn't happen.
      await trackServer("generation_requested", user._id, {
        analysisId: id,
        trigger: "initial",
        kind,
      });
      const result = await generateOptions({
        kind,
        bundle,
        analysis,
        voice,
        voiceExamples: examples,
        voiceNegativeConstraints: negativeConstraints,
        goal,
        model,
      });
      await convex.mutation(api.replies.insertMany, {
        sessionToken,
        analysisId: id,
        voiceProfileId: profile?._id,
        model,
        options: result.options.map((o) => ({ kind, ...o })),
      });
      await convex.mutation(api.usage.record, {
        sessionToken,
        tokensIn: result.usage.tokensIn,
        tokensOut: result.usage.tokensOut,
        analyses: 0,
        generations: result.options.length,
      });
    };
    await Promise.all([generateKind("reply"), generateKind("quote")]);

    await convex.mutation(api.analyses.complete, {
      sessionToken,
      analysisId: id,
    });
    return { ok: true };
  } catch (error) {
    console.error("Continue analysis failed:", error);
    captureServerException(error, { action: "continueAnalysis", analysisId: id });
    const message =
      "Analysis failed partway through. Nothing was lost — you can retry.";
    try {
      await convex.mutation(api.analyses.fail, {
        sessionToken,
        analysisId: id,
        error: message,
      });
    } catch {
      // The doc write failed too; the client still gets the error below.
    }
    return { error: message };
  }
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
  const { sessionToken, user } = await requireSession();
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
  const { model, goal } = await resolveGenerationPrefs(sessionToken, args.model);
  const negativeConstraints = negativeConstraintsForProfile(profile);

  await trackServer("generation_requested", user._id, {
    analysisId,
    trigger: "more",
    kind: args.kind,
  });
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
    voiceNegativeConstraints: negativeConstraints,
    goal,
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
  const { model } = await resolveGenerationPrefs(sessionToken, reply.model);
  const result = await rewriteText({
    text: reply.content,
    direction: direction as RewriteDirection,
    bundle: bundleFromAnalysis(analysis),
    voice: (profile?.style as VoiceStyle | undefined) ?? null,
    voiceExamples: profile?.examples ?? [],
    voiceNegativeConstraints: negativeConstraintsForProfile(profile),
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
  const negativeConstraints = negativeConstraintsForProfile(profile);
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
        voiceNegativeConstraints: negativeConstraints,
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
    voiceNegativeConstraints: negativeConstraints,
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
  category?: string;
}): Promise<string> {
  const { sessionToken, user } = await requireSession();
  const result = await convexServer().mutation(api.drafts.publish, {
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
  if (args.replyId) {
    await trackServer("option_selected", user._id, {
      analysisId: args.analysisId,
      replyId: args.replyId,
      kind: args.kind,
      category: args.category ?? "unknown",
      action: "published",
      editBucket: result.editBucket,
      editDistanceNormalized: result.editDistanceNormalized,
    });
  }
  revalidatePath("/dashboard");
  if (args.analysisId) revalidatePath(`/analysis/${args.analysisId}`);
  return result.draftId;
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
  category?: string;
}) {
  const { sessionToken, user } = await requireSession();
  const result = await convexServer().mutation(api.drafts.save, {
    sessionToken,
    text: args.text,
    kind: args.kind,
    analysisId: args.analysisId as Id<"tweetAnalyses"> | undefined,
    replyId: args.replyId as Id<"generatedReplies"> | undefined,
    targetTweetId: args.targetTweetId,
    targetTweetUrl: args.targetTweetUrl,
  });
  if (args.replyId) {
    await trackServer("option_selected", user._id, {
      analysisId: args.analysisId,
      replyId: args.replyId,
      kind: args.kind,
      category: args.category ?? "unknown",
      action: "saved",
      editBucket: result.editBucket,
      editDistanceNormalized: result.editDistanceNormalized,
    });
  }
  await trackServer("draft_saved", user._id, {
    analysisId: args.analysisId,
    replyId: args.replyId,
    kind: args.kind,
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

export async function updateDraftAction(draftId: string, text: string) {
  const { sessionToken } = await requireSession();
  await convexServer().mutation(api.drafts.updateContent, {
    sessionToken,
    draftId: draftId as Id<"savedDrafts">,
    text,
  });
  revalidatePath("/drafts");
}

// ---------------------------------------------------------------------------
// Voice profiles
// ---------------------------------------------------------------------------

export async function trainVoiceAction(name: string) {
  const { sessionToken } = await requireSession();
  const convex = convexServer();
  const auth = await convex.query(api.users.xAuthForSession, { sessionToken });
  const accessToken = await resolveXAccessToken(sessionToken);
  const tweets = await fetchUserTweets(auth?.xUserId ?? "", accessToken);
  const measuredStyle = buildVoiceStyleFromTweets(tweets);
  const { style } = await refineVoiceStyleLabels({
    style: measuredStyle,
    examples: tweets,
  });
  const constraints = buildVoiceNegativeConstraints(tweets, style);
  await convex.mutation(api.voiceProfiles.create, {
    sessionToken,
    name: name || "Trained voice",
    style,
    examples: tweets.slice(0, VOICE_PROMPT_EXAMPLES_MAX),
    ...constraints,
    source: "trained",
  });
  revalidatePath("/voice");
}

export async function createVoiceProfileAction(args: {
  name: string;
  style: VoiceStyle;
  examples: string[];
  negativeConstraints?: VoiceNegativeConstraints;
}) {
  const { sessionToken } = await requireSession();
  const constraints =
    args.negativeConstraints ?? buildVoiceNegativeConstraints(args.examples, args.style);
  await convexServer().mutation(api.voiceProfiles.create, {
    sessionToken,
    name: args.name,
    style: args.style,
    examples: args.examples,
    ...normalizeNegativeConstraints(constraints),
    source: "manual",
  });
  revalidatePath("/voice");
}

export async function updateVoiceProfileAction(args: {
  profileId: string;
  name: string;
  style: VoiceStyle;
  examples: string[];
  negativeConstraints: VoiceNegativeConstraints;
}) {
  const { sessionToken } = await requireSession();
  await convexServer().mutation(api.voiceProfiles.update, {
    sessionToken,
    profileId: args.profileId as Id<"voiceProfiles">,
    name: args.name,
    style: args.style,
    examples: args.examples,
    ...normalizeNegativeConstraints(args.negativeConstraints),
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
  searchKeywords?: string[];
}) {
  const { sessionToken } = await requireSession();
  const convex = convexServer();
  await convex.mutation(api.scanner.updateSettings, {
    sessionToken,
    enabled: args.enabled,
    keywords: args.keywords,
    ...(args.searchKeywords !== undefined
      ? { searchKeywords: args.searchKeywords }
      : {}),
  });
  if (args.enabled) {
    await convex.mutation(api.scanner.scanNow, { sessionToken });
  }
  revalidatePath("/feed");
}

export async function updateSearchKeywordsAction(searchKeywords: string[]) {
  const { sessionToken } = await requireSession();
  const convex = convexServer();
  const current = await convex.query(api.scanner.settings, { sessionToken });
  await convex.mutation(api.scanner.updateSettings, {
    sessionToken,
    enabled: current?.enabled ?? false,
    keywords: current?.keywords ?? [],
    searchKeywords,
  });
  revalidatePath("/feed");
}

export async function scanNowAction() {
  const { sessionToken } = await requireSession();
  await convexServer().mutation(api.scanner.scanNow, { sessionToken });
  revalidatePath("/feed");
}

export async function startProCheckoutAction() {
  const { sessionToken } = await requireSession();
  const result = await convexServer().action(
    api.billingNode.createCheckoutSession,
    {
      sessionToken,
      returnUrl: env.appUrl,
    }
  );
  redirect(result.url);
}

export async function openBillingPortalAction() {
  const { sessionToken } = await requireSession();
  const result = await convexServer().action(api.billingNode.createPortalSession, {
    sessionToken,
    returnUrl: env.appUrl,
  });
  redirect(result.url);
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

/** Lists owned by the connected X account, for the "import lists to engage" picker. */
export async function fetchOwnedListsAction(): Promise<{
  lists: { id: string; name: string }[];
  error?: string;
}> {
  const { sessionToken } = await requireSession();
  const auth = await convexServer().query(api.users.xAuthForSession, {
    sessionToken,
  });
  const accessToken = await resolveXAccessToken(sessionToken);
  return fetchOwnedLists(auth?.xUserId ?? "", accessToken);
}

export async function saveEngageListsAction(
  lists: { id: string; name: string }[]
) {
  const { sessionToken } = await requireSession();
  await convexServer().mutation(api.scanner.importEngageLists, {
    sessionToken,
    lists,
  });
  revalidatePath("/feed");
}

export async function updateWatchedHandlesAction(handles: string[]) {
  const { sessionToken } = await requireSession();
  await convexServer().mutation(api.scanner.updateWatchedHandles, {
    sessionToken,
    handles,
  });
  revalidatePath("/feed");
}

export async function updateEnabledSourcesAction(sources: string[]) {
  const { sessionToken } = await requireSession();
  const convex = convexServer();
  const current = await convex.query(api.scanner.settings, { sessionToken });
  await convex.mutation(api.scanner.updateSettings, {
    sessionToken,
    enabled: current?.enabled ?? false,
    keywords: current?.keywords ?? [],
    enabledSources: sources as (
      | "following"
      | "lists"
      | "watched"
      | "search"
    )[],
  });
  revalidatePath("/feed");
}

// ---------------------------------------------------------------------------
// Research agent
// ---------------------------------------------------------------------------

export async function runResearchAction(args: {
  query: string;
  seedHandle?: string;
}): Promise<string> {
  const { sessionToken } = await requireSession();
  const runId = await convexServer().mutation(api.research.startRun, {
    sessionToken,
    query: args.query,
    seedHandle: args.seedHandle,
  });
  revalidatePath("/research");
  return runId;
}

export async function watchResearchProfileAction(profileId: string) {
  const { sessionToken } = await requireSession();
  await convexServer().mutation(api.research.watchProfile, {
    sessionToken,
    profileId: profileId as Id<"researchProfiles">,
  });
  revalidatePath("/research");
  revalidatePath("/feed");
}

export async function passResearchProfileAction(profileId: string) {
  const { sessionToken } = await requireSession();
  await convexServer().mutation(api.research.passProfile, {
    sessionToken,
    profileId: profileId as Id<"researchProfiles">,
  });
  revalidatePath("/research");
}

// ---------------------------------------------------------------------------
// Onboarding
// ---------------------------------------------------------------------------

export async function setGoalAction(goal: string) {
  const { sessionToken } = await requireSession();
  if (!isGoalId(goal)) throw new Error("Unknown goal");
  await convexServer().mutation(api.users.setGoal, { sessionToken, goal });
}

export async function saveOnboardingNicheAction(keywords: string[]) {
  const { user, sessionToken } = await requireSession();
  const cleaned = [
    ...new Set(keywords.map((k) => k.trim().toLowerCase()).filter(Boolean)),
  ].slice(0, 12);
  if (cleaned.length === 0) return;
  await convexServer().mutation(api.scanner.updateSettings, {
    sessionToken,
    enabled: hasProAccess(user),
    keywords: cleaned,
  });
}

export type BuildModelResult = {
  postCount: number;
  style: VoiceStyle;
  profileName: string;
  usedSampleTweets: boolean;
};

/**
 * The onboarding "build your writing model" step. Runs the real training
 * pipeline (import or pasted posts → measured style → trained default
 * profile), kicks off a feed scan, and marks onboarding complete. Returns
 * real counts — the wizard shows these, never invented numbers.
 */
export async function buildWritingModelAction(args: {
  source: "import" | "paste";
  examples?: string[];
}): Promise<BuildModelResult> {
  const { user, sessionToken } = await requireSession();
  const convex = convexServer();

  let tweets: string[];
  if (args.source === "paste") {
    tweets = (args.examples ?? [])
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 50);
    if (tweets.length === 0) {
      throw new Error("Paste at least one post to train on");
    }
  } else {
    const auth = await convex.query(api.users.xAuthForSession, { sessionToken });
    const accessToken = await resolveXAccessToken(sessionToken);
    tweets = await fetchUserTweets(auth?.xUserId ?? "", accessToken);
  }
  // fetchUserTweets falls back to sample tweets without X credentials —
  // tell the UI so it can say so instead of implying we read the account.
  const usedSampleTweets =
    args.source === "import" &&
    tweets.length === DEMO_TWEETS.length &&
    tweets[0] === DEMO_TWEETS[0].text;

  const measuredStyle = buildVoiceStyleFromTweets(tweets);
  const { style } = await refineVoiceStyleLabels({
    style: measuredStyle,
    examples: tweets,
  });
  const constraints = buildVoiceNegativeConstraints(tweets, style);
  const profileName = `${user.displayName.split(" ")[0]}'s voice`;
  const profileId = await convex.mutation(api.voiceProfiles.create, {
    sessionToken,
    name: profileName,
    style,
    examples: tweets.slice(0, VOICE_PROMPT_EXAMPLES_MAX),
    ...constraints,
    source: "trained",
  });
  await convex.mutation(api.voiceProfiles.setDefault, {
    sessionToken,
    profileId,
  });
  if (hasProAccess(user)) {
    await convex.mutation(api.scanner.scanNow, { sessionToken });
  }
  await convex.mutation(api.users.completeOnboarding, { sessionToken });
  // No revalidatePath here: it would re-render /onboarding mid-wizard, and the
  // page guard (onboarding now complete) would yank the user to /dashboard
  // before the ready screen. Voice list and dashboard are live Convex queries.
  return { postCount: tweets.length, style, profileName, usedSampleTweets };
}

/** Skip the wizard — starter defaults from ensureDefaults stay in place. */
export async function skipOnboardingAction() {
  const { sessionToken } = await requireSession();
  await convexServer().mutation(api.users.completeOnboarding, { sessionToken });
}

export async function dismissSetupChecklistAction() {
  const { sessionToken } = await requireSession();
  await convexServer().mutation(api.users.dismissSetupChecklist, {
    sessionToken,
  });
  revalidatePath("/dashboard");
}
