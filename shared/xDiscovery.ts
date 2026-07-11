import { z } from "zod";

export const X_DISCOVERY_LIMITS = {
  maxHandles: 20,
  maxResults: 10,
  maxToolCalls: 5,
  maxDateWindowDays: 7,
  maxQueryLength: 500,
  maxReasonLength: 240,
  maxAngleLength: 240,
} as const;

export type XStatusReference = {
  tweetId: string;
  authorHandle: string | null;
  canonicalUrl: string;
};

export type XDiscoveryRequestInput = {
  query: string;
  fromDate: string;
  toDate: string;
  maxResults: number;
  maxToolCalls: number;
  allowedHandles?: string[];
  excludedHandles?: string[];
  enableMediaUnderstanding?: boolean;
};

export type XDiscoveryCandidate = {
  tweetId: string;
  canonicalUrl: string;
  authorHandle: string;
  relevanceReason: string;
  missingAngle: string;
  searchIntent: string;
  citations: string[];
  mediaInfluenced: boolean;
};

export type XDiscoveryValidationResult =
  | { ok: true; value: XDiscoveryCandidate[] }
  | { ok: false; errors: string[] };

const X_HANDLE_PATTERN = /^[A-Za-z0-9_]{1,15}$/;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const FAKE_METRIC_PATTERN =
  /\b(?:\d{1,3}(?:\.\d+)?\s*%|engagement\s+(?:score|probability)|virality\s+(?:score|probability)|\d+\s*\/\s*100)\b/i;

const CandidateSchema = z
  .object({
    postUrl: z.string().trim().optional(),
    tweetId: z.string().trim().optional(),
    authorHandle: z.string().trim().optional(),
    relevanceReason: z.string().trim().min(1).max(X_DISCOVERY_LIMITS.maxReasonLength),
    missingAngle: z.string().trim().min(1).max(X_DISCOVERY_LIMITS.maxAngleLength),
    searchIntent: z.string().trim().min(1).max(120),
    citations: z.array(z.string().trim()).min(1).max(10),
    mediaInfluenced: z.boolean().default(false),
  })
  .strict();

const ResponseSchema = z
  .object({
    candidates: z.array(CandidateSchema).max(X_DISCOVERY_LIMITS.maxResults),
  })
  .strict();

export function parseXStatusUrl(rawUrl: string): XStatusReference | null {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (host !== "x.com" && host !== "twitter.com" && host !== "mobile.twitter.com") {
    return null;
  }

  const parts = url.pathname.split("/").filter(Boolean);
  const statusIndex = parts.findIndex(
    (part) => part === "status" || part === "statuses"
  );
  if (statusIndex < 0 || statusIndex + 1 >= parts.length) return null;

  const tweetId = parts[statusIndex + 1];
  if (!/^\d{4,25}$/.test(tweetId)) return null;

  const rawHandle =
    statusIndex >= 1 && parts[0] !== "i" && X_HANDLE_PATTERN.test(parts[0])
      ? parts[0]
      : null;

  return {
    tweetId,
    authorHandle: rawHandle,
    canonicalUrl: `https://x.com/${rawHandle ?? "i/web"}/status/${tweetId}`,
  };
}

export function normalizeXHandle(handle: string): string | null {
  const normalized = handle.trim().replace(/^@/, "");
  return X_HANDLE_PATTERN.test(normalized) ? normalized : null;
}

