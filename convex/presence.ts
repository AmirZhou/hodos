import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuth } from "./lib/auth";

// Time in ms after which a player is considered offline
const OFFLINE_THRESHOLD_MS = 90000; // 90 seconds

export const heartbeat = mutation({
  args: {
    campaignId: v.id("campaigns"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);
    const existing = await ctx.db
      .query("presence")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .filter((q) => q.eq(q.field("userId"), userId))
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        isOnline: true,
        lastPing: now,
      });
      return existing._id;
    } else {
      return await ctx.db.insert("presence", {
        campaignId: args.campaignId,
        userId: userId,
        isOnline: true,
        isInVideo: false,
        lastPing: now,
      });
    }
  },
});

export const disconnect = mutation({
  args: {
    campaignId: v.id("campaigns"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("presence")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        isOnline: false,
        isInVideo: false,
      });
    }
  },
});

export const setVideoStatus = mutation({
  args: {
    campaignId: v.id("campaigns"),
    userId: v.id("users"),
    isInVideo: v.boolean(),
    videoRoomToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("presence")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        isInVideo: args.isInVideo,
        videoRoomToken: args.videoRoomToken,
        lastPing: Date.now(),
      });
    }
  },
});

export const getOnlinePlayers = query({
  args: {
    campaignId: v.id("campaigns"),
  },
  handler: async (ctx, args) => {
    const presenceRecords = await ctx.db
      .query("presence")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .collect();

    const now = Date.now();
    const onlinePlayers = [];

    for (const record of presenceRecords) {
      // Check if the player's last ping is within the threshold
      const isStillOnline =
        record.isOnline && now - record.lastPing < OFFLINE_THRESHOLD_MS;

      if (isStillOnline) {
        // Get the user info
        const user = await ctx.db.get(record.userId);
        if (user) {
          // Get their character in this campaign
          const member = await ctx.db
            .query("campaignMembers")
            .withIndex("by_campaign_and_user", (q) =>
              q.eq("campaignId", args.campaignId).eq("userId", record.userId)
            )
            .first();

          let character = null;
          if (member?.characterId) {
            character = await ctx.db.get(member.characterId);
          }

          onlinePlayers.push({
            presenceId: record._id,
            userId: record.userId,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
            isInVideo: record.isInVideo,
            lastPing: record.lastPing,
            character: character
              ? {
                  id: character._id,
                  name: character.name,
                  portrait: character.portrait,
                  hp: character.hp,
                  maxHp: character.maxHp,
                }
              : null,
          });
        }
      }
    }

    return onlinePlayers;
  },
});

export const getPresence = query({
  args: {
    campaignId: v.id("campaigns"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("presence")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();
  },
});
