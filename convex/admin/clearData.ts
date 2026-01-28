import { mutation } from "../_generated/server";

// WARNING: This will delete ALL data from the database!
// Only use for development purposes.
export const clearAllData = mutation({
  args: {},
  handler: async (ctx) => {
    const tables = [
      "users",
      "campaigns",
      "characters",
      "npcs",
      "relationships",
      "npcMemories",
      "locations",
      "combatEncounters",
      "gameSessions",
      "gameLog",
    ];

    let totalDeleted = 0;

    for (const table of tables) {
      try {
        const docs = await ctx.db.query(table as any).collect();
        for (const doc of docs) {
          await ctx.db.delete(doc._id);
          totalDeleted++;
        }
        console.log(`Deleted ${docs.length} documents from ${table}`);
      } catch (e) {
        console.log(`Skipped ${table}: ${e}`);
      }
    }

    return { deleted: totalDeleted };
  },
});
