import { mutation } from "../_generated/server";

// One-time migration: convert old equipped shape to new 11-slot system
export const migrateEquippedSlots = mutation({
  args: {},
  handler: async (ctx) => {
    const characters = await ctx.db.query("characters").collect();
    let migrated = 0;

    for (const character of characters) {
      const equipped = character.equipped as Record<string, unknown>;

      // Check if old shape (has `accessories` or `armor` keys)
      if ("accessories" in equipped || "armor" in equipped) {
        // Build new equipped object, preserving mainHand/offHand if they exist
        const newEquipped: Record<string, unknown> = {};

        // mainHand and offHand existed in old schema too, but as old `item` type
        // which is incompatible — drop them since they lack rarity/stats fields
        // Just start fresh with empty equipped

        await ctx.db.patch(character._id, {
          equipped: newEquipped,
          // Also ensure inventory is empty array (old items are incompatible)
          inventory: [],
        });
        migrated++;
      }
    }

    return { migrated, total: characters.length };
  },
});
