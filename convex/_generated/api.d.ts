/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as account from "../account.js";
import type * as analyses from "../analyses.js";
import type * as authors from "../authors.js";
import type * as billing from "../billing.js";
import type * as billingNode from "../billingNode.js";
import type * as briefingActions from "../briefingActions.js";
import type * as briefings from "../briefings.js";
import type * as cache from "../cache.js";
import type * as compose from "../compose.js";
import type * as crons from "../crons.js";
import type * as drafts from "../drafts.js";
import type * as evals from "../evals.js";
import type * as helpers from "../helpers.js";
import type * as http from "../http.js";
import type * as lib_analytics from "../lib/analytics.js";
import type * as lib_fairUse from "../lib/fairUse.js";
import type * as lib_sentry from "../lib/sentry.js";
import type * as notifications from "../notifications.js";
import type * as notificationsActions from "../notificationsActions.js";
import type * as onboardingConcierge from "../onboardingConcierge.js";
import type * as onboardingConciergeActions from "../onboardingConciergeActions.js";
import type * as opportunities from "../opportunities.js";
import type * as outcomes from "../outcomes.js";
import type * as projects from "../projects.js";
import type * as publish from "../publish.js";
import type * as ranking from "../ranking.js";
import type * as replies from "../replies.js";
import type * as research from "../research.js";
import type * as researchActions from "../researchActions.js";
import type * as scanner from "../scanner.js";
import type * as scannerActions from "../scannerActions.js";
import type * as scannerSemantic from "../scannerSemantic.js";
import type * as semanticActions from "../semanticActions.js";
import type * as timing from "../timing.js";
import type * as tokenSecurity from "../tokenSecurity.js";
import type * as trends from "../trends.js";
import type * as usage from "../usage.js";
import type * as users from "../users.js";
import type * as variants from "../variants.js";
import type * as voiceDrift from "../voiceDrift.js";
import type * as voiceDriftActions from "../voiceDriftActions.js";
import type * as voiceProfiles from "../voiceProfiles.js";
import type * as xTokens from "../xTokens.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  account: typeof account;
  analyses: typeof analyses;
  authors: typeof authors;
  billing: typeof billing;
  billingNode: typeof billingNode;
  briefingActions: typeof briefingActions;
  briefings: typeof briefings;
  cache: typeof cache;
  compose: typeof compose;
  crons: typeof crons;
  drafts: typeof drafts;
  evals: typeof evals;
  helpers: typeof helpers;
  http: typeof http;
  "lib/analytics": typeof lib_analytics;
  "lib/fairUse": typeof lib_fairUse;
  "lib/sentry": typeof lib_sentry;
  notifications: typeof notifications;
  notificationsActions: typeof notificationsActions;
  onboardingConcierge: typeof onboardingConcierge;
  onboardingConciergeActions: typeof onboardingConciergeActions;
  opportunities: typeof opportunities;
  outcomes: typeof outcomes;
  projects: typeof projects;
  publish: typeof publish;
  ranking: typeof ranking;
  replies: typeof replies;
  research: typeof research;
  researchActions: typeof researchActions;
  scanner: typeof scanner;
  scannerActions: typeof scannerActions;
  scannerSemantic: typeof scannerSemantic;
  semanticActions: typeof semanticActions;
  timing: typeof timing;
  tokenSecurity: typeof tokenSecurity;
  trends: typeof trends;
  usage: typeof usage;
  users: typeof users;
  variants: typeof variants;
  voiceDrift: typeof voiceDrift;
  voiceDriftActions: typeof voiceDriftActions;
  voiceProfiles: typeof voiceProfiles;
  xTokens: typeof xTokens;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
