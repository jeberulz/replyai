/**
 * Reply-to-post ladder (WP23) — pure clustering + demo fixtures.
 *
 * Winning replies (responded + low edit distance) and unused missing-angles
 * are clustered by topic, then fed into voice-matched compose generation.
 */

export const COMPOSE_FORMATS = ["standalone", "thread", "longform"] as const;
export type ComposeFormat = (typeof COMPOSE_FORMATS)[number];

export const COMPOSE_OPTION_COUNT = 3;
export const THREAD_MIN_POSTS = 4;
export const THREAD_MAX_POSTS = 8;

/** One published reply eligible as compose source material. */
export type WinningReplyRow = {
  draftId: string;
  analysisId?: string;
  publishedTweetId?: string;
  publishedAt: number;
  replyText: string;
  topic: string;
  missingAngles: string[];
  /** Angle actually taken in the sent reply, when known. */
  usedAngle?: string;
  category?: string;
  editBucket?: "no_edit" | "minor_edit" | "major_edit" | null;
  responded: boolean;
  targetAuthorHandle?: string;
};

export type ComposeSourceReply = {
  draftId: string;
  analysisId?: string;
  replyText: string;
  usedAngle?: string;
  category?: string;
  publishedAt: number;
  targetAuthorHandle?: string;
};

export type TopicCluster = {
  /** Stable slug for UI keys / compose run input. */
  id: string;
  topic: string;
  replies: ComposeSourceReply[];
  /** Missing angles from source analyses that no winning reply used. */
  unusedAngles: string[];
  /** Short human summary of why this cluster is worth composing from. */
  reason: string;
};

export type ComposeStandaloneOption = {
  category: string;
  content: string;
  reason: string;
};

export type ComposeThreadOption = {
  category: string;
  posts: string[];
  reason: string;
};

export type ComposeLongformOption = {
  category: string;
  title: string;
  content: string;
  reason: string;
};

export type ComposeBundle = {
  format: ComposeFormat;
  standalone: ComposeStandaloneOption[];
  thread: ComposeThreadOption[];
  longform: ComposeLongformOption[];
};

const WINNING_EDIT_BUCKETS = new Set(["no_edit", "minor_edit"]);

/** Eligible when the author responded and the user barely edited. */
export function isWinningReply(row: WinningReplyRow): boolean {
  if (!row.responded) return false;
  if (!row.replyText.trim()) return false;
  const bucket = row.editBucket ?? null;
  if (bucket === "major_edit") return false;
  // Legacy rows without editBucket still count if responded.
  if (bucket !== null && !WINNING_EDIT_BUCKETS.has(bucket)) return false;
  return true;
}

function normalizeTopic(topic: string): string {
  return topic.trim().toLowerCase().replace(/\s+/g, " ");
}

function slugifyTopic(topic: string): string {
  const slug = normalizeTopic(topic)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || "untitled";
}

