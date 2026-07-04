import { createHash, randomBytes } from "node:crypto";
import { env, hasXCredentials } from "./env";
import { demoTweetForId, DEMO_TWEETS } from "../../shared/demoData";

const X_AUTHORIZE_URL = "https://x.com/i/oauth2/authorize";
const X_TOKEN_URL = "https://api.x.com/2/oauth2/token";
const X_API_BASE = "https://api.x.com/2";

export const X_OAUTH_SCOPES = [
  "tweet.read",
  "users.read",
  "tweet.write",
  "offline.access",
].join(" ");

// ---------------------------------------------------------------------------
// OAuth 2.0 with PKCE
// ---------------------------------------------------------------------------

export function generatePkcePair() {
  const verifier = randomBytes(48).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

export function buildAuthorizeUrl(args: {
  state: string;
  challenge: string;
  redirectUri: string;
}): string {
  const url = new URL(X_AUTHORIZE_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", env.xClientId);
  url.searchParams.set("redirect_uri", args.redirectUri);
  url.searchParams.set("scope", X_OAUTH_SCOPES);
  url.searchParams.set("state", args.state);
  url.searchParams.set("code_challenge", args.challenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

export type XTokenResponse = {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  scope: string;
};

export async function exchangeCodeForToken(args: {
  code: string;
  verifier: string;
  redirectUri: string;
}): Promise<XTokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: args.code,
    redirect_uri: args.redirectUri,
    code_verifier: args.verifier,
    client_id: env.xClientId,
  });
  const basic = Buffer.from(`${env.xClientId}:${env.xClientSecret}`).toString(
    "base64"
  );
  const res = await fetch(X_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basic}`,
    },
    body,
  });
  if (!res.ok) {
    throw new Error(`X token exchange failed (${res.status}): ${await res.text()}`);
  }
  const json = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    scope: string;
  };
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresAt: Date.now() + json.expires_in * 1000,
    scope: json.scope,
  };
}

export type XUser = {
  id: string;
  username: string;
  name: string;
  avatar?: string;
};

export async function fetchAuthenticatedUser(accessToken: string): Promise<XUser> {
  const res = await fetch(
    `${X_API_BASE}/users/me?user.fields=profile_image_url`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) {
    throw new Error(`Failed to fetch X user (${res.status})`);
  }
  const json = (await res.json()) as {
    data: { id: string; username: string; name: string; profile_image_url?: string };
  };
  return {
    id: json.data.id,
    username: json.data.username,
    name: json.data.name,
    avatar: json.data.profile_image_url,
  };
}

// ---------------------------------------------------------------------------
// Tweet data
// ---------------------------------------------------------------------------

export type TweetBundle = {
  tweetId: string;
  authorName: string;
  authorHandle: string;
  authorAvatar?: string;
  authorFollowers: number;
  authorBio?: string;
  text: string;
  postedAt: number;
  likes: number;
  retweets: number;
  replies: number;
  quotes: number;
  views?: number;
  mediaText?: string;
  topReplies: { authorHandle: string; text: string; likes: number }[];
  isDemoData: boolean;
};

/**
 * Fetch a tweet with author profile, engagement metrics, and top replies.
 * Falls back to deterministic demo data when no X app credentials are
 * configured or when the caller is a demo account.
 *
 * Note: reading tweets requires a paid X API tier (Basic or above). The
 * demo path keeps the product testable without one.
 */
export async function fetchTweetBundle(
  tweetId: string,
  accessToken: string | null
): Promise<TweetBundle> {
  if (!accessToken || !hasXCredentials()) {
    return demoBundle(tweetId);
  }

  const url = new URL(`${X_API_BASE}/tweets/${tweetId}`);
  url.searchParams.set(
    "tweet.fields",
    "public_metrics,created_at,author_id,conversation_id,attachments"
  );
  url.searchParams.set("expansions", "author_id,attachments.media_keys");
  url.searchParams.set(
    "user.fields",
    "public_metrics,description,profile_image_url,username,name"
  );
  url.searchParams.set("media.fields", "alt_text,type");

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    // Common on the free tier (read endpoints are paid). Degrade to demo data
    // rather than failing the whole analysis.
    return demoBundle(tweetId);
  }

  const json = (await res.json()) as {
    data: {
      id: string;
      text: string;
      created_at: string;
      author_id: string;
      public_metrics: {
        like_count: number;
        retweet_count: number;
        reply_count: number;
        quote_count: number;
        impression_count?: number;
      };
    };
    includes?: {
      users?: Array<{
        id: string;
        name: string;
        username: string;
        description?: string;
        profile_image_url?: string;
        public_metrics?: { followers_count: number };
      }>;
      media?: Array<{ alt_text?: string }>;
    };
  };

  const author = json.includes?.users?.find((u) => u.id === json.data.author_id);
  const mediaText = (json.includes?.media ?? [])
    .map((m) => m.alt_text)
    .filter(Boolean)
    .join("\n");

  const topReplies = await fetchTopReplies(json.data.id, accessToken);

  return {
    tweetId: json.data.id,
    authorName: author?.name ?? "Unknown",
    authorHandle: author?.username ?? "unknown",
    authorAvatar: author?.profile_image_url,
    authorFollowers: author?.public_metrics?.followers_count ?? 0,
    authorBio: author?.description,
    text: json.data.text,
    postedAt: Date.parse(json.data.created_at),
    likes: json.data.public_metrics.like_count,
    retweets: json.data.public_metrics.retweet_count,
    replies: json.data.public_metrics.reply_count,
    quotes: json.data.public_metrics.quote_count,
    views: json.data.public_metrics.impression_count,
    mediaText: mediaText || undefined,
    topReplies,
    isDemoData: false,
  };
}

async function fetchTopReplies(
  conversationId: string,
  accessToken: string
): Promise<TweetBundle["topReplies"]> {
  const url = new URL(`${X_API_BASE}/tweets/search/recent`);
  url.searchParams.set("query", `conversation_id:${conversationId} is:reply`);
  url.searchParams.set("tweet.fields", "public_metrics,author_id");
  url.searchParams.set("expansions", "author_id");
  url.searchParams.set("max_results", "25");

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return [];
  const json = (await res.json()) as {
    data?: Array<{
      text: string;
      author_id: string;
      public_metrics: { like_count: number };
    }>;
    includes?: { users?: Array<{ id: string; username: string }> };
  };
  const users = new Map(
    (json.includes?.users ?? []).map((u) => [u.id, u.username] as const)
  );
  return (json.data ?? [])
    .map((t) => ({
      authorHandle: users.get(t.author_id) ?? "unknown",
      text: t.text,
      likes: t.public_metrics.like_count,
    }))
    .sort((a, b) => b.likes - a.likes)
    .slice(0, 5);
}

function demoBundle(tweetId: string): TweetBundle {
  const demo = demoTweetForId(tweetId);
  return {
    tweetId: demo.id,
    authorName: demo.authorName,
    authorHandle: demo.authorHandle,
    authorFollowers: demo.authorFollowers,
    authorBio: demo.authorBio,
    text: demo.text,
    postedAt: Date.now() - demo.minutesAgo * 60_000,
    likes: demo.likes,
    retweets: demo.retweets,
    replies: demo.replies,
    quotes: demo.quotes,
    views: demo.views,
    topReplies: demo.topReplies,
    isDemoData: true,
  };
}

/** Recent original tweets for voice training. Demo fallback included. */
export async function fetchUserTweets(
  xUserId: string,
  accessToken: string | null
): Promise<string[]> {
  if (!accessToken || !hasXCredentials()) {
    return DEMO_TWEETS.map((t) => t.text);
  }
  const url = new URL(`${X_API_BASE}/users/${xUserId}/tweets`);
  url.searchParams.set("max_results", "50");
  url.searchParams.set("exclude", "retweets,replies");
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return DEMO_TWEETS.map((t) => t.text);
  const json = (await res.json()) as { data?: Array<{ text: string }> };
  return (json.data ?? []).map((t) => t.text);
}
