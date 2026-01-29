import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import {
  RIVERMOOT_MAP,
  RIVERMOOT_LOCATIONS,
  RIVERMOOT_START_LOCATION,
} from "../data/rivermootCity";

/**
 * Idempotent: creates the Rivermoot city map and its 17 locations.
 * If a map with slug "rivermoot-city" already exists, returns early.
 */
export const seedRivermootCity = mutation({
  args: {},
  handler: async (ctx) => {
    // Idempotency check
    const existing = await ctx.db
      .query("maps")
      .withIndex("by_slug", (q) => q.eq("slug", RIVERMOOT_MAP.slug))
      .first();

    if (existing) {
      return { mapId: existing._id, alreadyExists: true };
    }

    // Create the map
    const mapId = await ctx.db.insert("maps", {
      slug: RIVERMOOT_MAP.slug,
      name: RIVERMOOT_MAP.name,
      description: RIVERMOOT_MAP.description,
      properties: RIVERMOOT_MAP.properties,
      createdAt: Date.now(),
    });

    // Pass 1: Insert all locations (without connections — we need IDs first)
    const templateToId = new Map<string, Id<"locations">>();

    for (const loc of RIVERMOOT_LOCATIONS) {
      const locationId = await ctx.db.insert("locations", {
        mapId,
        templateId: loc.templateId,
        name: loc.name,
        description: loc.description,
        properties: loc.properties,
        connectedTo: [], // filled in pass 2
        parentLocationId: undefined,
      });
      templateToId.set(loc.templateId, locationId);
    }

    // Pass 2: Wire bidirectional connections
    for (const loc of RIVERMOOT_LOCATIONS) {
      const locationId = templateToId.get(loc.templateId)!;
      const connectedTo = loc.connections
        .map((tpl) => templateToId.get(tpl))
        .filter((id): id is Id<"locations"> => id !== undefined);

      await ctx.db.patch(locationId, { connectedTo });

      // Set parent if specified
      if (loc.parentTemplateId) {
        const parentId = templateToId.get(loc.parentTemplateId);
        if (parentId) {
          await ctx.db.patch(locationId, { parentLocationId: parentId });
        }
      }
    }

    return { mapId, alreadyExists: false, locationCount: RIVERMOOT_LOCATIONS.length };
  },
});

/**
 * Links a map to a campaign (many-to-many).
 * Auto-discovers the starting location (The Crossroads) for the campaign.
 */
export const attachMapToCampaign = mutation({
  args: {
    campaignId: v.id("campaigns"),
    mapId: v.id("maps"),
  },
  handler: async (ctx, args) => {
    // Check if already linked
    const existing = await ctx.db
      .query("campaignMaps")
      .withIndex("by_campaign_and_map", (q) =>
        q.eq("campaignId", args.campaignId).eq("mapId", args.mapId)
      )
      .first();

    if (existing) {
      return { campaignMapId: existing._id, alreadyAttached: true };
    }

    // Create junction record
    const campaignMapId = await ctx.db.insert("campaignMaps", {
      campaignId: args.campaignId,
      mapId: args.mapId,
      addedAt: Date.now(),
    });

    // Auto-discover the starting location (The Crossroads)
    const startLocation = await ctx.db
      .query("locations")
      .withIndex("by_map", (q) => q.eq("mapId", args.mapId))
      .filter((q) => q.eq(q.field("templateId"), RIVERMOOT_START_LOCATION))
      .first();

    if (startLocation) {
      await ctx.db.insert("campaignLocationDiscovery", {
        campaignId: args.campaignId,
        locationId: startLocation._id,
        discoveredAt: Date.now(),
      });
    }

    return { campaignMapId, alreadyAttached: false };
  },
});
