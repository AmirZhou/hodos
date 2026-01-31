import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import type { QueryCtx, MutationCtx } from "../_generated/server";
import { requireAuth, requireCampaignMember } from "../lib/auth";

// ============ HELPERS ============

/** Get all locations across all maps linked to a campaign. */
async function getLocationsForCampaign(ctx: QueryCtx, campaignId: Id<"campaigns">) {
  const campaignMaps = await ctx.db
    .query("campaignMaps")
    .withIndex("by_campaign", (q) => q.eq("campaignId", campaignId))
    .collect();

  const allLocations = [];
  for (const cm of campaignMaps) {
    const locs = await ctx.db
      .query("locations")
      .withIndex("by_map", (q) => q.eq("mapId", cm.mapId))
      .collect();
    allLocations.push(...locs);
  }
  return allLocations;
}

/** Build a set of discovered location IDs for a campaign. */
async function getDiscoveredSet(ctx: QueryCtx, campaignId: Id<"campaigns">) {
  const discoveries = await ctx.db
    .query("campaignLocationDiscovery")
    .withIndex("by_campaign", (q) => q.eq("campaignId", campaignId))
    .collect();
  return new Set(discoveries.map((d) => d.locationId as string));
}

/** Check if a specific location is discovered for a campaign. */
async function isLocationDiscovered(
  ctx: QueryCtx,
  campaignId: Id<"campaigns">,
  locationId: Id<"locations">
) {
  const discovery = await ctx.db
    .query("campaignLocationDiscovery")
    .withIndex("by_campaign_and_location", (q) =>
      q.eq("campaignId", campaignId).eq("locationId", locationId)
    )
    .first();
  return !!discovery;
}

/** Ensure a location is discovered for a campaign (idempotent). */
async function ensureDiscovered(
  ctx: MutationCtx,
  campaignId: Id<"campaigns">,
  locationId: Id<"locations">
) {
  const existing = await ctx.db
    .query("campaignLocationDiscovery")
    .withIndex("by_campaign_and_location", (q) =>
      q.eq("campaignId", campaignId).eq("locationId", locationId)
    )
    .first();

  if (!existing) {
    await ctx.db.insert("campaignLocationDiscovery", {
      campaignId,
      locationId,
      discoveredAt: Date.now(),
    });
  }
}

// ============ QUERIES ============

