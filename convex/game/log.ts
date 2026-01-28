import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

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
      v.literal("ooc"),
      v.literal("movement")
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
    linguisticAnalysis: v.optional(
      v.object({
        grammar: v.array(v.string()),
        vocabulary: v.array(
          v.object({
            word: v.string(),
            translation: v.string(),
            partOfSpeech: v.string(),
            usage: v.optional(v.string()),
          })
        ),
        usageNotes: v.array(v.string()),
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

export const getRecent = query({
  args: {
    campaignId: v.id("campaigns"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;
    return await ctx.db
      .query("gameLog")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .order("desc")
      .take(limit)
      .then((logs) => logs.reverse()); // Return in chronological order
  },
});

export const subscribe = query({
  args: {
    campaignId: v.id("campaigns"),
    after: v.optional(v.id("gameLog")),
  },
  handler: async (ctx, args) => {
    // Get all logs after the specified ID, or the last 50 if no ID provided
    const logs = await ctx.db
      .query("gameLog")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .order("desc")
      .take(50);

    if (args.after) {
      const afterIndex = logs.findIndex((l) => l._id === args.after);
      if (afterIndex >= 0) {
        return logs.slice(0, afterIndex).reverse();
      }
    }

    return logs.reverse();
  },
});
