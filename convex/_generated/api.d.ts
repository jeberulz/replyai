/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as analyses from "../analyses.js";
import type * as cache from "../cache.js";
import type * as crons from "../crons.js";
import type * as drafts from "../drafts.js";
import type * as helpers from "../helpers.js";
import type * as opportunities from "../opportunities.js";
import type * as publish from "../publish.js";
import type * as replies from "../replies.js";
import type * as scanner from "../scanner.js";
import type * as usage from "../usage.js";
import type * as users from "../users.js";
import type * as voiceProfiles from "../voiceProfiles.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  analyses: typeof analyses;
  cache: typeof cache;
  crons: typeof crons;
  drafts: typeof drafts;
  helpers: typeof helpers;
  opportunities: typeof opportunities;
  publish: typeof publish;
  replies: typeof replies;
  scanner: typeof scanner;
  usage: typeof usage;
  users: typeof users;
  voiceProfiles: typeof voiceProfiles;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
