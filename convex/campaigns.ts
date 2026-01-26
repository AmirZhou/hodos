import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export const create = mutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    storyPackId: v.optional(v.id("storyPacks")),
  },
  handler: async (ctx, args) => {
    const inviteCode = generateInviteCode();
    const now = Date.now();

    const campaignId = await ctx.db.insert("campaigns", {
      ownerId: args.userId,
      name: args.name,
      inviteCode,
      storyPackId: args.storyPackId,
      status: "lobby",
      settings: {
        maxPlayers: 6,
        allowVideoChat: true,
        contentRating: "explicit",
      },
      createdAt: now,
      lastPlayedAt: now,
    });

    // Add owner as member
    await ctx.db.insert("campaignMembers", {
      campaignId,
      userId: args.userId,
      role: "owner",
      isOnline: false,
      lastSeenAt: now,
    });

    // Initialize world state
    await ctx.db.insert("worldState", {
      campaignId,
      currentTime: { day: 1, hour: 8, minute: 0 },
      flags: {},
      activeEvents: [],
    });

    return { campaignId, inviteCode };
  },
});

export const list = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const memberships = await ctx.db
      .query("campaignMembers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const campaigns = await Promise.all(
      memberships.map(async (m) => {
        const campaign = await ctx.db.get(m.campaignId);
        if (!campaign) return null;

        const memberCount = await ctx.db
          .query("campaignMembers")
          .withIndex("by_campaign", (q) => q.eq("campaignId", m.campaignId))
          .collect();

        return {
          ...campaign,
          memberCount: memberCount.length,
          myRole: m.role,
          myCharacterId: m.characterId,
        };
      })
    );

    return campaigns.filter(Boolean);
  },
});

export const get = query({
  args: { id: v.id("campaigns") },
  handler: async (ctx, args) => {
    const campaign = await ctx.db.get(args.id);
    if (!campaign) return null;

    const members = await ctx.db
      .query("campaignMembers")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.id))
      .collect();

    const membersWithUsers = await Promise.all(
      members.map(async (m) => {
        const user = await ctx.db.get(m.userId);
        const character = m.characterId ? await ctx.db.get(m.characterId) : null;
        return { ...m, user, character };
      })
    );

    const worldState = await ctx.db
      .query("worldState")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.id))
      .first();

    return {
      ...campaign,
      members: membersWithUsers,
      worldState,
    };
  },
});

export const getMembership = query({
  args: {
    campaignId: v.id("campaigns"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("campaignMembers")
      .withIndex("by_campaign_and_user", (q) =>
        q.eq("campaignId", args.campaignId).eq("userId", args.userId)
      )
      .first();
  },
});

export const join = mutation({
  args: {
    userId: v.id("users"),
    inviteCode: v.string(),
  },
  handler: async (ctx, args) => {
    const campaign = await ctx.db
      .query("campaigns")
      .withIndex("by_invite_code", (q) => q.eq("inviteCode", args.inviteCode.toUpperCase()))
      .first();

    if (!campaign) {
      throw new Error("Invalid invite code");
    }

    // Check if already a member
    const existing = await ctx.db
      .query("campaignMembers")
      .withIndex("by_campaign_and_user", (q) =>
        q.eq("campaignId", campaign._id).eq("userId", args.userId)
      )
      .first();

    if (existing) {
      return { campaignId: campaign._id, alreadyMember: true };
    }

    // Check max players
    const memberCount = await ctx.db
      .query("campaignMembers")
      .withIndex("by_campaign", (q) => q.eq("campaignId", campaign._id))
      .collect();

    if (memberCount.length >= campaign.settings.maxPlayers) {
      throw new Error("Campaign is full");
    }

    await ctx.db.insert("campaignMembers", {
      campaignId: campaign._id,
      userId: args.userId,
      role: "player",
      isOnline: false,
      lastSeenAt: Date.now(),
    });

    return { campaignId: campaign._id, alreadyMember: false };
  },
});

export const updateStatus = mutation({
  args: {
    campaignId: v.id("campaigns"),
    status: v.union(
      v.literal("lobby"),
      v.literal("active"),
      v.literal("paused"),
      v.literal("completed")
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.campaignId, {
      status: args.status,
      lastPlayedAt: Date.now(),
    });
  },
});
