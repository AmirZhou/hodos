import { QueryCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import {
  computeEquipmentBonuses,
  computeDerivedStats,
  DerivedStats,
} from "./stats";

/**
 * Fetch a character and their equipped items, then compute derived stats.
 * Used by combat, dice, and action resolution code.
 */
export async function getEffectiveStats(
  ctx: { db: QueryCtx["db"] },
  characterId: Id<"characters">,
): Promise<DerivedStats> {
  const character = await ctx.db.get(characterId);
  if (!character) {
    throw new Error("Character not found");
  }

  const equippedItems = await ctx.db
    .query("items")
    .withIndex("by_owner", (q) => q.eq("ownerId", characterId))
    .filter((q) => q.eq(q.field("status"), "equipped"))
    .collect();

  const bonuses = computeEquipmentBonuses(equippedItems);
  return computeDerivedStats(character, bonuses);
}
