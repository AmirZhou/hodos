import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { ensureRivermootMap } from "./ensureRivermootMap";

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

    // If campaign has a seedScenario, ensure the map data exists before creating the session
    const campaign = await ctx.db.get(args.campaignId);
    if (campaign?.seedScenario === "rivermoot-city") {
      await ensureRivermootMap(ctx, args.campaignId);
    }

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

    const sessionId = await ctx.db.insert("gameSessions", {
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

    // Add initial game log for rivermoot-city seed scenario on first session
    if (campaign?.seedScenario === "rivermoot-city") {
      const existingLog = await ctx.db
        .query("gameLog")
        .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
        .first();

      if (!existingLog) {
        await ctx.db.insert("gameLog", {
          campaignId: args.campaignId,
          sessionId,
          type: "system",
          content:
            "You arrive at The Crossroads — the beating heart of Rivermoot, where the four great bridges converge above the river junction.",
          createdAt: now,
        });
        await ctx.db.insert("gameLog", {
          campaignId: args.campaignId,
          sessionId,
          type: "narration",
          actorType: "dm",
          content:
            "Merchant carts rumble across cobblestones around you. Street performers juggle flame nearby, and the city watch keeps a wary eye from the central watchtower. Four arched gateways mark the entrances to each quadrant — the noble temples to the northwest, the bustling markets to the northeast, the arcane towers to the southwest, and the shadowy docks to the southeast. The city of Rivermoot stretches before you in every direction.",
          createdAt: now + 1,
        });
        await ctx.db.insert("gameLog", {
          campaignId: args.campaignId,
          sessionId,
          type: "system",
          content:
            "Use the City tab in the sidebar to navigate the 16×16 city grid. Step on a location tile and click Enter to explore it.",
          createdAt: now + 2,
        });
      }
    }

    return sessionId;
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
