const MAX_TWEET_LENGTH = 280;

/** Build a canonical x.com status permalink. */
export function buildTweetPermalink(handle: string, tweetId: string): string {
  const cleanHandle = handle.replace(/^@/, "").trim();
  return `https://x.com/${cleanHandle}/status/${tweetId}`;
}

/**
 * Compose quote-post text: user text + permalink on its own line.
 * Trims the text portion if the combined length exceeds 280 chars.
 */
export function composeQuotePostText(text: string, permalink: string): string {
  const trimmed = text.trim();
  const separator = trimmed.length > 0 ? "\n" : "";
  const combined = `${trimmed}${separator}${permalink}`;
  if (combined.length <= MAX_TWEET_LENGTH) return combined;

  const budget = MAX_TWEET_LENGTH - separator.length - permalink.length;
  if (budget <= 0) return permalink.slice(0, MAX_TWEET_LENGTH);

  const truncated = trimmed.slice(0, budget).trimEnd();
  return `${truncated}${separator}${permalink}`;
}

/** Open X's web compose with pre-filled text (and optional reply target). */
export function buildXIntentUrl(args: {
  text: string;
  inReplyTo?: string;
}): string {
  const url = new URL("https://x.com/intent/tweet");
  url.searchParams.set("text", args.text);
  if (args.inReplyTo) {
    url.searchParams.set("in_reply_to", args.inReplyTo);
  }
  return url.toString();
}
