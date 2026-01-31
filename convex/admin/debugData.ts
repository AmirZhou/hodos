import { query } from "../_generated/server";

export const getActiveData = query({
  args: {},
  handler: async (ctx) => {
    // Find all users
    const users = await ctx.db.query("users").collect();

    // Find all campaigns
    const campaigns = await ctx.db.query("campaigns").collect();

    // Find all characters
    const characters = await ctx.db.query("characters").collect();

    // Find all game sessions
    const sessions = await ctx.db.query("gameSessions").collect();

    // Find all loot containers
    const containers = await ctx.db.query("lootContainers").collect();

    // Find all items
    const items = await ctx.db.query("items").collect();

    return {
      users: users.map((u) => ({ _id: u._id, email: u.email, displayName: u.displayName })),
      campaigns: campaigns.map((c) => ({ _id: c._id, name: c.name, status: c.status })),
      characters: characters.map((c) => ({ _id: c._id, name: c.name, campaignId: c.campaignId, class: c.class })),
      sessions: sessions.map((s) => ({ _id: s._id, campaignId: s.campaignId, status: s.status, locationId: s.locationId })),
      containers: containers.map((c) => ({ _id: c._id, name: c.name, campaignId: c.campaignId, locationId: c.locationId, isLooted: c.isLooted })),
      itemCount: items.length,
    };
  },
});
