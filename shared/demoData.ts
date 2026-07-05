/**
 * Deterministic demo tweets used when the app runs without X API
 * credentials (demo mode). Lets the whole product be exercised end to end —
 * analyze, generate, rewrite, publish — before real keys are configured.
 */

export type DemoTweet = {
  id: string;
  authorName: string;
  authorHandle: string;
  authorFollowers: number;
  authorBio: string;
  text: string;
  minutesAgo: number;
  likes: number;
  retweets: number;
  replies: number;
  quotes: number;
  views: number;
  topReplies: { authorHandle: string; text: string; likes: number }[];
};

export const DEMO_TWEETS: DemoTweet[] = [
  {
    id: "1800000000000000001",
    authorName: "Sarah Chen",
    authorHandle: "sarahbuilds",
    authorFollowers: 184000,
    authorBio: "Building AI products. Prev eng lead @stripe. Newsletter: 40k readers.",
    text: "Hot take: most AI startups aren't AI startups. They're UI wrappers with a prompt library. The moat isn't the model — it's the workflow you own and the data you accumulate. Very few founders want to hear this.",
    minutesAgo: 47,
    likes: 2841,
    retweets: 412,
    replies: 389,
    quotes: 97,
    views: 412000,
    topReplies: [
      { authorHandle: "devmarcus", text: "Counterpoint: wrappers that nail distribution win anyway. Perplexity was 'just a wrapper' too.", likes: 214 },
      { authorHandle: "aiskeptic", text: "The data moat argument is overrated. Most accumulated data is noise.", likes: 156 },
      { authorHandle: "founderjess", text: "This. We pivoted from 'AI-first' to 'workflow-first' and revenue 3x'd.", likes: 98 },
    ],
  },
  {
    id: "1800000000000000002",
    authorName: "Marcus Rivera",
    authorHandle: "marcusship",
    authorFollowers: 52000,
    authorBio: "Indie hacker. $38k MRR across 3 products. I share everything.",
    text: "Shipped a feature in 3 hours yesterday that a competitor spent 6 months building. Not because I'm better — because they had 4 meetings about it and I just wrote the code. Small teams don't win on talent. They win on iteration speed.",
    minutesAgo: 95,
    likes: 1203,
    retweets: 188,
    replies: 167,
    quotes: 41,
    views: 156000,
    topReplies: [
      { authorHandle: "bigco_eng", text: "Those 6 months included compliance review, i18n, and accessibility. Ship fast until you can't.", likes: 340 },
      { authorHandle: "solodev_amy", text: "The meetings ARE the product at big companies.", likes: 122 },
    ],
  },
  {
    id: "1800000000000000003",
    authorName: "Dr. Priya Nair",
    authorHandle: "priyaml",
    authorFollowers: 310000,
    authorBio: "ML researcher. Writing about what AI can and can't do. Opinions mine.",
    text: "Everyone is benchmarking models on coding tasks. Nobody is benchmarking them on maintaining code for 6 months. The second one is where all the money is, and where all the models still fall over.",
    minutesAgo: 22,
    likes: 4102,
    retweets: 890,
    replies: 445,
    quotes: 203,
    views: 680000,
    topReplies: [
      { authorHandle: "evalsguy", text: "SWE-bench long-horizon variants are coming. The infra to measure this is genuinely hard.", likes: 410 },
      { authorHandle: "cto_dan", text: "We tried an AI-maintained service for a quarter. The PR quality degraded as context rotted. Nobody talks about context rot.", likes: 380 },
      { authorHandle: "mlskeptic2", text: "Maintenance is 80% social, 20% code. Models can't attend standup.", likes: 190 },
    ],
  },
  {
    id: "1800000000000000004",
    authorName: "Tom Okafor",
    authorHandle: "tomgrows",
    authorFollowers: 89000,
    authorBio: "Growth at a Series B SaaS. Audience-building nerd. 0→90k followers in 2 years.",
    text: "Unpopular opinion: your replies are your best content. My original tweets get 5k views. My replies to big accounts get 50k. The algorithm rewards showing up in other people's conversations more than starting your own.",
    minutesAgo: 130,
    likes: 987,
    retweets: 145,
    replies: 210,
    quotes: 33,
    views: 98000,
    topReplies: [
      { authorHandle: "replyguy_pro", text: "Can confirm. 80% of my follower growth came from replies, not posts.", likes: 88 },
      { authorHandle: "contentqueen", text: "This only works if the reply adds something. Most reply-guys just say 'great point'.", likes: 176 },
    ],
  },
  {
    id: "1800000000000000005",
    authorName: "Lena Fischer",
    authorHandle: "lenacodes",
    authorFollowers: 27000,
    authorBio: "Staff engineer. I write about pragmatic software design and dev tooling.",
    text: "We deleted 40% of our test suite last month. Coverage went from 87% to 61%. Bug escape rate did not change. A huge fraction of tests exist to make a dashboard green, not to catch regressions. Measure what your tests actually catch.",
    minutesAgo: 310,
    likes: 3320,
    retweets: 512,
    replies: 298,
    quotes: 156,
    views: 420000,
    topReplies: [
      { authorHandle: "tdd4life", text: "Survivorship bias — the bugs those tests would have caught were prevented at write-time.", likes: 502 },
      { authorHandle: "qa_veteran", text: "The real signal: how many tests failed in the last year for a real reason vs. flakiness.", likes: 260 },
    ],
  },
  {
    id: "1800000000000000006",
    authorName: "Alex Kim",
    authorHandle: "alexvc",
    authorFollowers: 145000,
    authorBio: "Early-stage investor. Ex-founder (acquired). I back weird ideas.",
    text: "Founders keep asking what AI features to add. Wrong question. Ask: what does my product do that gets 10x cheaper when intelligence is free? That's your roadmap. Everything else is a demo for your board.",
    minutesAgo: 75,
    likes: 1876,
    retweets: 334,
    replies: 156,
    quotes: 89,
    views: 240000,
    topReplies: [
      { authorHandle: "saasfounder22", text: "We asked this question and ended up rebuilding onboarding, not adding a chatbot. Retention +18%.", likes: 145 },
      { authorHandle: "pmthoughts", text: "'A demo for your board' is brutal and accurate.", likes: 93 },
    ],
  },
];

