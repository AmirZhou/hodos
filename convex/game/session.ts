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
    return await ctx.db.insert("gameSessions", {
      campaignId: args.campaignId,
      status: "active",
      mode: args.mode || "exploration",
      locationId: args.locationId,
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
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      lastActionAt: Date.now(),
    });
  },
});

export const startCombat = mutation({
  args: {
    sessionId: v.id("gameSessions"),
    participants: v.array(
      v.object({
        id: v.string(),
        type: v.union(v.literal("character"), v.literal("npc")),
        initiative: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    // Sort by initiative
    const turnOrder = [...args.participants].sort(
      (a, b) => b.initiative - a.initiative
    );

    await ctx.db.patch(args.sessionId, {
      mode: "combat",
      combat: {
        turnOrder,
        currentTurnIndex: 0,
        round: 1,
      },
      lastActionAt: Date.now(),
    });
  },
});

export const nextTurn = mutation({
  args: {
    sessionId: v.id("gameSessions"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session || !session.combat) {
      throw new Error("No active combat");
    }

    let nextIndex = session.combat.currentTurnIndex + 1;
    let round = session.combat.round;

    if (nextIndex >= session.combat.turnOrder.length) {
      nextIndex = 0;
      round += 1;
    }

    await ctx.db.patch(args.sessionId, {
      combat: {
        ...session.combat,
        currentTurnIndex: nextIndex,
        round,
      },
      lastActionAt: Date.now(),
    });

    return {
      currentTurn: session.combat.turnOrder[nextIndex],
      round,
    };
  },
});

export const endCombat = mutation({
  args: {
    sessionId: v.id("gameSessions"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      mode: "exploration",
      combat: undefined,
      lastActionAt: Date.now(),
    });
  },
});

export const startScene = mutation({
  args: {
    sessionId: v.id("gameSessions"),
    participants: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      mode: "scene",
      scene: {
        participants: args.participants,
        intensity: 0,
        safewordUsed: false,
      },
      lastActionAt: Date.now(),
    });
  },
});

export const updateSceneIntensity = mutation({
  args: {
    sessionId: v.id("gameSessions"),
    intensity: v.number(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session || !session.scene) {
      throw new Error("No active scene");
    }

    await ctx.db.patch(args.sessionId, {
      scene: {
        ...session.scene,
        intensity: Math.max(0, Math.min(100, args.intensity)),
      },
      lastActionAt: Date.now(),
    });
  },
});

export const useSafeword = mutation({
  args: {
    sessionId: v.id("gameSessions"),
    level: v.union(v.literal("yellow"), v.literal("red")),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session || !session.scene) {
      throw new Error("No active scene");
    }

    if (args.level === "red") {
      // RED = full stop, end scene immediately
      await ctx.db.patch(args.sessionId, {
        mode: "exploration",
        scene: undefined,
        lastActionAt: Date.now(),
      });
      return { ended: true };
    } else {
      // YELLOW = pause, mark that safeword was used
      await ctx.db.patch(args.sessionId, {
        scene: {
          ...session.scene,
          safewordUsed: true,
        },
        lastActionAt: Date.now(),
      });
      return { ended: false };
    }
  },
});

export const endScene = mutation({
  args: {
    sessionId: v.id("gameSessions"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      mode: "exploration",
      scene: undefined,
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
