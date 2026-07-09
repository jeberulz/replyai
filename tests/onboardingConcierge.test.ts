import { describe, expect, it } from "vitest";
import {
  demoOnboardingProposal,
  heuristicOnboardingProposal,
  inferGoalFromText,
  ONBOARDING_CONCIERGE_KEYWORD_MAX,
  ONBOARDING_CONCIERGE_KEYWORD_MIN,
  ONBOARDING_CONCIERGE_WATCH_MAX,
  ONBOARDING_CONCIERGE_WATCH_MIN,
  onboardingConciergeProposalSchema,
  parseOnboardingConciergeProposal,
} from "../shared/onboardingConcierge";
import { isGoalId } from "../shared/onboarding";

describe("demoOnboardingProposal", () => {
  it("returns a valid proposal shape with empty input", () => {
    const proposal = demoOnboardingProposal({});
    expect(isGoalId(proposal.goalId)).toBe(true);
    expect(proposal.source).toBe("demo");
    expect(proposal.keywords.length).toBeGreaterThanOrEqual(
      ONBOARDING_CONCIERGE_KEYWORD_MIN
    );
    expect(proposal.keywords.length).toBeLessThanOrEqual(
      ONBOARDING_CONCIERGE_KEYWORD_MAX
    );
    expect(proposal.watches.length).toBeGreaterThanOrEqual(
      ONBOARDING_CONCIERGE_WATCH_MIN
    );
    expect(proposal.watches.length).toBeLessThanOrEqual(
      ONBOARDING_CONCIERGE_WATCH_MAX
    );
    expect(proposal.voiceExamples.length).toBeGreaterThan(0);
    expect(proposal.goalReason.length).toBeGreaterThan(0);
    for (const w of proposal.watches) {
      expect(w.handle).not.toMatch(/^@/);
      expect(w.reason.length).toBeGreaterThan(0);
      expect(w.reason).not.toMatch(/%/);
    }
  });

  it("passes the zod proposal schema", () => {
    const proposal = demoOnboardingProposal();
    expect(onboardingConciergeProposalSchema.safeParse(proposal).success).toBe(
      true
    );
  });

  it("infers leads goal from agency-ish bio", () => {
    const proposal = demoOnboardingProposal({
      bio: "Freelance consultant helping B2B SaaS founders find clients",
      recentTweets: ["Looking for agency owners who need an MVP built"],
    });
    expect(proposal.goalId).toBe("leads");
  });
});

describe("heuristicOnboardingProposal", () => {
  it("falls back to demo when input is empty", () => {
    const proposal = heuristicOnboardingProposal({});
    expect(proposal.source).toBe("demo");
  });

  it("uses heuristic source when bio/tweets present", () => {
    const proposal = heuristicOnboardingProposal({
      bio: "Building in public. Indie hacker shipping AI tools.",
      recentTweets: [
        "Shipped a feature that grew our audience overnight",
        "Build in public tip: ship weekly",
      ],
    });
    expect(proposal.source).toBe("heuristic");
    expect(proposal.keywords.length).toBeGreaterThanOrEqual(
      ONBOARDING_CONCIERGE_KEYWORD_MIN
    );
    expect(proposal.voiceExamples.length).toBeGreaterThan(0);
  });
});

describe("inferGoalFromText", () => {
  it("defaults to audience with no signal", () => {
    expect(inferGoalFromText({})).toBe("audience");
  });

  it("detects authority from researcher bio", () => {
    expect(
      inferGoalFromText({ bio: "ML researcher. Writing about what AI can do." })
    ).toBe("authority");
  });
});

describe("parseOnboardingConciergeProposal", () => {
  it("accepts a valid object", () => {
    const demo = demoOnboardingProposal();
    expect(parseOnboardingConciergeProposal(demo)).toEqual(demo);
  });

  it("rejects invalid / empty payloads", () => {
    expect(parseOnboardingConciergeProposal(null)).toBeNull();
    expect(parseOnboardingConciergeProposal({})).toBeNull();
    expect(
      parseOnboardingConciergeProposal({
        ...demoOnboardingProposal(),
        keywords: ["only-one"],
      })
    ).toBeNull();
  });

  it("strips @ from watch handles", () => {
    const demo = demoOnboardingProposal();
    const raw = {
      ...demo,
      watches: demo.watches.map((w, i) =>
        i === 0 ? { ...w, handle: `@${w.handle}` } : w
      ),
    };
    const parsed = parseOnboardingConciergeProposal(raw);
    expect(parsed?.watches[0]?.handle).toBe(demo.watches[0]?.handle);
  });
});
