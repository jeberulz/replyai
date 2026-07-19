import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";

export const start = internalAction({
  args: {
    sessionToken: v.string(),
    experimentId: v.id("evalExperiments"),
    maxRetries: v.optional(v.number()),
    maxToolCalls: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<unknown> => {
    return await ctx.runMutation(internal.evalRunnerJobs.startOrResume, {
      ...args,
      mode: "start",
    });
  },
});

export const resume = internalAction({
  args: {
    sessionToken: v.string(),
    experimentId: v.id("evalExperiments"),
    maxRetries: v.optional(v.number()),
    maxToolCalls: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<unknown> => {
    return await ctx.runMutation(internal.evalRunnerJobs.startOrResume, {
      ...args,
      mode: "resume",
    });
  },
});
