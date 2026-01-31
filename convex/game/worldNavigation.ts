import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { requireCampaignMember } from "../lib/auth";

// ============ QUERIES ============

/**
 * Returns all visible maps (cities/regions) for the world graph,
 * along with discovery state and connections.
 */
export const getWorldGraph = query({
  args: {
    campaignId: v.id("campaigns"),
  },
  handler: async (ctx, args) => {
    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign) return null;

    // Get all campaign maps (the link table)
    const campaignMaps = await ctx.db
      .query("campaignMaps")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .collect();

    const mapIds = campaignMaps.map((cm) => cm.mapId);

    // Fetch all maps
    const maps = await Promise.all(mapIds.map((id) => ctx.db.get(id)));
    const validMaps = maps.filter(
      (m): m is NonNullable<typeof m> => m !== null,
    );

    // Get discovery records
    const discoveries = await ctx.db
      .query("campaignMapDiscovery")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .collect();
    const discoveredMapIds = new Set(
      discoveries.map((d) => d.mapId as string),
    );

    // Build world graph nodes — only include visible maps
    const nodes = validMaps
      .filter((m) => m.visibility !== "hidden")
      .map((m) => ({
        id: m._id,
        name: m.name,
        description: m.description,
        slug: m.slug,
        isDiscovered: discoveredMapIds.has(m._id as string),
        hasCityGrid: !!m.cityGridData,
        connectedMaps: m.connectedMaps ?? [],
        parentMapId: m.parentMapId,
        properties: m.properties,
      }));

    // Current city map
    const worldMapId = campaign.worldMapId;

    return {
      nodes,
      worldMapId,
      discoveredCount: nodes.filter((n) => n.isDiscovered).length,
      totalCount: nodes.length,
    };
  },
});

// ============ MUTATIONS ============

/**
 * Travel to a different city (map) on the world graph.
 * Validates connection, updates session's currentMapId, auto-discovers.
 */
export const travelToCity = mutation({
  args: {
    sessionId: v.id("gameSessions"),
    mapId: v.id("maps"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found");
    await requireCampaignMember(ctx, session.campaignId);

    const targetMap = await ctx.db.get(args.mapId);
    if (!targetMap) throw new Error("Map not found");

    // If we have a current city map, validate the connection
    if (session.currentMapId) {
      const currentMap = await ctx.db.get(session.currentMapId);
      if (currentMap) {
        const connections = currentMap.connectedMaps ?? [];
        const isConnected = connections.some(
          (id) => id.toString() === args.mapId.toString(),
        );
        if (!isConnected) {
          throw new Error("Destination city is not connected to current city");
        }
      }
    }

    // Auto-discover the target map
    const existingDiscovery = await ctx.db
      .query("campaignMapDiscovery")
      .withIndex("by_campaign_and_map", (q) =>
        q.eq("campaignId", session.campaignId).eq("mapId", args.mapId),
      )
      .first();

    if (!existingDiscovery) {
      await ctx.db.insert("campaignMapDiscovery", {
        campaignId: session.campaignId,
        mapId: args.mapId,
        discoveredAt: Date.now(),
      });
    }

    // Update session — switch to city mode for the new map
    await ctx.db.patch(args.sessionId, {
      currentMapId: args.mapId,
      navigationMode: "city",
      cityPosition: { x: 7, y: 7 }, // default center
      locationId: undefined, // clear location when entering city
      lastActionAt: Date.now(),
    });

    // Log the travel
    await ctx.db.insert("gameLog", {
      campaignId: session.campaignId,
      sessionId: args.sessionId,
      type: "narration",
      content: `You arrive at ${targetMap.name}.`,
      actorType: "dm",
      createdAt: Date.now(),
    });

    return {
      arrived: true,
      map: {
        id: targetMap._id,
        name: targetMap.name,
        description: targetMap.description,
      },
    };
  },
});

/**
 * Reveal a hidden city on the world graph.
 * Sets visibility from "hidden" to "visible" and creates a discovery record.
 */
export const revealWorldNode = mutation({
  args: {
    campaignId: v.id("campaigns"),
    mapId: v.id("maps"),
  },
  handler: async (ctx, args) => {
    const map = await ctx.db.get(args.mapId);
    if (!map) throw new Error("Map not found");

    // Set visibility to visible
    if (map.visibility === "hidden") {
      await ctx.db.patch(args.mapId, { visibility: "visible" });
    }

    // Auto-discover
    const existingDiscovery = await ctx.db
      .query("campaignMapDiscovery")
      .withIndex("by_campaign_and_map", (q) =>
        q.eq("campaignId", args.campaignId).eq("mapId", args.mapId),
      )
      .first();

    if (!existingDiscovery) {
      await ctx.db.insert("campaignMapDiscovery", {
        campaignId: args.campaignId,
        mapId: args.mapId,
        discoveredAt: Date.now(),
      });
    }

    // Game log entry
    await ctx.db.insert("gameLog", {
      campaignId: args.campaignId,
      type: "system",
      content: `You learn of a place called ${map.name}...`,
      createdAt: Date.now(),
    });

    return { revealed: true, name: map.name };
  },
});

/**
 * Exit to world view from city.
 */
export const exitToWorld = mutation({
  args: {
    sessionId: v.id("gameSessions"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found");

    await ctx.db.patch(args.sessionId, {
      navigationMode: "world",
      lastActionAt: Date.now(),
    });

    return { exited: true };
  },
});
