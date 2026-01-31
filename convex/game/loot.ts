import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { getItemById } from "../data/equipmentItems";

// ============ QUERIES ============

/**
 * Get all loot containers at the current session's location.
 * Ground containers expose items immediately; others only if opened.
 */
export const getContainersAtLocation = query({
  args: { sessionId: v.id("gameSessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session || !session.locationId) return [];

    const campaignId = session.campaignId;
    const locationId = session.locationId;

    const containers = await ctx.db
      .query("lootContainers")
      .withIndex("by_campaign_and_location", (q) =>
        q.eq("campaignId", campaignId).eq("locationId", locationId)
      )
      .collect();

    return containers.map((c) => ({
      _id: c._id,
      containerType: c.containerType,
      name: c.name,
      description: c.description,
      items: c.containerType === "ground" || c.isOpened ? c.items : [],
      itemCount: c.items.length,
      lock: c.lock,
      isOpened: c.isOpened,
      isLooted: c.isLooted,
    }));
  },
});

/**
 * Compact container summary for DM context injection.
 */
export const getContainersForDMContext = query({
  args: {
    campaignId: v.id("campaigns"),
    locationId: v.id("locations"),
  },
  handler: async (ctx, args) => {
    const containers = await ctx.db
      .query("lootContainers")
      .withIndex("by_campaign_and_location", (q) =>
        q.eq("campaignId", args.campaignId).eq("locationId", args.locationId)
      )
      .collect();

    return containers.map((c) => ({
      name: c.name,
      containerType: c.containerType,
      isLocked: c.lock?.isLocked ?? false,
      isOpened: c.isOpened,
      isLooted: c.isLooted,
      itemCount: c.items.length,
    }));
  },
});

// ============ MUTATIONS ============

/**
 * Open a container. Fails if locked.
 */
export const openContainer = mutation({
  args: { containerId: v.id("lootContainers") },
  handler: async (ctx, args) => {
    const container = await ctx.db.get(args.containerId);
    if (!container) throw new Error("Container not found");

    if (container.lock?.isLocked) {
      throw new Error("Container is locked");
    }

    await ctx.db.patch(args.containerId, { isOpened: true });
  },
});

/**
 * Unlock a container via key or skill check.
 * For "skillCheck", the caller is trusted (DM/roll system handles DC externally).
 */
export const unlockContainer = mutation({
  args: {
    containerId: v.id("lootContainers"),
    characterId: v.id("characters"),
    method: v.union(v.literal("key"), v.literal("skillCheck")),
  },
  handler: async (ctx, args) => {
    const container = await ctx.db.get(args.containerId);
    if (!container) throw new Error("Container not found");
    if (!container.lock?.isLocked) return; // already unlocked

    if (args.method === "key") {
      if (!container.lock.keyItemId) {
        throw new Error("This lock cannot be opened with a key");
      }
      // Check character inventory for the key item
      const character = await ctx.db.get(args.characterId);
      if (!character) throw new Error("Character not found");

      const hasKey = character.inventory.some(
        (item) => item.id === container.lock!.keyItemId
      );
      if (!hasKey) {
        throw new Error("You don't have the required key");
      }
    }
    // For "skillCheck", trust the caller

    await ctx.db.patch(args.containerId, {
      lock: { ...container.lock, isLocked: false },
    });
  },
});

/**
 * Take a single item from a container by index.
 */
export const takeItem = mutation({
  args: {
    containerId: v.id("lootContainers"),
    characterId: v.id("characters"),
    itemIndex: v.number(),
  },
  handler: async (ctx, args) => {
    const container = await ctx.db.get(args.containerId);
    if (!container) throw new Error("Container not found");

    if (container.containerType !== "ground" && !container.isOpened) {
      throw new Error("Container is not open");
    }

    if (args.itemIndex < 0 || args.itemIndex >= container.items.length) {
      throw new Error("Invalid item index");
    }

    const character = await ctx.db.get(args.characterId);
    if (!character) throw new Error("Character not found");

    const item = container.items[args.itemIndex];
    const newItems = [...container.items];
    newItems.splice(args.itemIndex, 1);

    const isEmpty = newItems.length === 0;

    // Add item to character inventory
    await ctx.db.patch(args.characterId, {
      inventory: [...character.inventory, item] as typeof character.inventory,
    });

    // Remove item from container
    await ctx.db.patch(args.containerId, {
      items: newItems,
      isLooted: isEmpty,
    });

    return { itemName: item.name, isEmpty };
  },
});

/**
 * Take all items from a container.
 */
export const takeAllItems = mutation({
  args: {
    containerId: v.id("lootContainers"),
    characterId: v.id("characters"),
  },
  handler: async (ctx, args) => {
    const container = await ctx.db.get(args.containerId);
    if (!container) throw new Error("Container not found");

    if (container.containerType !== "ground" && !container.isOpened) {
      throw new Error("Container is not open");
    }

    if (container.items.length === 0) return { itemNames: [] };

    const character = await ctx.db.get(args.characterId);
    if (!character) throw new Error("Character not found");

    const itemNames = container.items.map((i) => i.name);

    // Move all items to character inventory
    await ctx.db.patch(args.characterId, {
      inventory: [...character.inventory, ...container.items] as typeof character.inventory,
    });

    // Clear container
    await ctx.db.patch(args.containerId, {
      items: [],
      isLooted: true,
    });

    return { itemNames };
  },
});

/**
 * Seed a new loot container. For admin/test/DM use.
 * Converts item IDs to full item documents via getItemById().
 */
export const seedContainer = mutation({
  args: {
    campaignId: v.id("campaigns"),
    locationId: v.id("locations"),
    containerType: v.union(
      v.literal("ground"),
      v.literal("chest"),
      v.literal("corpse"),
      v.literal("container")
    ),
    name: v.string(),
    description: v.optional(v.string()),
    itemIds: v.array(v.string()),
    lock: v.optional(
      v.object({
        isLocked: v.boolean(),
        dc: v.optional(v.number()),
        keyItemId: v.optional(v.string()),
      })
    ),
    sourceType: v.optional(v.string()),
    sourceEntityId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const items = [];
    for (const itemId of args.itemIds) {
      const itemData = getItemById(itemId);
      if (!itemData) {
        console.warn(`[seedContainer] Unknown item ID: ${itemId}`);
        continue;
      }
      items.push({
        id: itemData.id,
        name: itemData.name,
        description: itemData.description,
        type: itemData.type,
        rarity: itemData.rarity,
        stats: itemData.stats,
        specialAttributes: itemData.specialAttributes,
        passive: itemData.passive,
      });
    }

    const containerId = await ctx.db.insert("lootContainers", {
      campaignId: args.campaignId,
      locationId: args.locationId,
      containerType: args.containerType,
      name: args.name,
      description: args.description,
      items,
      lock: args.lock,
      isOpened: args.containerType === "ground", // ground items are always "open"
      isLooted: false,
      sourceType: args.sourceType,
      sourceEntityId: args.sourceEntityId,
      createdAt: Date.now(),
    });

    return containerId;
  },
});
