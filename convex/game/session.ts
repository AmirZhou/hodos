import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

export const getCurrent = query({
  args: {
    campaignId: v.id("campaigns"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("gameSessions")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .filter((q) => q.neq(q.field("status"), "ended"))
      .first();
  },
});

export const start = mutation({
  args: {
    campaignId: v.id("campaigns"),
    mode: v.optional(
      v.union(
        v.literal("exploration"),
        v.literal("combat"),
        v.literal("scene"),
        v.literal("dialogue")
      )
    ),
    locationId: v.optional(v.id("locations")),
  },
  handler: async (ctx, args) => {
    // End any existing active sessions
    const existingSessions = await ctx.db
      .query("gameSessions")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .filter((q) => q.neq(q.field("status"), "ended"))
      .collect();

    for (const session of existingSessions) {
      await ctx.db.patch(session._id, { status: "ended" });
    }

    // Create new session
    const now = Date.now();

    // Check if campaign has a city map with grid data
    const campaignMaps = await ctx.db
      .query("campaignMaps")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .collect();

    let currentMapId: undefined | typeof campaignMaps[0]["mapId"] = undefined;
    for (const cm of campaignMaps) {
      const map = await ctx.db.get(cm.mapId);
      if (map?.cityGridData) {
        currentMapId = map._id;
        break;
      }
    }

    return await ctx.db.insert("gameSessions", {
      campaignId: args.campaignId,
      status: "active",
      mode: args.mode || "exploration",
      locationId: args.locationId,
      ...(currentMapId
        ? {
            currentMapId,
            navigationMode: "city" as const,
            cityPosition: { x: 7, y: 7 },
          }
        : {}),
      startedAt: now,
      lastActionAt: now,
    });
  },
});

export const updateMode = mutation({
  args: {
    sessionId: v.id("gameSessions"),
    mode: v.union(
      v.literal("exploration"),
      v.literal("combat"),
      v.literal("scene"),
      v.literal("dialogue")
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      mode: args.mode,
      lastActionAt: Date.now(),
    });
  },
});

export const updateLastAction = mutation({
  args: {
    sessionId: v.id("gameSessions"),
    suggestedActions: v.optional(v.array(v.object({
      text: v.string(),
      type: v.string(),
    }))),
  },
  handler: async (ctx, args) => {
    const patch: Record<string, unknown> = { lastActionAt: Date.now() };
    if (args.suggestedActions) {
      patch.suggestedActions = args.suggestedActions;
    }
    await ctx.db.patch(args.sessionId, patch);
  },
});

export const updateLocation = mutation({
  args: {
    sessionId: v.id("gameSessions"),
    locationId: v.id("locations"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      locationId: args.locationId,
      lastActionAt: Date.now(),
    });
  },
});

export const pause = mutation({
  args: {
    sessionId: v.id("gameSessions"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      status: "paused",
    });
  },
});

export const resume = mutation({
  args: {
    sessionId: v.id("gameSessions"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      status: "active",
      lastActionAt: Date.now(),
    });
  },
});

export const end = mutation({
  args: {
    sessionId: v.id("gameSessions"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      status: "ended",
    });
  },
});

// Set a pending roll for user to execute
export const setPendingRoll = mutation({
  args: {
    sessionId: v.id("gameSessions"),
    pendingRoll: v.object({
      type: v.string(),
      skill: v.optional(v.string()),
      ability: v.string(),
      dc: v.number(),
      reason: v.string(),
      stakes: v.optional(v.object({
        onSuccess: v.string(),
        onFailure: v.string(),
      })),
      characterId: v.id("characters"),
      actionContext: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      pendingRoll: args.pendingRoll,
      lastActionAt: Date.now(),
    });
  },
});

// Clear the pending roll
export const clearPendingRoll = mutation({
  args: {
    sessionId: v.id("gameSessions"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      pendingRoll: undefined,
      lastActionAt: Date.now(),
    });
  },
});

// Set LLM provider
export const setLlmProvider = mutation({
  args: {
    sessionId: v.id("gameSessions"),
    provider: v.union(v.literal("deepseek"), v.literal("openai")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      llmProvider: args.provider,
      lastActionAt: Date.now(),
    });
  },
});