function normalizeAngle(angle: string): string {
  return angle.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Angles listed on analyses that no winning reply in the cluster used.
 * Fuzzy: substring / equality on normalized text.
 */
export function pickUnusedAngles(
  missingAngles: string[],
  usedAngles: Array<string | undefined>
): string[] {
  const used = usedAngles
    .filter((a): a is string => Boolean(a && a.trim()))
    .map(normalizeAngle);

  const unused: string[] = [];
  const seen = new Set<string>();

  for (const raw of missingAngles) {
    const angle = raw.trim();
    if (!angle) continue;
    const key = normalizeAngle(angle);
    if (seen.has(key)) continue;
    const wasUsed = used.some(
      (u) => u === key || u.includes(key) || key.includes(u)
    );
    if (wasUsed) continue;
    seen.add(key);
    unused.push(angle);
  }

  return unused;
}

/**
 * Cluster winning reply rows by normalized topic. Drops non-winning rows.
 * Clusters are sorted by reply count desc, then most recent publish.
 */
export function clusterWinningReplies(
  rows: WinningReplyRow[],
  opts?: { minReplies?: number }
): TopicCluster[] {
  const minReplies = opts?.minReplies ?? 1;
  const winners = rows.filter(isWinningReply);

  const byTopic = new Map<
    string,
    {
      topic: string;
      replies: ComposeSourceReply[];
      allMissing: string[];
      usedAngles: Array<string | undefined>;
    }
  >();

  for (const row of winners) {
    const topic = row.topic.trim() || "Untitled";
    const key = normalizeTopic(topic);
    let bucket = byTopic.get(key);
    if (!bucket) {
      bucket = {
        topic,
        replies: [],
        allMissing: [],
        usedAngles: [],
      };
      byTopic.set(key, bucket);
    }
    bucket.replies.push({
      draftId: row.draftId,
      analysisId: row.analysisId,
      replyText: row.replyText,
      usedAngle: row.usedAngle,
      category: row.category,
      publishedAt: row.publishedAt,
      targetAuthorHandle: row.targetAuthorHandle,
    });
    bucket.allMissing.push(...row.missingAngles);
    bucket.usedAngles.push(row.usedAngle);
  }

  const clusters: TopicCluster[] = [];

  for (const [key, bucket] of byTopic) {
    if (bucket.replies.length < minReplies) continue;
    bucket.replies.sort((a, b) => b.publishedAt - a.publishedAt);
    const unusedAngles = pickUnusedAngles(bucket.allMissing, bucket.usedAngles);
    const replyCount = bucket.replies.length;
    const reason =
      unusedAngles.length > 0
        ? `${replyCount} winning ${replyCount === 1 ? "reply" : "replies"} on this topic; ${unusedAngles.length} unused angle${unusedAngles.length === 1 ? "" : "s"} still open.`
        : `${replyCount} winning ${replyCount === 1 ? "reply" : "replies"} on this topic — compound them into an original post.`;

    clusters.push({
      id: slugifyTopic(key),
      topic: bucket.topic,
      replies: bucket.replies,
      unusedAngles,
      reason,
    });
  }

  clusters.sort((a, b) => {
    if (b.replies.length !== a.replies.length) {
      return b.replies.length - a.replies.length;
    }
    const aLatest = a.replies[0]?.publishedAt ?? 0;
    const bLatest = b.replies[0]?.publishedAt ?? 0;
    return bLatest - aLatest;
  });

  return clusters;
}

/** Deterministic demo winning rows when the user has no outcome data yet. */
export const DEMO_WINNING_REPLY_ROWS: WinningReplyRow[] = [
  {
    draftId: "demo-draft-ai-moat-1",
    analysisId: "demo-analysis-ai-moat",
    publishedTweetId: "1900000000000000001",
    publishedAt: 1_720_000_000_000,
    replyText:
      "The workflow moat only compounds if you own the feedback loop — wrappers without retained context are rented distribution.",
    topic: "AI product moats",
    missingAngles: [
      "Workflow ownership beats model choice",
      "Data flywheels need closed loops",
      "Distribution wrappers still win early",
    ],
    usedAngle: "Workflow ownership beats model choice",
    category: "insight",
    editBucket: "no_edit",
    responded: true,
    targetAuthorHandle: "sarahbuilds",
  },
  {
    draftId: "demo-draft-ai-moat-2",
    analysisId: "demo-analysis-ai-moat-2",
    publishedTweetId: "1900000000000000002",
    publishedAt: 1_720_100_000_000,
    replyText:
      "Most 'data moats' are just logs. The ones that matter change the next prompt automatically.",
    topic: "AI product moats",
    missingAngles: [
      "Workflow ownership beats model choice",
      "Data flywheels need closed loops",
      "Eval harnesses as the real moat",
    ],
    usedAngle: "Data flywheels need closed loops",
    category: "contrarian",
    editBucket: "minor_edit",
    responded: true,
    targetAuthorHandle: "aiskeptic",
  },
  {
    draftId: "demo-draft-ship-speed-1",
    analysisId: "demo-analysis-ship",
    publishedTweetId: "1900000000000000003",
    publishedAt: 1_720_200_000_000,
    replyText:
      "Meetings aren't overhead — they're the product when the buyer is risk-averse. Indie speed only wins when the buyer wants speed.",
    topic: "Shipping speed vs process",
    missingAngles: [
      "Buyer risk appetite sets the pace",
      "Compliance is a feature for enterprises",
      "Small teams win on decision latency",
    ],
    usedAngle: "Buyer risk appetite sets the pace",
    category: "debate",
    editBucket: "no_edit",
    responded: true,
    targetAuthorHandle: "marcusship",
  },
  {
    draftId: "demo-draft-maintain-1",
    analysisId: "demo-analysis-maintain",
    publishedTweetId: "1900000000000000004",
    publishedAt: 1_720_300_000_000,
    replyText:
      "Benchmarking coding tasks misses the bill: six-month maintenance under shifting requirements. That's where models still fall over.",
    topic: "AI code maintenance",
    missingAngles: [
      "Long-horizon maintenance evals",
      "Context rot as the failure mode",
      "Social coordination beats codegen",
    ],
    usedAngle: "Long-horizon maintenance evals",
    category: "insight",
    editBucket: "no_edit",
    responded: true,
    targetAuthorHandle: "priyaml",
  },
];

export function demoTopicClusters(): TopicCluster[] {
  return clusterWinningReplies(DEMO_WINNING_REPLY_ROWS);
}

function demoStandaloneOptions(cluster: TopicCluster): ComposeStandaloneOption[] {
  const angle = cluster.unusedAngles[0] ?? cluster.topic;
  return [
    {
      category: "insight",
      content: `${angle} — proved it in replies, now saying it out loud.`,
      reason: "Short punchy claim from a winning angle you already validated.",
    },
    {
      category: "contrarian",
      content: `Unpopular: most takes on ${cluster.topic.toLowerCase()} skip the part that actually compounds.`,
      reason: "Spiky opener that invites the conversation you already won.",
    },
    {
      category: "story",
      content: `I kept winning replies on ${cluster.topic.toLowerCase()}. Pattern: ${angle.toLowerCase()}.`,
      reason: "Personal proof without fake engagement numbers.",
    },
  ];
}

function demoThreadOptions(cluster: TopicCluster): ComposeThreadOption[] {
  const angles =
    cluster.unusedAngles.length > 0
      ? cluster.unusedAngles
      : cluster.replies.map((r) => r.usedAngle ?? r.replyText.slice(0, 80));
  const posts = [
    `Thread: what winning replies taught me about ${cluster.topic.toLowerCase()}.`,
    `1/ ${cluster.replies[0]?.replyText.slice(0, 200) ?? cluster.topic}`,
    `2/ The angle that still sits open: ${angles[0] ?? cluster.topic}.`,
    `3/ ${angles[1] ?? "Specificity beats generic takes — every time."}`,
    `4/ If you're building here, start with the feedback loop, not the model.`,
    `5/ That's the ladder: reply → proof → original post.`,
  ];
  return [
    {
      category: "insight",
      posts: posts.slice(0, 6),
      reason: "4–6 beat thread compounding your responded replies.",
    },
    {
      category: "story",
      posts: [
        `A short story about ${cluster.topic.toLowerCase()}.`,
        cluster.replies[0]?.replyText.slice(0, 220) ?? "Started in replies.",
        cluster.replies[1]?.replyText.slice(0, 220) ??
          "Then the pattern showed up twice.",
        `Unused angle I still want to press: ${angles[0] ?? cluster.topic}.`,
        "End: original posts should come from conversations you already won.",
      ],
      reason: "Narrative thread from your own sent text.",
    },
    {
      category: "howto",
      posts: [
        `How I'd turn reply wins on ${cluster.topic.toLowerCase()} into a post.`,
        "Step 1: cluster responded replies by topic.",
        "Step 2: list missing angles you never used.",
        `Step 3: write the short form first (${angles[0] ?? "one sharp claim"}).`,
        "Step 4: expand only if the short form earns replies.",
        "Step 5: human click on every send — no autopilot.",
        "That's the whole ladder.",
      ],
      reason: "Practical 4–7 post how-to without fake scores.",
    },
  ];
}

function demoLongformOptions(cluster: TopicCluster): ComposeLongformOption[] {
  const body = [
    `# ${cluster.topic}`,
    "",
    cluster.reason,
    "",
    "## What the replies proved",
    ...cluster.replies.map(
      (r, i) =>
        `${i + 1}. ${r.replyText}${r.targetAuthorHandle ? ` (re: @${r.targetAuthorHandle})` : ""}`
    ),
    "",
    "## Angles still open",
    ...(cluster.unusedAngles.length > 0
      ? cluster.unusedAngles.map((a) => `- ${a}`)
      : ["- (none — compound the wins into a clearer thesis)"]),
    "",
    "## Draft thesis",
    `The through-line: ${cluster.unusedAngles[0] ?? cluster.topic} is the part most threads skip.`,
    "",
    "_Copy into X Articles / long-form. Publish only with a human click._",
  ].join("\n");

  return [
    {
      category: "essay",
      title: `${cluster.topic}: what winning replies taught me`,
      content: body,
      reason: "Long-form draft for copy-out — not API-published.",
    },
    {
      category: "brief",
      title: `Brief: ${cluster.topic}`,
      content: [
        `## Brief — ${cluster.topic}`,
        "",
        cluster.reason,
        "",
        "Key lines:",
        ...cluster.replies.slice(0, 3).map((r) => `- ${r.replyText}`),
        "",
        `Open angle: ${cluster.unusedAngles[0] ?? "sharpen the thesis"}`,
      ].join("\n"),
      reason: "Shorter Article-ready brief from the same cluster.",
    },
    {
      category: "memo",
      title: `Memo to self: ${cluster.topic}`,
      content: [
        `Memo: ${cluster.topic}`,
        "",
        "Don't invent a new take. Promote the one that already got a reply-back.",
        "",
        cluster.replies[0]?.replyText ?? "",
        "",
        `Next: write the unused angle — ${cluster.unusedAngles[0] ?? "n/a"}.`,
      ].join("\n"),
      reason: "Internal memo tone for paste into Articles.",
    },
  ];
}

/** Deterministic compose outputs when ANTHROPIC_API_KEY is missing. */
export function demoComposeBundle(
  cluster: TopicCluster,
  format: ComposeFormat
): ComposeBundle {
  return {
    format,
    standalone: demoStandaloneOptions(cluster),
    thread: demoThreadOptions(cluster),
    longform: demoLongformOptions(cluster),
  };
}

export function optionsForFormat(
  bundle: ComposeBundle,
  format: ComposeFormat
): ComposeStandaloneOption[] | ComposeThreadOption[] | ComposeLongformOption[] {
  switch (format) {
    case "standalone":
      return bundle.standalone;
    case "thread":
      return bundle.thread;
    case "longform":
      return bundle.longform;
  }
}
