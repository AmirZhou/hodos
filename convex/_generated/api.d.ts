/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ai_dm from "../ai/dm.js";
import type * as campaigns from "../campaigns.js";
import type * as characters from "../characters.js";
import type * as dice from "../dice.js";
import type * as game_actions from "../game/actions.js";
import type * as game_log from "../game/log.js";
import type * as game_session from "../game/session.js";
import type * as gameLog from "../gameLog.js";
import type * as npcs from "../npcs.js";
import type * as relationships from "../relationships.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "ai/dm": typeof ai_dm;
  campaigns: typeof campaigns;
  characters: typeof characters;
  dice: typeof dice;
  "game/actions": typeof game_actions;
  "game/log": typeof game_log;
  "game/session": typeof game_session;
  gameLog: typeof gameLog;
  npcs: typeof npcs;
  relationships: typeof relationships;
  users: typeof users;
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
