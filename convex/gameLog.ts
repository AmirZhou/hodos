import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const add = mutation({
  args: {
    campaignId: v.id("campaigns"),
    sessionId: v.optional(v.id("gameSessions")),
    type: v.union(
      v.literal("narration"),
      v.literal("dialogue"),
      v.literal("action"),
      v.literal("roll"),
      v.literal("system"),
      v.literal("ooc")
    ),
    contentEn: v.string(),
    contentFr: v.string(),
    actorType: v.optional(
      v.union(v.literal("dm"), v.literal("character"), v.literal("npc"))
    ),
    actorId: v.optional(v.string()),
    actorName: v.optional(v.string()),
    roll: v.optional(
      v.object({
        type: v.string(),
        dice: v.string(),
        result: v.number(),
        dc: v.optional(v.number()),
        success: v.optional(v.boolean()),
      })
    ),
    annotations: v.optional(
      v.object({
        vocabulary: v.array(
          v.object({
            word: v.string(),
            translation: v.string(),
            note: v.optional(v.string()),
          })
        ),
        grammar: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("gameLog", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

export const list = query({
  args: {
    campaignId: v.id("campaigns"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    return await ctx.db
      .query("gameLog")
      .withIndex("by_campaign_and_time", (q) => q.eq("campaignId", args.campaignId))
      .order("desc")
      .take(limit)
      .then((logs) => logs.reverse());
  },
});

export const listAfter = query({
  args: {
    campaignId: v.id("campaigns"),
    afterTimestamp: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("gameLog")
      .withIndex("by_campaign_and_time", (q) => q.eq("campaignId", args.campaignId))
      .filter((q) => q.gt(q.field("createdAt"), args.afterTimestamp))
      .collect();
  },
});
