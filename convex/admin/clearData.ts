import { mutation } from "../_generated/server";
import { requireAuth } from "../lib/auth";
import { logAudit } from "../lib/auditLog";

// WARNING: This will delete ALL data from the database!
// Only use for development purposes.
export const clearAllData = mutation({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuth(ctx);

    const tables = [
      "users",
      "campaigns",
      "characters",
      "npcs",
      "relationships",
      "npcMemories",
      "maps",
      "campaignMaps",
      "campaignLocationDiscovery",
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

    await logAudit(ctx, userId, "admin.clearData", "system", undefined, { tables: "all" });

    return { deleted: totalDeleted };
  },
});
