/**
 * Read-only DOM scrapers for x.com status pages.
 * Never writes to inputs, never clicks reply/post.
 */

import {
  ageMinutesFromIso,
  parseCompactCount,
  type PageEngagementMetrics,
} from "../../shared/extensionBadge";

function articleForTweetId(tweetId: string): HTMLElement | null {
  const articles = Array.from(
    document.querySelectorAll('article[data-testid="tweet"]')
  );
  for (const article of articles) {
    if (!(article instanceof HTMLElement)) continue;
    const link = article.querySelector(`a[href*="/status/${tweetId}"]`);
    if (link) return article;
  }
  // Fallback: primary tweet article on status pages
  const first = document.querySelector('article[data-testid="tweet"]');
  return first instanceof HTMLElement ? first : null;
}

function metricFromTestId(root: ParentNode, testId: string): number {
  const el = root.querySelector(`[data-testid="${testId}"]`);
  if (!el) return 0;
  const aria = el.getAttribute("aria-label");
  if (aria) {
    const match = aria.match(/([\d,.]+[KkMmBb]?)/);
    if (match) return parseCompactCount(match[1]);
  }
  const text = el.textContent;
  return parseCompactCount(text);
}

function followersNearArticle(article: HTMLElement): number {
  // Profile header on status pages often shows "12.3K Followers"
  const candidates = Array.from(
    document.querySelectorAll(
      'a[href$="/verified_followers"], a[href$="/followers"]'
    )
  );
  for (const a of candidates) {
    const text = a.textContent ?? "";
    const match = text.match(/([\d,.]+[KkMmBb]?)/);
    if (match) return parseCompactCount(match[1]);
  }
  // Sometimes the count is in a sibling span near the author
  const authorArea = article.querySelector('[data-testid="User-Name"]');
  const nearby = authorArea?.closest("div")?.parentElement?.textContent ?? "";
  const m = nearby.match(/([\d,.]+[KkMmBb]?)\s*Followers/i);
  if (m) return parseCompactCount(m[1]);
  return 0;
}

export function scrapePageMetrics(tweetId: string): PageEngagementMetrics {
  const article = articleForTweetId(tweetId);
  if (!article) {
    return {
      likes: 0,
      retweets: 0,
      replies: 0,
      quotes: 0,
      followers: 0,
      ageMinutes: null,
    };
  }

  const time = article.querySelector("time");
  const ageMinutes = ageMinutesFromIso(time?.getAttribute("datetime") ?? null);

  return {
    likes: metricFromTestId(article, "like"),
    retweets: metricFromTestId(article, "retweet"),
    replies: metricFromTestId(article, "reply"),
    quotes: 0,
    followers: followersNearArticle(article),
    ageMinutes,
  };
}
