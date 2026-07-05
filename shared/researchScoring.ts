/**
 * Heuristic profile ranking for the Research Agent (Phase 4).
 * Scores are internal sort keys — the UI shows plain-language reasons, not ML %.
 */

export type ResearchTweetSample = {
  tweetId: string;
  text: string;
  likes: number;
  replies: number;
  authorHandle: string;
  authorName: string;
  authorFollowers: number;
  authorBio?: string;
  authorId?: string;
};

export type ScoredResearchProfile = {
  handle: string;
  displayName: string;
  bio: string;
  xUserId?: string;
  followers: number;
  avgLikes: number;
  postFrequency: string;
  topicTags: string[];
  score: number;
  exampleTweets: { tweetId: string; text: string; likes: number }[];
};

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** Follower band score — mid-size accounts are most reply-accessible. */
export function followersBandScore(followers: number): number {
  if (followers < 1_000) return 0.35;
  if (followers < 10_000) return 0.65;
  if (followers < 50_000) return 0.85;
  if (followers < 250_000) return 1;
  if (followers < 1_000_000) return 0.75;
  return 0.55;
}

export function topicOverlapTags(
  texts: string[],
  bio: string,
  nicheKeywords: string[]
): string[] {
  const haystack = `${bio} ${texts.join(" ")}`.toLowerCase();
  const tags = nicheKeywords
    .map((k) => k.trim().toLowerCase())
    .filter((k) => k.length > 1 && haystack.includes(k));
  return [...new Set(tags)].slice(0, 5);
}

export function replyFriendlyScore(tweets: ResearchTweetSample[]): number {
  if (tweets.length === 0) return 0;
  let score = 0;
  for (const t of tweets) {
    if (t.replies < 200) score += 0.25;
    if (t.text.includes("?")) score += 0.15;
  }
  return clamp(score / tweets.length, 0, 1);
}

export function aggregateProfilesFromTweets(
  tweets: ResearchTweetSample[]
): Map<string, ResearchTweetSample[]> {
  const byHandle = new Map<string, ResearchTweetSample[]>();
  for (const t of tweets) {
    const handle = t.authorHandle.toLowerCase();
    const list = byHandle.get(handle) ?? [];
    list.push(t);
    byHandle.set(handle, list);
  }
  return byHandle;
}

export function scoreResearchProfile(
  handle: string,
  tweets: ResearchTweetSample[],
  nicheKeywords: string[]
): ScoredResearchProfile | null {
  if (tweets.length === 0) return null;
  const sorted = [...tweets].sort((a, b) => b.likes - a.likes);
  const top = sorted[0];
  const avgLikes = Math.round(
    tweets.reduce((sum, t) => sum + t.likes, 0) / tweets.length
  );
  const texts = tweets.map((t) => t.text);
  const topicTags = topicOverlapTags(texts, top.authorBio ?? "", nicheKeywords);
  const overlap =
    nicheKeywords.length === 0
      ? 0.5
      : clamp(topicTags.length / Math.min(3, nicheKeywords.length), 0, 1);

  const engagement = clamp(avgLikes / 500, 0, 1);
  const audience = followersBandScore(top.authorFollowers);
  const replyFriendly = replyFriendlyScore(tweets);

  const score = Math.round(
    100 * (0.35 * overlap + 0.25 * audience + 0.25 * engagement + 0.15 * replyFriendly)
  );

  const postFrequency =
    tweets.length >= 3 ? "Active this week" : "Occasional poster";

  return {
    handle,
    displayName: top.authorName,
    bio: top.authorBio ?? "",
    xUserId: top.authorId,
    followers: top.authorFollowers,
    avgLikes,
    postFrequency,
    topicTags,
    score,
    exampleTweets: sorted.slice(0, 3).map((t) => ({
      tweetId: t.tweetId,
      text: t.text,
      likes: t.likes,
    })),
  };
}

export function rankResearchProfiles(
  tweets: ResearchTweetSample[],
  nicheKeywords: string[],
  limit = 30
): ScoredResearchProfile[] {
  const grouped = aggregateProfilesFromTweets(tweets);
  const scored: ScoredResearchProfile[] = [];
  for (const [handle, samples] of grouped) {
    const profile = scoreResearchProfile(handle, samples, nicheKeywords);
    if (profile) scored.push(profile);
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}
