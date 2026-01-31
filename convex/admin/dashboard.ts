import { query } from "../_generated/server";
import { requireAdmin } from "../lib/admin";

export const getActiveSessionCount = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const sessions = await ctx.db
      .query("gameSessions")
      .filter((q) => q.neq(q.field("status"), "ended"))
      .collect();

    return { count: sessions.length };
  },
});

export const getUserCount = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const users = await ctx.db.query("users").collect();
    return { count: users.length };
  },
});

export const getCampaignStats = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const campaigns = await ctx.db.query("campaigns").collect();

    const byStatus = {
      lobby: 0,
      active: 0,
      paused: 0,
      completed: 0,
    };

    for (const c of campaigns) {
      byStatus[c.status]++;
    }

    return {
      total: campaigns.length,
      byStatus,
    };
  },
});

export const getRecentAuditLog = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const entries = await ctx.db
      .query("auditLog")
      .withIndex("by_time")
      .order("desc")
      .take(50);

    // Enrich with user display names
    const enriched = await Promise.all(
      entries.map(async (entry) => {
        const user = await ctx.db.get(entry.userId);
        return {
          ...entry,
          userDisplayName: user?.displayName ?? "Unknown",
        };
      })
    );

    return enriched;
  },
});
