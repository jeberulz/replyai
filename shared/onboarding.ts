/**
 * Onboarding definitions shared by the wizard UI, server actions, and the
 * dashboard setup checklist. Pure data + derivations — no I/O.
 */

export type GoalId = "audience" | "leads" | "authority";

export const GOALS: Array<{ id: GoalId; label: string; hint: string }> = [
  {
    id: "audience",
    label: "Grow my audience",
    hint: "Get seen by bigger accounts in live threads",
  },
  {
    id: "leads",
    label: "Find leads & clients",
    hint: "Show up where your buyers are already talking",
  },
  {
    id: "authority",
    label: "Build authority in my niche",
    hint: "Be the reply people screenshot and quote",
  },
];

export function isGoalId(value: string): value is GoalId {
  return GOALS.some((g) => g.id === value);
}

export function goalLabel(goal: GoalId): string {
  return GOALS.find((g) => g.id === goal)?.label ?? goal;
}

/** Seeded before any goal is chosen (also used by first-login defaults). */
export const DEFAULT_KEYWORDS = ["ai", "llm", "startup", "saas", "indie hacker"];

const GOAL_KEYWORDS: Record<GoalId, string[]> = {
  audience: [
    "build in public",
    "indie hackers",
    "ai",
    "startup lessons",
    "founder stories",
    "growth",
  ],
  leads: [
    "saas founders",
    "hiring devs",
    "mvp build",
    "no-code",
    "agency owners",
    "b2b saas",
  ],
  authority: [
    "ai agents",
    "llm eval",
    "devtools",
    "product strategy",
    "ux design",
    "system design",
  ],
};

/** Niche chips suggested on the onboarding niche step, per goal. */
export function suggestedKeywordsForGoal(goal: GoalId): string[] {
  return GOAL_KEYWORDS[goal];
}

// ---------------------------------------------------------------------------
// Goal → generation. The wizard promises the goal "tunes how your replies
// lean" — these are the two mechanisms: a prompt lean and a category bias.
// ---------------------------------------------------------------------------

/** Generation categories (PRD §4). Shared so goal biases stay validated. */
export const QUOTE_CATEGORIES = [
  "contrarian",
  "educational",
  "story",
  "founder",
  "ux",
  "humorous",
  "prediction",
  "question",
  "data-driven",
] as const;

export const REPLY_CATEGORIES = [
  "short",
  "insightful",
  "debate",
  "friendly",
  "question",
  "agreement-plus",
] as const;

const GOAL_GENERATION_LEAN: Record<GoalId, string> = {
  audience:
    "Their goal is growing their audience: favor takes that stand out in a busy thread and make bigger accounts want to respond — bold, specific, screenshot-able. Never generic engagement bait.",
  leads:
    "Their goal is finding leads and clients: favor replies that open a real conversation and quietly demonstrate what they build or know — helpful and credible, never salesy, no pitching.",
  authority:
    "Their goal is building authority in their niche: favor evidence-backed, quotable takes that teach something concrete — the reply people bookmark and cite.",
};

/** One prompt line describing how generated options should lean for a goal. */
export function goalGenerationLean(goal: GoalId | null | undefined): string {
  return goal ? GOAL_GENERATION_LEAN[goal] : "";
}

const GOAL_CATEGORY_BIAS: Record<
  GoalId,
  { reply: string[]; quote: string[] }
> = {
  audience: {
    reply: ["debate", "insightful", "question"],
    quote: ["contrarian", "humorous", "story"],
  },
  leads: {
    reply: ["question", "friendly", "agreement-plus"],
    quote: ["founder", "story", "educational"],
  },
  authority: {
    reply: ["insightful", "debate", "agreement-plus"],
    quote: ["data-driven", "educational", "prediction"],
  },
};

/** Categories to prefer (when they fit) for a goal; empty without a goal. */
export function goalCategoryBias(
  goal: GoalId | null | undefined,
  kind: "reply" | "quote"
): string[] {
  return goal ? GOAL_CATEGORY_BIAS[goal][kind] : [];
}

// ---------------------------------------------------------------------------
// Setup checklist — derived from real state, never a stored progress counter
// (PRD: show real reasons/progress, no fake scores).
// ---------------------------------------------------------------------------

export type SetupChecklistInput = {
  goal: GoalId | undefined;
  keywords: string[];
  hasTrainedVoice: boolean;
  hasAnalysis: boolean;
  hasDraft: boolean;
};

export type SetupChecklistItem = {
  id: "goal" | "niche" | "voice" | "analyze" | "reply";
  label: string;
  done: boolean;
  href: string;
};

export type SetupChecklist = {
  items: SetupChecklistItem[];
  doneCount: number;
  percent: number;
  complete: boolean;
};

function sameKeywordSet(a: string[], b: string[]): boolean {
  const norm = (list: string[]) =>
    [...new Set(list.map((k) => k.trim().toLowerCase()))].sort();
  const na = norm(a);
  const nb = norm(b);
  return na.length === nb.length && na.every((k, i) => k === nb[i]);
}

export function buildSetupChecklist(input: SetupChecklistInput): SetupChecklist {
  // "Niche picked" means the user moved off the seeded defaults — either via
  // the onboarding niche step or the feed scanner settings.
  const nicheChosen =
    input.keywords.length > 0 && !sameKeywordSet(input.keywords, DEFAULT_KEYWORDS);

  const items: SetupChecklistItem[] = [
    {
      id: "goal",
      label: "Choose your goal",
      done: input.goal !== undefined,
      href: "/onboarding?rerun=1",
    },
    {
      id: "niche",
      label: "Pick your niche",
      done: nicheChosen,
      href: "/feed",
    },
    {
      id: "voice",
      label: "Train your voice",
      done: input.hasTrainedVoice,
      href: "/voice",
    },
    {
      id: "analyze",
      label: "Analyze your first tweet",
      done: input.hasAnalysis,
      href: "/analyze",
    },
    {
      id: "reply",
      label: "Save or send your first reply",
      done: input.hasDraft,
      href: "/feed",
    },
  ];

  const doneCount = items.filter((i) => i.done).length;
  return {
    items,
    doneCount,
    percent: Math.round((doneCount / items.length) * 100),
    complete: doneCount === items.length,
  };
}
