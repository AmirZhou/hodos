import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import {
  RIVERMOOT_MAP,
  RIVERMOOT_LOCATIONS,
  RIVERMOOT_START_LOCATION,
} from "../data/rivermootCity";
import { RIVERMOOT_CITY_GRID } from "../data/rivermootGrid";

/**
 * Idempotent helper: ensures the Rivermoot city map, its locations,
 * campaign link, and starting-location discovery all exist.
 * Returns `{ mapId }` so callers can use it for session creation.
 */
export async function ensureRivermootMap(
  ctx: MutationCtx,
  campaignId: Id<"campaigns">,
): Promise<{ mapId: Id<"maps"> }> {
  const now = Date.now();

  // 1. Idempotent map creation — reuse existing map if it exists
  let mapId: Id<"maps">;
  const existingMap = await ctx.db
    .query("maps")
    .withIndex("by_slug", (q) => q.eq("slug", RIVERMOOT_MAP.slug))
    .first();

  if (existingMap) {
    mapId = existingMap._id;
    // Keep cityGridData in sync with source (e.g. backgroundImage path)
    await ctx.db.patch(mapId, { cityGridData: RIVERMOOT_CITY_GRID });
  } else {
    mapId = await ctx.db.insert("maps", {
      slug: RIVERMOOT_MAP.slug,
      name: RIVERMOOT_MAP.name,
      description: RIVERMOOT_MAP.description,
      properties: RIVERMOOT_MAP.properties,
      cityGridData: RIVERMOOT_CITY_GRID,
      createdAt: now,
    });

    // Pass 1: Insert all locations (without connections)
    const templateToId = new Map<string, Id<"locations">>();

    for (const loc of RIVERMOOT_LOCATIONS) {
      const locationId = await ctx.db.insert("locations", {
        mapId,
        templateId: loc.templateId,
        name: loc.name,
        description: loc.description,
        properties: loc.properties,
        connectedTo: [],
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

      if (loc.parentTemplateId) {
        const parentId = templateToId.get(loc.parentTemplateId);
        if (parentId) {
          await ctx.db.patch(locationId, { parentLocationId: parentId });
        }
      }
    }
  }

  // 2. Attach map to campaign (idempotent — check for existing link)
  const existingLink = await ctx.db
    .query("campaignMaps")
    .withIndex("by_campaign_and_map", (q) =>
      q.eq("campaignId", campaignId).eq("mapId", mapId)
    )
    .first();

  if (!existingLink) {
    await ctx.db.insert("campaignMaps", {
      campaignId,
      mapId,
      addedAt: now,
    });
  }

  // 3. Discover the starting location (The Crossroads)
  const startLocation = await ctx.db
    .query("locations")
    .withIndex("by_map", (q) => q.eq("mapId", mapId))
    .filter((q) => q.eq(q.field("templateId"), RIVERMOOT_START_LOCATION))
    .first();

  if (startLocation) {
    const existingDiscovery = await ctx.db
      .query("campaignLocationDiscovery")
      .withIndex("by_campaign_and_location", (q) =>
        q.eq("campaignId", campaignId).eq("locationId", startLocation._id)
      )
      .first();

    if (!existingDiscovery) {
      await ctx.db.insert("campaignLocationDiscovery", {
        campaignId,
        locationId: startLocation._id,
        discoveredAt: now,
      });
    }
  }

  return { mapId };
}
