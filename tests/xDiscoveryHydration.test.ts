import { afterEach, describe, expect, it, vi } from "vitest";
import {
  hydrateXDiscoveryCandidates,
  type TweetBundle,
} from "../src/lib/x";
import type { XDiscoveryCandidate } from "../shared/xDiscovery";

const candidate: XDiscoveryCandidate = {
  tweetId: "1800000000000000001",
  canonicalUrl: "https://x.com/sarahbuilds/status/1800000000000000001",
  authorHandle: "sarahbuilds",
  relevanceReason: "Strong live AI workflow debate with room for a builder angle.",
  missingAngle: "Connect workflow ownership to data quality, not model swaps.",
  searchIntent: "ai-workflow-moats",
  citations: ["https://x.com/sarahbuilds/status/1800000000000000001"],
  mediaInfluenced: false,
};

const bundle: TweetBundle = {
  tweetId: candidate.tweetId,
  authorName: "Sarah Chen",
  authorHandle: "sarahbuilds",
  authorFollowers: 184000,
  text: "AI workflows compound before models do.",
  postedAt: Date.parse("2026-07-11T08:00:00.000Z"),
  likes: 10,
  retweets: 2,
  replies: 3,
  quotes: 1,
  threadAncestors: [],
  topReplies: [],
  isDemoData: false,
};

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("hydrateXDiscoveryCandidates", () => {
  it("fails before hydration when X credentials or access token are missing", async () => {
    vi.stubEnv("X_CLIENT_ID", "");
    vi.stubEnv("X_CLIENT_SECRET", "");
    const fetchBundle = vi.fn();

    const result = await hydrateXDiscoveryCandidates({
      candidates: [candidate],
      accessToken: null,
      fetchBundle: fetchBundle as unknown as typeof import("../src/lib/x").fetchTweetBundle,
    });

    expect(fetchBundle).not.toHaveBeenCalled();
    expect(result.hydrated).toEqual([]);
    expect(result.failures).toEqual([
      { tweetId: candidate.tweetId, reason: "missing_x_credentials" },
    ]);
  });

  it("accepts candidates only after authoritative X hydration", async () => {
    vi.stubEnv("X_CLIENT_ID", "client");
    vi.stubEnv("X_CLIENT_SECRET", "secret");
    const fetchBundle = vi.fn(async () => bundle);

    const result = await hydrateXDiscoveryCandidates({
      candidates: [candidate],
      accessToken: "x-access-token",
      fetchBundle: fetchBundle as unknown as typeof import("../src/lib/x").fetchTweetBundle,
    });

    expect(result.failures).toEqual([]);
    expect(result.hydrated).toHaveLength(1);
    expect(result.hydrated[0]?.bundle).toEqual(bundle);
  });

  it("rejects demo fallback bundles as non-authoritative", async () => {
    vi.stubEnv("X_CLIENT_ID", "client");
    vi.stubEnv("X_CLIENT_SECRET", "secret");
    const fetchBundle = vi.fn(async () => ({ ...bundle, isDemoData: true }));

    const result = await hydrateXDiscoveryCandidates({
      candidates: [candidate],
      accessToken: "x-access-token",
      fetchBundle: fetchBundle as unknown as typeof import("../src/lib/x").fetchTweetBundle,
    });

    expect(result.hydrated).toEqual([]);
    expect(result.failures).toEqual([
      { tweetId: candidate.tweetId, reason: "authoritative_hydration_failed" },
    ]);
  });

  it("rejects hydrated rows with mismatched authors", async () => {
    vi.stubEnv("X_CLIENT_ID", "client");
    vi.stubEnv("X_CLIENT_SECRET", "secret");
    const fetchBundle = vi.fn(async () => ({
      ...bundle,
      authorHandle: "someoneelse",
    }));

    const result = await hydrateXDiscoveryCandidates({
      candidates: [candidate],
      accessToken: "x-access-token",
      fetchBundle: fetchBundle as unknown as typeof import("../src/lib/x").fetchTweetBundle,
    });

    expect(result.hydrated).toEqual([]);
    expect(result.failures).toEqual([
      { tweetId: candidate.tweetId, reason: "author_handle_mismatch" },
    ]);
  });
});
