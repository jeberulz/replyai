import { defineApp } from "convex/server";
import { v } from "convex/values";

export default defineApp({
  env: {
    STRIPE_PRO_PRICE_ID: v.optional(v.string()),
    STRIPE_SECRET_KEY: v.optional(v.string()),
    STRIPE_WEBHOOK_SECRET: v.optional(v.string()),
    CONVEX_AUTH_PROVISION_SECRET: v.optional(v.string()),
    AI_SPEND_KILL_SWITCH: v.optional(v.string()),
    AI_SPEND_LIMITS_REQUIRED: v.optional(v.string()),
    AI_ANALYSIS_HOURLY_LIMIT: v.optional(v.string()),
    AI_GENERATION_HOURLY_LIMIT: v.optional(v.string()),
    X_READ_KILL_SWITCH: v.optional(v.string()),
    X_READ_LIMITS_REQUIRED: v.optional(v.string()),
    X_READ_USER_DAILY_LIMIT: v.optional(v.string()),
    X_READ_GLOBAL_DAILY_LIMIT: v.optional(v.string()),
  },
});
