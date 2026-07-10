import { afterEach, describe, expect, it, vi } from "vitest";
import {
  analyzeTweet,
  generateComposeOptions,
  generateOptions,
  rewriteText,
  type Analysis,
} from "../src/lib/ai";
import { DEMO_TWEETS } from "../shared/demoData";
import type { TopicCluster } from "../shared/compose";
import type { TweetBundle } from "../src/lib/x";

const tweet = DEMO_TWEETS[0];
const bundle: TweetBundle = {
  tweetId: tweet.id,
  authorName: tweet.authorName,
  authorHandle: tweet.authorHandle,
  authorFollowers: tweet.authorFollowers,
  authorBio: tweet.authorBio,
  text: tweet.text,
  postedAt: Date.now() - tweet.minutesAgo * 60_000,
  likes: tweet.likes,
  retweets: tweet.retweets,
  replies: tweet.replies,
  quotes: tweet.quotes,
  views: tweet.views,
  threadAncestors: [],
  topReplies: tweet.topReplies,
  isDemoData: false,
};

const analysis: Analysis = {
  summary: "A founder argues that workflow and data matter more than models.",
  topic: "AI startup moats",
  stance: "Workflow ownership is the real moat.",
  existingOpinions: ["Distribution can still win."],
  missingAngles: ["Operational data compounds only when it changes the workflow."],
};

const cluster: TopicCluster = {
  id: "cluster-demo",
  topic: "AI startup moats",
  reason: "Several saved replies discuss workflow ownership.",
  replies: [
    {
      draftId: "draft-demo",
      replyText: "Workflow is the moat when it captures decisions, not just prompts.",
      category: "Contrarian",
      publishedAt: Date.UTC(2026, 6, 10),
    },
  ],
  unusedAngles: ["Tie the moat to retained workflow context."],
};

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("forced demo AI fallback", () => {
  it("does not spend model tokens even when an Anthropic key is configured", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key-that-must-not-be-used");

    const analyzed = await analyzeTweet(bundle, { forceDemo: true });
    const generated = await generateOptions({
      kind: "reply",
      bundle,
      analysis,
      voice: null,
      voiceExamples: [],
      forceDemo: true,
    });
    const rewritten = await rewriteText({
      text: generated.options[0].content,
      direction: "shorter",
      bundle,
      voice: null,
      voiceExamples: [],
      forceDemo: true,
    });
    const composed = await generateComposeOptions({
      cluster,
      format: "standalone",
      voice: null,
      voiceExamples: [],
      forceDemo: true,
    });

    expect(analyzed.usage).toEqual({ tokensIn: 0, tokensOut: 0 });
    expect(generated.usage).toEqual({ tokensIn: 0, tokensOut: 0 });
    expect(generated.options).toHaveLength(3);
    expect(rewritten.usage).toEqual({ tokensIn: 0, tokensOut: 0 });
    expect(composed.usage).toEqual({ tokensIn: 0, tokensOut: 0 });
    expect(composed.demo).toBe(true);
  });
});
