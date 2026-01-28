import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { Id } from "../_generated/dataModel";

// ============ QUERIES ============

export const getLocationGraph = query({
  args: {
    campaignId: v.id("campaigns"),
  },
  handler: async (ctx, args) => {
    // Get all locations for this campaign
    const locations = await ctx.db
      .query("locations")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .collect();

    // Build the graph with connections
    const locationNodes = locations.map((loc) => ({
      id: loc._id,
      name: loc.name,
      description: loc.description,
      isDiscovered: loc.isDiscovered,
      parentLocationId: loc.parentLocationId,
      connectedTo: loc.connectedTo,
      hasGrid: !!loc.gridData,
      properties: loc.properties,
    }));

    // Build adjacency list for easy traversal
    const adjacencyMap: Record<string, string[]> = {};
    for (const loc of locations) {
      adjacencyMap[loc._id] = loc.connectedTo.map((id) => id.toString());
    }

    // Find discovered locations only
    const discoveredLocations = locationNodes.filter((loc) => loc.isDiscovered);

    return {
      allLocations: locationNodes,
      discoveredLocations,
      adjacencyMap,
      totalCount: locations.length,
      discoveredCount: discoveredLocations.length,
    };
  },
});

export const getLocationDetails = query({
  args: {
    locationId: v.id("locations"),
  },
  handler: async (ctx, args) => {
    const location = await ctx.db.get(args.locationId);
    if (!location) {
      return null;
    }

    // Get NPCs at this location
    const npcsAtLocation = await ctx.db
      .query("npcs")
      .withIndex("by_campaign", (q) => q.eq("campaignId", location.campaignId))
      .filter((q) =>
        q.and(
          q.eq(q.field("currentLocationId"), args.locationId),
          q.eq(q.field("isAlive"), true)
        )
      )
      .collect();

    // Get connected locations with basic info
    const connectedLocations = await Promise.all(
      location.connectedTo.map(async (connectedId) => {
        const connected = await ctx.db.get(connectedId);
        return connected
          ? {
              id: connected._id,
              name: connected.name,
              isDiscovered: connected.isDiscovered,
            }
          : null;
      })
    );

    // Get parent location if exists
    let parentLocation = null;
    if (location.parentLocationId) {
      const parent = await ctx.db.get(location.parentLocationId);
      if (parent) {
        parentLocation = {
          id: parent._id,
          name: parent.name,
        };
      }
    }

    // Get child locations (locations that have this as parent)
    const childLocations = await ctx.db
      .query("locations")
      .withIndex("by_campaign", (q) => q.eq("campaignId", location.campaignId))
      .filter((q) => q.eq(q.field("parentLocationId"), args.locationId))
      .collect();

    return {
      ...location,
      npcs: npcsAtLocation.map((npc) => ({
        id: npc._id,
        name: npc.name,
        portrait: npc.portrait,
        description: npc.description,
      })),
      connectedLocations: connectedLocations.filter(Boolean),
      parentLocation,
      childLocations: childLocations.map((child) => ({
        id: child._id,
        name: child.name,
        isDiscovered: child.isDiscovered,
      })),
    };
  },
});

export const getCurrentLocation = query({
  args: {
    sessionId: v.id("gameSessions"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session || !session.locationId) {
      return null;
    }

    const location = await ctx.db.get(session.locationId);
    if (!location) {
      return null;
    }

    // Get NPCs at this location
    const npcsAtLocation = await ctx.db
      .query("npcs")
      .withIndex("by_campaign", (q) => q.eq("campaignId", location.campaignId))
      .filter((q) =>
        q.and(
          q.eq(q.field("currentLocationId"), session.locationId),
          q.eq(q.field("isAlive"), true)
        )
      )
      .collect();

    return {
      ...location,
      npcs: npcsAtLocation.map((npc) => ({
        id: npc._id,
        name: npc.name,
        portrait: npc.portrait,
      })),
    };
  },
});

// ============ MUTATIONS ============

