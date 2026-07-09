"use node";

/**
 * WP39 — onboarding concierge action.
 * S2 ships a minimal stub so startRun can schedule; S3 fills LLM/X path.
 */

import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { demoOnboardingProposal } from "../shared/onboardingConcierge";

export const runConcierge = internalAction({
  args: {
    userId: v.id("users"),
    runId: v.id("onboardingConciergeRuns"),
  },
  returns: v.null(),
  handler: async (ctx, { userId, runId }) => {
    // S2 stub: always demo proposal. S3 replaces with X fetch + LLM/heuristic.
    const proposal = demoOnboardingProposal({});
    await ctx.runMutation(internal.onboardingConcierge.completeRun, {
      runId,
      userId,
      proposal,
      demo: true,
    });
    return null;
  },
});
