/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as analyses from "../analyses.js";
import type * as cache from "../cache.js";
import type * as crons from "../crons.js";
import type * as drafts from "../drafts.js";
import type * as evals from "../evals.js";
import type * as helpers from "../helpers.js";
import type * as opportunities from "../opportunities.js";
import type * as projects from "../projects.js";
import type * as publish from "../publish.js";
import type * as replies from "../replies.js";
import type * as scanner from "../scanner.js";
import type * as scannerActions from "../scannerActions.js";
import type * as usage from "../usage.js";
import type * as users from "../users.js";
import type * as voiceProfiles from "../voiceProfiles.js";
import type * as xTokens from "../xTokens.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  analyses: typeof analyses;
  cache: typeof cache;
  crons: typeof crons;
  drafts: typeof drafts;
  evals: typeof evals;
  helpers: typeof helpers;
  opportunities: typeof opportunities;
  projects: typeof projects;
  publish: typeof publish;
  replies: typeof replies;
  scanner: typeof scanner;
  scannerActions: typeof scannerActions;
  usage: typeof usage;
  users: typeof users;
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