export const travelTo = mutation({
  args: {
    sessionId: v.id("gameSessions"),
    destinationId: v.id("locations"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    // Verify destination exists
    const destination = await ctx.db.get(args.destinationId);
    if (!destination) {
      throw new Error("Destination not found");
    }

    // If we have a current location, verify the destination is connected
    if (session.locationId) {
      const currentLocation = await ctx.db.get(session.locationId);
      if (currentLocation) {
        const isConnected = currentLocation.connectedTo.some(
          (id) => id.toString() === args.destinationId.toString()
        );
        if (!isConnected) {
          throw new Error("Destination is not connected to current location");
        }
      }
    }

    // Auto-discover the destination if not already discovered
    if (!destination.isDiscovered) {
      await ctx.db.patch(args.destinationId, { isDiscovered: true });
    }

    // Update session location
    await ctx.db.patch(args.sessionId, {
      locationId: args.destinationId,
      lastActionAt: Date.now(),
    });

    return {
      arrived: true,
      location: {
        id: destination._id,
        name: destination.name,
        description: destination.description,
      },
    };
  },
});

export const discoverLocation = mutation({
  args: {
    locationId: v.id("locations"),
  },
  handler: async (ctx, args) => {
    const location = await ctx.db.get(args.locationId);
    if (!location) {
      throw new Error("Location not found");
    }

    if (location.isDiscovered) {
      return { alreadyDiscovered: true };
    }

    await ctx.db.patch(args.locationId, { isDiscovered: true });

    return {
      discovered: true,
      location: {
        id: location._id,
        name: location.name,
      },
    };
  },
});

export const createLocation = mutation({
  args: {
    campaignId: v.id("campaigns"),
    name: v.string(),
    description: v.string(),
    parentLocationId: v.optional(v.id("locations")),
    connectedTo: v.optional(v.array(v.id("locations"))),
    isDiscovered: v.optional(v.boolean()),
    properties: v.optional(v.record(v.string(), v.any())),
    gridData: v.optional(
      v.object({
        width: v.number(),
        height: v.number(),
        cells: v.array(
          v.object({
            x: v.number(),
            y: v.number(),
            terrain: v.union(
              v.literal("normal"),
              v.literal("difficult"),
              v.literal("impassable")
            ),
            cover: v.optional(
              v.union(
                v.literal("half"),
                v.literal("three-quarters"),
                v.literal("full")
              )
            ),
          })
        ),
      })
    ),
  },
  handler: async (ctx, args) => {
    const locationId = await ctx.db.insert("locations", {
      campaignId: args.campaignId,
      name: args.name,
      description: args.description,
      parentLocationId: args.parentLocationId,
      connectedTo: args.connectedTo ?? [],
      isDiscovered: args.isDiscovered ?? false,
      properties: args.properties ?? {},
      gridData: args.gridData,
    });

    // If connected locations were specified, update them to connect back
    if (args.connectedTo) {
      for (const connectedId of args.connectedTo) {
        const connected = await ctx.db.get(connectedId);
        if (connected && !connected.connectedTo.includes(locationId)) {
          await ctx.db.patch(connectedId, {
            connectedTo: [...connected.connectedTo, locationId],
          });
        }
      }
    }

    return { locationId };
  },
});

export const connectLocations = mutation({
  args: {
    locationA: v.id("locations"),
    locationB: v.id("locations"),
  },
  handler: async (ctx, args) => {
    const locA = await ctx.db.get(args.locationA);
    const locB = await ctx.db.get(args.locationB);

    if (!locA || !locB) {
      throw new Error("Location not found");
    }

    // Add connection A -> B if not exists
    if (!locA.connectedTo.some((id) => id.toString() === args.locationB.toString())) {
      await ctx.db.patch(args.locationA, {
        connectedTo: [...locA.connectedTo, args.locationB],
      });
    }

    // Add connection B -> A if not exists
    if (!locB.connectedTo.some((id) => id.toString() === args.locationA.toString())) {
      await ctx.db.patch(args.locationB, {
        connectedTo: [...locB.connectedTo, args.locationA],
      });
    }

    return { connected: true };
  },
});

export const updateLocationGrid = mutation({
  args: {
    locationId: v.id("locations"),
    gridData: v.object({
      width: v.number(),
      height: v.number(),
      cells: v.array(
        v.object({
          x: v.number(),
          y: v.number(),
          terrain: v.union(
            v.literal("normal"),
            v.literal("difficult"),
            v.literal("impassable")
          ),
          cover: v.optional(
            v.union(
              v.literal("half"),
              v.literal("three-quarters"),
              v.literal("full")
            )
          ),
        })
      ),
    }),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.locationId, {
      gridData: args.gridData,
    });

    return { updated: true };
  },
});

// Seed test locations for a campaign (development helper)
export const seedTestLocations = mutation({
  args: {
    campaignId: v.id("campaigns"),
  },
  handler: async (ctx, args) => {
    // Check if locations already exist
    const existingLocations = await ctx.db
      .query("locations")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .collect();

    if (existingLocations.length > 0) {
      return { message: "Locations already exist", count: existingLocations.length };
    }

    // Create a starting dungeon location
    const dungeonCellId = await ctx.db.insert("locations", {
      campaignId: args.campaignId,
      name: "Stone Chamber",
      description: "A dimly lit stone chamber with rough-hewn walls. A single iron door stands on the far side.",
      connectedTo: [],
      isDiscovered: true,
      properties: { type: "dungeon", lighting: "dim" },
    });

    // Create a corridor
    const corridorId = await ctx.db.insert("locations", {
      campaignId: args.campaignId,
      name: "Dark Corridor",
      description: "A long, narrow corridor stretching into darkness. Torches flicker on the walls at irregular intervals.",
      connectedTo: [dungeonCellId],
      isDiscovered: false,
      properties: { type: "dungeon", lighting: "dim" },
    });

    // Create a guard room with combat grid
    const guardRoomId = await ctx.db.insert("locations", {
      campaignId: args.campaignId,
      name: "Guard Room",
      description: "A larger room with weapon racks and a table. Signs of recent activity.",
      connectedTo: [corridorId],
      isDiscovered: false,
      properties: { type: "dungeon", lighting: "normal" },
      gridData: {
        width: 6,
        height: 6,
        cells: Array.from({ length: 36 }, (_, i) => ({
          x: i % 6,
          y: Math.floor(i / 6),
          terrain: "normal" as const,
        })),
      },
    });

    // Create an exit to the surface
    const forestEdgeId = await ctx.db.insert("locations", {
      campaignId: args.campaignId,
      name: "Forest Edge",
      description: "Daylight filters through the trees. The dungeon entrance lies behind you.",
      connectedTo: [guardRoomId],
      isDiscovered: false,
      properties: { type: "outdoor", lighting: "bright" },
    });

    // Update connections bidirectionally
    await ctx.db.patch(dungeonCellId, { connectedTo: [corridorId] });
    await ctx.db.patch(corridorId, { connectedTo: [dungeonCellId, guardRoomId] });
    await ctx.db.patch(guardRoomId, { connectedTo: [corridorId, forestEdgeId] });

    return {
      message: "Test locations created",
      locations: [
        { id: dungeonCellId, name: "Stone Chamber" },
        { id: corridorId, name: "Dark Corridor" },
        { id: guardRoomId, name: "Guard Room" },
        { id: forestEdgeId, name: "Forest Edge" },
      ],
    };
  },
});
