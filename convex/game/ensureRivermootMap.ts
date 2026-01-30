import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import {
  RIVERMOOT_MAP,
  RIVERMOOT_LOCATIONS,
  RIVERMOOT_START_LOCATION,
} from "../data/rivermootCity";
import { RIVERMOOT_CITY_GRID } from "../data/rivermootGrid";
import {
  WORLD_MAP,
  WORLD_MAP_NODES,
  WORLD_START_CITY,
} from "../data/worldMap";

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

  // 4. Ensure world map exists and link city maps to it
  await ensureWorldMap(ctx, campaignId, mapId);

  return { mapId };
}

/**
 * Idempotent helper: ensures the world-level map, city nodes,
 * connections between cities, and initial discovery exist.
 */
async function ensureWorldMap(
  ctx: MutationCtx,
  campaignId: Id<"campaigns">,
  rivermootMapId: Id<"maps">,
) {
  const now = Date.now();

  // 1. Create or find the world map
  let worldMapId: Id<"maps">;
  const existingWorldMap = await ctx.db
    .query("maps")
    .withIndex("by_slug", (q) => q.eq("slug", WORLD_MAP.slug))
    .first();

  if (existingWorldMap) {
    worldMapId = existingWorldMap._id;
  } else {
    worldMapId = await ctx.db.insert("maps", {
      slug: WORLD_MAP.slug,
      name: WORLD_MAP.name,
      description: WORLD_MAP.description,
      properties: WORLD_MAP.properties,
      visibility: "visible",
      createdAt: now,
    });
  }

  // 2. Set worldMapId on campaign
  const campaign = await ctx.db.get(campaignId);
  if (campaign && !campaign.worldMapId) {
    await ctx.db.patch(campaignId, { worldMapId });
  }

  // 3. Link world map to campaign
  const existingWorldLink = await ctx.db
    .query("campaignMaps")
    .withIndex("by_campaign_and_map", (q) =>
      q.eq("campaignId", campaignId).eq("mapId", worldMapId),
    )
    .first();

  if (!existingWorldLink) {
    await ctx.db.insert("campaignMaps", {
      campaignId,
      mapId: worldMapId,
      addedAt: now,
    });
  }

  // 4. Create other city-level map nodes (not Rivermoot, it already exists)
  const slugToId = new Map<string, Id<"maps">>();
  slugToId.set("rivermoot-city", rivermootMapId);

  // Mark Rivermoot with parentMapId and visibility if not set
  const rivermootMap = await ctx.db.get(rivermootMapId);
  if (rivermootMap && !rivermootMap.parentMapId) {
    await ctx.db.patch(rivermootMapId, {
      parentMapId: worldMapId,
      visibility: "visible",
    });
  }

  for (const node of WORLD_MAP_NODES) {
    if (node.slug === "rivermoot-city") continue; // Already exists

    const existingNode = await ctx.db
      .query("maps")
      .withIndex("by_slug", (q) => q.eq("slug", node.slug))
      .first();

    let nodeId: Id<"maps">;
    if (existingNode) {
      nodeId = existingNode._id;
    } else {
      nodeId = await ctx.db.insert("maps", {
        slug: node.slug,
        name: node.name,
        description: node.description,
        properties: node.properties,
        parentMapId: worldMapId,
        visibility: node.visibility,
        createdAt: now,
      });
    }
    slugToId.set(node.slug, nodeId);

    // Link to campaign
    const existingLink = await ctx.db
      .query("campaignMaps")
      .withIndex("by_campaign_and_map", (q) =>
        q.eq("campaignId", campaignId).eq("mapId", nodeId),
      )
      .first();

    if (!existingLink) {
      await ctx.db.insert("campaignMaps", {
        campaignId,
        mapId: nodeId,
        addedAt: now,
      });
    }
  }

  // 5. Wire bidirectional connections between city maps
  for (const node of WORLD_MAP_NODES) {
    const nodeId = slugToId.get(node.slug);
    if (!nodeId) continue;

    const connectedIds = node.connections
      .map((slug) => slugToId.get(slug))
      .filter((id): id is Id<"maps"> => id !== undefined);

    const existingMap = await ctx.db.get(nodeId);
    if (existingMap && !existingMap.connectedMaps?.length) {
      await ctx.db.patch(nodeId, { connectedMaps: connectedIds });
    }
  }

  // 6. Discover the starting city
  const startCityId = slugToId.get(WORLD_START_CITY);
  if (startCityId) {
    const existingDiscovery = await ctx.db
      .query("campaignMapDiscovery")
      .withIndex("by_campaign_and_map", (q) =>
        q.eq("campaignId", campaignId).eq("mapId", startCityId),
      )
      .first();

    if (!existingDiscovery) {
      await ctx.db.insert("campaignMapDiscovery", {
        campaignId,
        mapId: startCityId,
        discoveredAt: now,
      });
    }
  }
}