export const getLocationGraph = query({
  args: {
    campaignId: v.id("campaigns"),
  },
  handler: async (ctx, args) => {
    const locations = await getLocationsForCampaign(ctx, args.campaignId);
    const discoveredSet = await getDiscoveredSet(ctx, args.campaignId);

    // Build the graph with connections
    const locationNodes = locations.map((loc) => ({
      id: loc._id,
      name: loc.name,
      description: loc.description,
      isDiscovered: discoveredSet.has(loc._id as string),
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
    campaignId: v.id("campaigns"),
  },
  handler: async (ctx, args) => {
    const location = await ctx.db.get(args.locationId);
    if (!location) {
      return null;
    }

    const discoveredSet = await getDiscoveredSet(ctx, args.campaignId);

    // Get NPCs at this location (NPCs are per-campaign)
    const npcsAtLocation = await ctx.db
      .query("npcs")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
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
              isDiscovered: discoveredSet.has(connected._id as string),
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

    // Get child locations (locations on the same map that have this as parent)
    const childLocations = await ctx.db
      .query("locations")
      .withIndex("by_map", (q) => q.eq("mapId", location.mapId))
      .filter((q) => q.eq(q.field("parentLocationId"), args.locationId))
      .collect();

    return {
      ...location,
      isDiscovered: discoveredSet.has(location._id as string),
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
        isDiscovered: discoveredSet.has(child._id as string),
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

    // Get NPCs at this location (NPCs are per-campaign)
    const npcsAtLocation = await ctx.db
      .query("npcs")
      .withIndex("by_campaign", (q) => q.eq("campaignId", session.campaignId))
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
    await requireCampaignMember(ctx, session.campaignId);

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

    // Auto-discover the destination for this campaign
    await ensureDiscovered(ctx, session.campaignId, args.destinationId);

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
    campaignId: v.id("campaigns"),
    locationId: v.id("locations"),
  },
  handler: async (ctx, args) => {
    await requireCampaignMember(ctx, args.campaignId);

    const location = await ctx.db.get(args.locationId);
    if (!location) {
      throw new Error("Location not found");
    }

    const alreadyDiscovered = await isLocationDiscovered(
      ctx,
      args.campaignId,
      args.locationId
    );

    if (alreadyDiscovered) {
      return { alreadyDiscovered: true };
    }

    await ctx.db.insert("campaignLocationDiscovery", {
      campaignId: args.campaignId,
      locationId: args.locationId,
      discoveredAt: Date.now(),
    });

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
    mapId: v.id("maps"),
    name: v.string(),
    description: v.string(),
    parentLocationId: v.optional(v.id("locations")),
    connectedTo: v.optional(v.array(v.id("locations"))),
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
    await requireAuth(ctx);

    const locationId = await ctx.db.insert("locations", {
      mapId: args.mapId,
      name: args.name,
      description: args.description,
      parentLocationId: args.parentLocationId,
      connectedTo: args.connectedTo ?? [],
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
// Creates a micro-map with 4 connected dungeon locations
export const seedTestLocations = mutation({
  args: {
    campaignId: v.id("campaigns"),
  },
  handler: async (ctx, args) => {
    // Check if campaign already has maps linked
    const existingMaps = await ctx.db
      .query("campaignMaps")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .collect();

    if (existingMaps.length > 0) {
      // Count locations across linked maps
      let count = 0;
      for (const cm of existingMaps) {
        const locs = await ctx.db
          .query("locations")
          .withIndex("by_map", (q) => q.eq("mapId", cm.mapId))
          .collect();
        count += locs.length;
      }
      return { message: "Maps already linked", count };
    }

    // Create a micro-map for this test
    const mapId = await ctx.db.insert("maps", {
      slug: `test-dungeon-${args.campaignId}`,
      name: "Test Dungeon",
      description: "A small test dungeon for development.",
      properties: { type: "dungeon" },
      createdAt: Date.now(),
    });

    // Link map to campaign
    await ctx.db.insert("campaignMaps", {
      campaignId: args.campaignId,
      mapId,
      addedAt: Date.now(),
    });

    // Create locations on the map
    const dungeonCellId = await ctx.db.insert("locations", {
      mapId,
      name: "Stone Chamber",
      description: "A dimly lit stone chamber with rough-hewn walls. A single iron door stands on the far side.",
      connectedTo: [],
      properties: { type: "dungeon", lighting: "dim" },
    });

    const corridorId = await ctx.db.insert("locations", {
      mapId,
      name: "Dark Corridor",
      description: "A long, narrow corridor stretching into darkness. Torches flicker on the walls at irregular intervals.",
      connectedTo: [dungeonCellId],
      properties: { type: "dungeon", lighting: "dim" },
    });

    const guardRoomId = await ctx.db.insert("locations", {
      mapId,
      name: "Guard Room",
      description: "A larger room with weapon racks and a table. Signs of recent activity.",
      connectedTo: [corridorId],
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

    const forestEdgeId = await ctx.db.insert("locations", {
      mapId,
      name: "Forest Edge",
      description: "Daylight filters through the trees. The dungeon entrance lies behind you.",
      connectedTo: [guardRoomId],
      properties: { type: "outdoor", lighting: "bright" },
    });

    // Update connections bidirectionally
    await ctx.db.patch(dungeonCellId, { connectedTo: [corridorId] });
    await ctx.db.patch(corridorId, { connectedTo: [dungeonCellId, guardRoomId] });
    await ctx.db.patch(guardRoomId, { connectedTo: [corridorId, forestEdgeId] });

    // Auto-discover starting location
    await ctx.db.insert("campaignLocationDiscovery", {
      campaignId: args.campaignId,
      locationId: dungeonCellId,
      discoveredAt: Date.now(),
    });

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
