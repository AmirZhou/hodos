import { mutation } from "../_generated/server";

/**
 * One-off migration: delete location documents that lack the required `mapId` field.
 * These are stale rows from before the schema was updated.
 * Safe to delete after running.
 */
export const cleanStaleLocations = mutation({
  args: {},
  handler: async (ctx) => {
    const allLocations = await ctx.db.query("locations").collect();
    let deleted = 0;

    for (const loc of allLocations) {
      // Documents missing mapId are stale
      if (!(loc as any).mapId) {
        await ctx.db.delete(loc._id);
        deleted++;
      }
    }

    return { deleted, total: allLocations.length };
  },
});