export function validateXDiscoveryRequest(
  input: XDiscoveryRequestInput
): string[] {
  const errors: string[] = [];
  const query = input.query.trim();
  if (!query) errors.push("query_required");
  if (query.length > X_DISCOVERY_LIMITS.maxQueryLength) {
    errors.push("query_too_long");
  }
  if (!ISO_DATE_PATTERN.test(input.fromDate) || !ISO_DATE_PATTERN.test(input.toDate)) {
    errors.push("invalid_date_format");
  } else {
    const from = Date.parse(`${input.fromDate}T00:00:00.000Z`);
    const to = Date.parse(`${input.toDate}T00:00:00.000Z`);
    const windowDays = Math.floor((to - from) / 86_400_000) + 1;
    if (!Number.isFinite(windowDays) || windowDays < 1) errors.push("invalid_date_range");
    if (windowDays > X_DISCOVERY_LIMITS.maxDateWindowDays) {
      errors.push("date_window_too_large");
    }
  }
  if (
    input.maxResults < 1 ||
    input.maxResults > X_DISCOVERY_LIMITS.maxResults ||
    !Number.isInteger(input.maxResults)
  ) {
    errors.push("max_results_out_of_bounds");
  }
  if (
    input.maxToolCalls < 1 ||
    input.maxToolCalls > X_DISCOVERY_LIMITS.maxToolCalls ||
    !Number.isInteger(input.maxToolCalls)
  ) {
    errors.push("max_tool_calls_out_of_bounds");
  }

  const allowed = input.allowedHandles ?? [];
  const excluded = input.excludedHandles ?? [];
  if (allowed.length > 0 && excluded.length > 0) {
    errors.push("handle_modes_are_mutually_exclusive");
  }
  if (allowed.length > X_DISCOVERY_LIMITS.maxHandles) {
    errors.push("too_many_allowed_handles");
  }
  if (excluded.length > X_DISCOVERY_LIMITS.maxHandles) {
    errors.push("too_many_excluded_handles");
  }
  for (const handle of [...allowed, ...excluded]) {
    if (!normalizeXHandle(handle)) errors.push("invalid_handle");
  }

  return [...new Set(errors)];
}

export function validateXSearchResponse(
  raw: unknown,
  responseCitations: string[]
): XDiscoveryValidationResult {
  const parsed = typeof raw === "string" ? parseJson(raw) : raw;
  const schema = ResponseSchema.safeParse(parsed);
  if (!schema.success) {
    return { ok: false, errors: ["invalid_schema"] };
  }

  const errors: string[] = [];
  const candidates: XDiscoveryCandidate[] = [];
  const globalXRefs = responseCitations
    .map(parseXStatusUrl)
    .filter((ref): ref is XStatusReference => Boolean(ref));

  for (const [index, candidate] of schema.data.candidates.entries()) {
    const refs = [...candidate.citations, ...responseCitations]
      .map(parseXStatusUrl)
      .filter((ref): ref is XStatusReference => Boolean(ref));
    const postRef = candidate.postUrl ? parseXStatusUrl(candidate.postUrl) : null;
    const idRef = candidate.tweetId
      ? refs.find((ref) => ref.tweetId === candidate.tweetId) ??
        globalXRefs.find((ref) => ref.tweetId === candidate.tweetId) ??
        null
      : null;
    const authoritativeRef = postRef ?? idRef ?? refs[0] ?? null;

    if (!authoritativeRef) {
      errors.push(`candidate_${index}_missing_x_citation`);
      continue;
    }
    if (candidate.tweetId && candidate.tweetId !== authoritativeRef.tweetId) {
      errors.push(`candidate_${index}_tweet_id_mismatch`);
      continue;
    }

    const authorHandle =
      normalizeXHandle(candidate.authorHandle ?? "") ??
      authoritativeRef.authorHandle;
    if (!authorHandle) {
      errors.push(`candidate_${index}_missing_author_handle`);
      continue;
    }
    if (
      FAKE_METRIC_PATTERN.test(candidate.relevanceReason) ||
      FAKE_METRIC_PATTERN.test(candidate.missingAngle)
    ) {
      errors.push(`candidate_${index}_fake_metric_language`);
      continue;
    }

    const matchingCitations = [...candidate.citations, ...responseCitations].filter(
      (citation) => parseXStatusUrl(citation)?.tweetId === authoritativeRef.tweetId
    );
    if (matchingCitations.length === 0) {
      errors.push(`candidate_${index}_missing_matching_citation`);
      continue;
    }

    candidates.push({
      tweetId: authoritativeRef.tweetId,
      canonicalUrl: `https://x.com/${authorHandle}/status/${authoritativeRef.tweetId}`,
      authorHandle,
      relevanceReason: candidate.relevanceReason,
      missingAngle: candidate.missingAngle,
      searchIntent: candidate.searchIntent,
      citations: [...new Set(matchingCitations)],
      mediaInfluenced: candidate.mediaInfluenced,
    });
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: dedupeXDiscoveryCandidates(candidates) };
}

export function dedupeXDiscoveryCandidates(
  candidates: XDiscoveryCandidate[]
): XDiscoveryCandidate[] {
  const seen = new Set<string>();
  const out: XDiscoveryCandidate[] = [];
  for (const candidate of candidates) {
    if (seen.has(candidate.tweetId)) continue;
    seen.add(candidate.tweetId);
    out.push(candidate);
  }
  return out;
}

function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
