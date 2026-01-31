import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { requireCampaignMember } from "../lib/auth";

// ============ QUERIES ============

export const getCityGridState = query({
  args: {
    sessionId: v.id("gameSessions"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session || !session.currentMapId) return null;

    const map = await ctx.db.get(session.currentMapId);
    if (!map || !map.cityGridData) return null;

    // Build templateId → { locationId, name } from locations on this map
    const locations = await ctx.db
      .query("locations")
      .withIndex("by_map", (q) => q.eq("mapId", map._id))
      .collect();

    const locationMap: Record<string, { locationId: string; name: string }> = {};
    for (const loc of locations) {
      if (loc.templateId) {
        locationMap[loc.templateId] = {
          locationId: loc._id as string,
          name: loc.name,
        };
      }
    }

    // Get discovered location IDs for this campaign
    const discoveries = await ctx.db
      .query("campaignLocationDiscovery")
      .withIndex("by_campaign", (q) => q.eq("campaignId", session.campaignId))
      .collect();
    const discoveredLocationIds = discoveries.map((d) => d.locationId as string);

    return {
      cells: map.cityGridData.cells,
      gridSize: { width: map.cityGridData.width, height: map.cityGridData.height },
      backgroundImage: map.cityGridData.backgroundImage,
      cityPosition: session.cityPosition ?? { x: 7, y: 7 },
      navigationMode: session.navigationMode ?? "city",
      locationMap,
      discoveredLocationIds,
    };
  },
});

// ============ MUTATIONS ============

export const moveCityToken = mutation({
  args: {
    sessionId: v.id("gameSessions"),
    to: v.object({ x: v.number(), y: v.number() }),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session || !session.currentMapId) {
      throw new Error("No city map attached to session");
    }
    await requireCampaignMember(ctx, session.campaignId);

    const map = await ctx.db.get(session.currentMapId);
    if (!map || !map.cityGridData) {
      throw new Error("Map has no city grid data");
    }

    const from = session.cityPosition ?? { x: 7, y: 7 };

    // Validate adjacent (4-directional)
    const dx = Math.abs(args.to.x - from.x);
    const dy = Math.abs(args.to.y - from.y);
    if (!((dx === 1 && dy === 0) || (dx === 0 && dy === 1))) {
      throw new Error("Can only move to adjacent cells (4-directional)");
    }

    // Validate within bounds
    if (
      args.to.x < 0 || args.to.x >= map.cityGridData.width ||
      args.to.y < 0 || args.to.y >= map.cityGridData.height
    ) {
      throw new Error("Out of bounds");
    }

    // Validate walkable
    const targetCell = map.cityGridData.cells.find(
      (c) => c.x === args.to.x && c.y === args.to.y,
    );
    if (!targetCell || !targetCell.walkable) {
      throw new Error("Cell is not walkable");
    }

    // Update position
    await ctx.db.patch(args.sessionId, {
      cityPosition: args.to,
      lastActionAt: Date.now(),
    });

    // Auto-discover location if cell has a locationTemplateId
    if (targetCell.locationTemplateId) {
      const location = await ctx.db
        .query("locations")
        .withIndex("by_map", (q) => q.eq("mapId", map._id))
        .filter((q) => q.eq(q.field("templateId"), targetCell.locationTemplateId))
        .first();

      if (location) {
        // Idempotent discovery
        const existing = await ctx.db
          .query("campaignLocationDiscovery")
          .withIndex("by_campaign_and_location", (q) =>
            q.eq("campaignId", session.campaignId).eq("locationId", location._id),
          )
          .first();

        if (!existing) {
          await ctx.db.insert("campaignLocationDiscovery", {
            campaignId: session.campaignId,
            locationId: location._id,
            discoveredAt: Date.now(),
          });
        }
      }
    }

    // Log movement
    await ctx.db.insert("gameLog", {
      campaignId: session.campaignId,
      sessionId: args.sessionId,
      type: "movement",
      content: `Moved through the city streets.`,
      movementData: { from, to: args.to },
      createdAt: Date.now(),
    });

    return { moved: true, to: args.to };
  },
});

export const enterLocation = mutation({
  args: {
    sessionId: v.id("gameSessions"),
    characterId: v.id("characters"),
    characterName: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session || !session.currentMapId) {
      throw new Error("No city map attached to session");
    }
    await requireCampaignMember(ctx, session.campaignId);

    const map = await ctx.db.get(session.currentMapId);
    if (!map || !map.cityGridData) {
      throw new Error("Map has no city grid data");
    }

    const pos = session.cityPosition ?? { x: 7, y: 7 };
    const cell = map.cityGridData.cells.find(
      (c) => c.x === pos.x && c.y === pos.y,
    );

    if (!cell?.locationTemplateId) {
      throw new Error("No location at current city position");
    }

    // Resolve real location
    const location = await ctx.db
      .query("locations")
      .withIndex("by_map", (q) => q.eq("mapId", map._id))
      .filter((q) => q.eq(q.field("templateId"), cell.locationTemplateId))
      .first();

    if (!location) {
      throw new Error("Location not found for template: " + cell.locationTemplateId);
    }

    // Patch session: enter location mode
    const patch: Record<string, unknown> = {
      locationId: location._id,
      navigationMode: "location",
      lastActionAt: Date.now(),
    };

    // Initialize exploration position if location has grid data
    if (location.gridData) {
      patch.explorationPositions = {
        [args.characterId]: { x: 0, y: 0 },
      };
      patch.currentGridSize = {
        width: location.gridData.width,
        height: location.gridData.height,
      };
    }

    await ctx.db.patch(args.sessionId, patch);

    // Log entry
    await ctx.db.insert("gameLog", {
      campaignId: session.campaignId,
      sessionId: args.sessionId,
      type: "narration",
      content: `${args.characterName} enters ${location.name}.`,
      actorType: "dm",
      createdAt: Date.now(),
    });

    return {
      locationId: location._id,
      name: location.name,
      description: location.description,
      hasGrid: !!location.gridData,
    };
  },
});

export const exitToCity = mutation({
  args: {
    sessionId: v.id("gameSessions"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found");
    await requireCampaignMember(ctx, session.campaignId);

    await ctx.db.patch(args.sessionId, {
      locationId: undefined,
      navigationMode: "city",
      explorationPositions: undefined,
      currentGridSize: undefined,
      lastActionAt: Date.now(),
    });

    // Log
    await ctx.db.insert("gameLog", {
      campaignId: session.campaignId,
      sessionId: args.sessionId,
      type: "narration",
      content: "You step back out into the city streets.",
      actorType: "dm",
      createdAt: Date.now(),
    });

    return { exited: true };
  },
});
