export const WEAK_CONTENT_TOKENS = new Set([
  "a",
  "an",
  "and",
  "are",
  "all",
  "because",
  "build",
  "building",
  "but",
  "deleted",
  "does",
  "doing",
  "done",
  "everyone",
  "for",
  "from",
  "get",
  "got",
  "has",
  "have",
  "into",
  "just",
  "make",
  "most",
  "not",
  "now",
  "out",
  "over",
  "that",
  "the",
  "their",
  "then",
  "there",
  "this",
  "those",
  "very",
  "what",
  "when",
  "where",
  "which",
  "with",
  "you",
  "your",
]);

export function normalizeContentToken(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^-+|-+$/g, "");
}

export function isStrongContentToken(value: string): boolean {
  const token = normalizeContentToken(value);
  if (!token || token.length < 3) return false;
  if (/^\d+$/.test(token)) return false;
  return !WEAK_CONTENT_TOKENS.has(token);
}

export function strongContentTokens(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const tokens = text
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .map(normalizeContentToken)
    .filter(isStrongContentToken);
  for (const token of tokens) {
    if (seen.has(token)) continue;
    seen.add(token);
    out.push(token);
  }
  return out;
}

export function sanitizeKeywordList(
  keywords: string[],
  limit: number
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of keywords) {
    const keyword = normalizeContentToken(raw);
    if (!isStrongContentToken(keyword) || seen.has(keyword)) continue;
    seen.add(keyword);
    out.push(keyword);
    if (out.length >= limit) break;
  }
  return out;
}
