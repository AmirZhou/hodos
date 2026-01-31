/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin_clearData from "../admin/clearData.js";
import type * as admin_seedTestData from "../admin/seedTestData.js";
import type * as ai_dm from "../ai/dm.js";
import type * as ai_llmProvider from "../ai/llmProvider.js";
import type * as campaigns from "../campaigns.js";
import type * as characters from "../characters.js";
import type * as data_equipmentItems from "../data/equipmentItems.js";
import type * as data_itemCatalog from "../data/itemCatalog.js";
import type * as data_kinkTaxonomy from "../data/kinkTaxonomy.js";
import type * as data_rivermootCity from "../data/rivermootCity.js";
import type * as data_rivermootGrid from "../data/rivermootGrid.js";
import type * as data_worldMap from "../data/worldMap.js";
import type * as dice from "../dice.js";
import type * as equipment from "../equipment.js";
import type * as files from "../files.js";
import type * as game_actions from "../game/actions.js";
import type * as game_cityNavigation from "../game/cityNavigation.js";
import type * as game_combat from "../game/combat.js";
import type * as game_ensureRivermootMap from "../game/ensureRivermootMap.js";
import type * as game_exploration from "../game/exploration.js";
import type * as game_itemGrants from "../game/itemGrants.js";
import type * as game_log from "../game/log.js";
import type * as game_loot from "../game/loot.js";
import type * as game_npcNameResolver from "../game/npcNameResolver.js";
import type * as game_npcs from "../game/npcs.js";
import type * as game_scene from "../game/scene.js";
import type * as game_seedMap from "../game/seedMap.js";
import type * as game_session from "../game/session.js";
import type * as game_streaming from "../game/streaming.js";
import type * as game_trade from "../game/trade.js";
import type * as game_travel from "../game/travel.js";
import type * as game_worldNavigation from "../game/worldNavigation.js";
import type * as gameLog from "../gameLog.js";
import type * as http from "../http.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_conditions from "../lib/conditions.js";
import type * as lib_statHelpers from "../lib/statHelpers.js";
import type * as lib_stats from "../lib/stats.js";
import type * as lib_validation from "../lib/validation.js";
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
  "admin/clearData": typeof admin_clearData;
  "admin/seedTestData": typeof admin_seedTestData;
  "ai/dm": typeof ai_dm;
  "ai/llmProvider": typeof ai_llmProvider;
  campaigns: typeof campaigns;
  characters: typeof characters;
  "data/equipmentItems": typeof data_equipmentItems;
  "data/itemCatalog": typeof data_itemCatalog;
  "data/kinkTaxonomy": typeof data_kinkTaxonomy;
  "data/rivermootCity": typeof data_rivermootCity;
  "data/rivermootGrid": typeof data_rivermootGrid;
  "data/worldMap": typeof data_worldMap;
  dice: typeof dice;
  equipment: typeof equipment;
  files: typeof files;
  "game/actions": typeof game_actions;
  "game/cityNavigation": typeof game_cityNavigation;
  "game/combat": typeof game_combat;
  "game/ensureRivermootMap": typeof game_ensureRivermootMap;
  "game/exploration": typeof game_exploration;
  "game/itemGrants": typeof game_itemGrants;
  "game/log": typeof game_log;
  "game/loot": typeof game_loot;
  "game/npcNameResolver": typeof game_npcNameResolver;
  "game/npcs": typeof game_npcs;
  "game/scene": typeof game_scene;
  "game/seedMap": typeof game_seedMap;
  "game/session": typeof game_session;
  "game/streaming": typeof game_streaming;
  "game/trade": typeof game_trade;
  "game/travel": typeof game_travel;
  "game/worldNavigation": typeof game_worldNavigation;
  gameLog: typeof gameLog;
  http: typeof http;
  "lib/auth": typeof lib_auth;
  "lib/conditions": typeof lib_conditions;
  "lib/statHelpers": typeof lib_statHelpers;
  "lib/stats": typeof lib_stats;
  "lib/validation": typeof lib_validation;
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