export function demoTweetById(id: string): DemoTweet | null {
  return DEMO_TWEETS.find((t) => t.id === id) ?? null;
}

/** Deterministically pick a demo tweet for an arbitrary tweet ID. */
export function demoTweetForId(id: string): DemoTweet {
  const exact = demoTweetById(id);
  if (exact) return exact;
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return DEMO_TWEETS[hash % DEMO_TWEETS.length];
}

export type DemoList = { id: string; name: string };

export const DEMO_LISTS: DemoList[] = [
  { id: "demo-list-1", name: "AI Builders" },
  { id: "demo-list-2", name: "Indie Hackers" },
];

export const DEMO_WATCHED_HANDLES: string[] = ["sarahbuilds", "priyaml"];

/** Deterministic, non-random split of DEMO_TWEETS by demo list id. */
export function demoListTweets(listId: string): DemoTweet[] {
  const byHandle = (handles: string[]): DemoTweet[] =>
    DEMO_TWEETS.filter((t) => handles.includes(t.authorHandle));

  switch (listId) {
    case "demo-list-1":
      return byHandle(["marcusship", "tomgrows"]);
    case "demo-list-2":
      return byHandle(["lenacodes", "alexvc"]);
    default:
      return [];
  }
}

/** Demo tweets matching a discovery search keyword. */
export function demoSearchTweets(keyword: string): DemoTweet[] {
  const q = keyword.trim().toLowerCase();
  if (!q) return [];
  return DEMO_TWEETS.filter(
    (t) =>
      t.text.toLowerCase().includes(q) ||
      t.authorHandle.toLowerCase().includes(q) ||
      t.authorBio.toLowerCase().includes(q)
  ).slice(0, 5);
}

export type DemoResearchProfile = {
  handle: string;
  displayName: string;
  bio: string;
  followers: number;
  avgLikes: number;
  postFrequency: string;
  topicTags: string[];
  score: number;
  reason: string;
  exampleTweets: { tweetId: string; text: string; likes: number }[];
};

