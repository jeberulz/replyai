export const MAX_WATCHED_HANDLES = 50;

function normalizeKeyword(keyword: string): string {
  return keyword.trim().toLowerCase();
}

export function normalizeResearchHandle(handle: string): string {
  return handle.trim().replace(/^@/, "").toLowerCase();
}

export function mergeWatchedHandles(
  existing: string[],
  handle: string,
  maxHandles = MAX_WATCHED_HANDLES
): string[] {
  const normalizedExisting = [...new Set(existing.map(normalizeResearchHandle).filter(Boolean))];
  const normalizedHandle = normalizeResearchHandle(handle);

  if (!normalizedHandle) return normalizedExisting.slice(0, maxHandles);
  if (normalizedExisting.includes(normalizedHandle)) {
    return normalizedExisting.slice(0, maxHandles);
  }
  return [...normalizedExisting, normalizedHandle].slice(0, maxHandles);
}

export function mergeSeedKeywords(
  existing: string[],
  topicTags: string[]
): { keywords: string[]; seeded: string[] } {
  const normalizedExisting = [...new Set(existing.map(normalizeKeyword).filter(Boolean))];
  const seen = new Set(normalizedExisting);
  const seeded: string[] = [];

  for (const topicTag of topicTags) {
    const normalized = normalizeKeyword(topicTag);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    normalizedExisting.push(normalized);
    seeded.push(normalized);
  }

  return { keywords: normalizedExisting, seeded };
}

export function isWatchedHandle(
  watchedHandles: Iterable<string>,
  handle: string
): boolean {
  const normalizedHandle = normalizeResearchHandle(handle);
  if (!normalizedHandle) return false;

  for (const watchedHandle of watchedHandles) {
    if (normalizeResearchHandle(watchedHandle) === normalizedHandle) {
      return true;
    }
  }
  return false;
}
