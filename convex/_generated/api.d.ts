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
import type * as ai_llmProvider from "../ai/llmProvider.js";
import type * as campaigns from "../campaigns.js";
import type * as characters from "../characters.js";
import type * as data_equipmentItems from "../data/equipmentItems.js";
import type * as data_itemCatalog from "../data/itemCatalog.js";
import type * as dice from "../dice.js";
import type * as equipment from "../equipment.js";
import type * as game_actions from "../game/actions.js";
import type * as game_combat from "../game/combat.js";
import type * as game_exploration from "../game/exploration.js";
import type * as game_itemGrants from "../game/itemGrants.js";
import type * as game_log from "../game/log.js";
import type * as game_npcNameResolver from "../game/npcNameResolver.js";
import type * as game_npcs from "../game/npcs.js";
import type * as game_scene from "../game/scene.js";
import type * as game_seedTestScenario from "../game/seedTestScenario.js";
import type * as game_session from "../game/session.js";
import type * as game_streaming from "../game/streaming.js";
import type * as game_travel from "../game/travel.js";
import type * as gameLog from "../gameLog.js";
import type * as http from "../http.js";
import type * as notebook from "../notebook.js";
import type * as npcMemories from "../npcMemories.js";
import type * as npcs from "../npcs.js";
import type * as presence from "../presence.js";
import type * as relationships from "../relationships.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "ai/dm": typeof ai_dm;
  "ai/llmProvider": typeof ai_llmProvider;
  campaigns: typeof campaigns;
  characters: typeof characters;
  "data/equipmentItems": typeof data_equipmentItems;
  "data/itemCatalog": typeof data_itemCatalog;
  dice: typeof dice;
  equipment: typeof equipment;
  "game/actions": typeof game_actions;
  "game/combat": typeof game_combat;
  "game/exploration": typeof game_exploration;
  "game/itemGrants": typeof game_itemGrants;
  "game/log": typeof game_log;
  "game/npcNameResolver": typeof game_npcNameResolver;
  "game/npcs": typeof game_npcs;
  "game/scene": typeof game_scene;
  "game/seedTestScenario": typeof game_seedTestScenario;
  "game/session": typeof game_session;
  "game/streaming": typeof game_streaming;
  "game/travel": typeof game_travel;
  gameLog: typeof gameLog;
  http: typeof http;
  notebook: typeof notebook;
  npcMemories: typeof npcMemories;
  npcs: typeof npcs;
  presence: typeof presence;
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