/** Fixed profiles for demo research runs — no X/Anthropic required. */
export function demoResearchProfiles(query: string): DemoResearchProfile[] {
  const q = query.toLowerCase();
  const pick = (handle: string): DemoTweet | undefined =>
    DEMO_TWEETS.find((t) => t.authorHandle === handle);

  const profiles: DemoResearchProfile[] = [
    {
      handle: "sarahbuilds",
      displayName: pick("sarahbuilds")?.authorName ?? "Sarah Chen",
      bio: pick("sarahbuilds")?.authorBio ?? "",
      followers: pick("sarahbuilds")?.authorFollowers ?? 184000,
      avgLikes: 2100,
      postFrequency: "Active this week",
      topicTags: ["ai", "startup"],
      score: 88,
      reason:
        "Posts sharp AI product takes with high engagement — good for thoughtful replies in your niche.",
      exampleTweets: DEMO_TWEETS.filter((t) => t.authorHandle === "sarahbuilds")
        .slice(0, 1)
        .map((t) => ({ tweetId: t.id, text: t.text, likes: t.likes })),
    },
    {
      handle: "priyaml",
      displayName: pick("priyaml")?.authorName ?? "Dr. Priya Nair",
      bio: pick("priyaml")?.authorBio ?? "",
      followers: pick("priyaml")?.authorFollowers ?? 310000,
      avgLikes: 3200,
      postFrequency: "Active this week",
      topicTags: ["ai", "ml"],
      score: 85,
      reason:
        "Research-grade ML commentary — strong audience, threads stay open long enough to add a credible angle.",
      exampleTweets: DEMO_TWEETS.filter((t) => t.authorHandle === "priyaml")
        .slice(0, 1)
        .map((t) => ({ tweetId: t.id, text: t.text, likes: t.likes })),
    },
    {
      handle: "marcusship",
      displayName: pick("marcusship")?.authorName ?? "Marcus Rivera",
      bio: pick("marcusship")?.authorBio ?? "",
      followers: pick("marcusship")?.authorFollowers ?? 52000,
      avgLikes: 900,
      postFrequency: "Active this week",
      topicTags: ["startup", "build"],
      score: 79,
      reason:
        "Indie builder with fast-shipping stories — reply-friendly threads, mid-size audience.",
      exampleTweets: DEMO_TWEETS.filter((t) => t.authorHandle === "marcusship")
        .slice(0, 1)
        .map((t) => ({ tweetId: t.id, text: t.text, likes: t.likes })),
    },
    {
      handle: "lenacodes",
      displayName: pick("lenacodes")?.authorName ?? "Lena Fischer",
      bio: pick("lenacodes")?.authorBio ?? "",
      followers: pick("lenacodes")?.authorFollowers ?? 27000,
      avgLikes: 1800,
      postFrequency: "Occasional poster",
      topicTags: ["engineering", "product"],
      score: 74,
      reason:
        "Pragmatic engineering posts — contrarian angles perform well in her replies.",
      exampleTweets: DEMO_TWEETS.filter((t) => t.authorHandle === "lenacodes")
        .slice(0, 1)
        .map((t) => ({ tweetId: t.id, text: t.text, likes: t.likes })),
    },
    {
      handle: "alexvc",
      displayName: pick("alexvc")?.authorName ?? "Alex Kim",
      bio: pick("alexvc")?.authorBio ?? "",
      followers: pick("alexvc")?.authorFollowers ?? 145000,
      avgLikes: 1400,
      postFrequency: "Active this week",
      topicTags: ["ai", "saas"],
      score: 72,
      reason:
        "Investor-founder lens on AI roadmaps — good for adding a builder's perspective.",
      exampleTweets: DEMO_TWEETS.filter((t) => t.authorHandle === "alexvc")
        .slice(0, 1)
        .map((t) => ({ tweetId: t.id, text: t.text, likes: t.likes })),
    },
  ];

  if (!q) return profiles;
  const filtered = profiles.filter(
    (p) =>
      p.topicTags.some((t) => q.includes(t)) ||
      p.bio.toLowerCase().includes(q) ||
      p.displayName.toLowerCase().includes(q) ||
      p.reason.toLowerCase().includes(q)
  );
  return filtered.length > 0 ? filtered : profiles;
}
