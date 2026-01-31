import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { createItemInstance, logItemEvent } from "../equipment";
import { getBindingRule } from "../data/equipmentItems";
import { requireCampaignMember, requireCharacterOwner } from "../lib/auth";

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

    // For each container, fetch its items from the items table
    const results = [];
    for (const c of containers) {
      const containerItems = await ctx.db
        .query("items")
        .withIndex("by_container", (q) => q.eq("containerId", c._id))
        .collect();

      const shouldShowItems = c.containerType === "ground" || c.isOpened;

      results.push({
        _id: c._id,
        containerType: c.containerType,
        name: c.name,
        description: c.description,
        items: shouldShowItems
          ? containerItems.map((item) => ({
              _id: item._id,
              templateId: item.templateId,
              name: item.name,
              description: item.description,
              type: item.type,
              rarity: item.rarity,
              stats: item.stats,
              specialAttributes: item.specialAttributes,
              passive: item.passive,
              bindingRule: item.bindingRule,
              boundTo: item.boundTo,
            }))
          : [],
        itemCount: containerItems.length,
        lock: c.lock,
        isOpened: c.isOpened,
        isLooted: c.isLooted,
      });
    }

    return results;
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

    const results = [];
    for (const c of containers) {
      const itemCount = (
        await ctx.db
          .query("items")
          .withIndex("by_container", (q) => q.eq("containerId", c._id))
          .collect()
      ).length;

      results.push({
        name: c.name,
        containerType: c.containerType,
        isLocked: c.lock?.isLocked ?? false,
        isOpened: c.isOpened,
        isLooted: c.isLooted,
        itemCount,
      });
    }

    return results;
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
    await requireCampaignMember(ctx, container.campaignId);

    if (container.lock?.isLocked) {
      throw new Error("Container is locked");
    }

    await ctx.db.patch(args.containerId, { isOpened: true });
  },
});

/**
 * Unlock a container via key or skill check.
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
    await requireCharacterOwner(ctx, args.characterId);
    await requireCampaignMember(ctx, container.campaignId);
    if (!container.lock?.isLocked) return;

    if (args.method === "key") {
      if (!container.lock.keyItemId) {
        throw new Error("This lock cannot be opened with a key");
      }
      // Check character's items for the key
      const keyItem = await ctx.db
        .query("items")
        .withIndex("by_owner", (q) => q.eq("ownerId", args.characterId))
        .filter((q) =>
          q.and(
            q.eq(q.field("status"), "inventory"),
            q.eq(q.field("templateId"), container.lock!.keyItemId!)
          )
        )
        .first();

      if (!keyItem) {
        throw new Error("You don't have the required key");
      }
    }

    await ctx.db.patch(args.containerId, {
      lock: { ...container.lock, isLocked: false },
    });
  },
});

/**
 * Take a single item from a container by item ID.
 */
export const takeItem = mutation({
  args: {
    containerId: v.id("lootContainers"),
    characterId: v.id("characters"),
    itemId: v.id("items"),
  },
  handler: async (ctx, args) => {
    const container = await ctx.db.get(args.containerId);
    if (!container) throw new Error("Container not found");

    if (container.containerType !== "ground" && !container.isOpened) {
      throw new Error("Container is not open");
    }

    const character = await ctx.db.get(args.characterId);
    if (!character) throw new Error("Character not found");

    const item = await ctx.db.get(args.itemId);
    if (!item) throw new Error("Item not found");
    if (item.containerId !== args.containerId) {
      throw new Error("Item is not in this container");
    }

    // Move item to character inventory
    const isBop = item.bindingRule === "bop";
    await ctx.db.patch(args.itemId, {
      status: "inventory",
      ownerId: args.characterId,
      containerId: undefined,
      ...(isBop ? { boundTo: args.characterId } : {}),
    });

    await logItemEvent(ctx, {
      itemId: args.itemId,
      campaignId: container.campaignId,
      event: "looted",
      actorId: args.characterId,
      metadata: `Looted from ${container.name}`,
    });

    if (isBop) {
      await logItemEvent(ctx, {
        itemId: args.itemId,
        campaignId: container.campaignId,
        event: "bound",
        actorId: args.characterId,
        metadata: "Bind on Pickup",
      });
    }

    // Check if container is now empty
    const remaining = await ctx.db
      .query("items")
      .withIndex("by_container", (q) => q.eq("containerId", args.containerId))
      .first();

    if (!remaining) {
      await ctx.db.patch(args.containerId, { isLooted: true });
    }

    return { itemName: item.name, isEmpty: !remaining };
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

    const character = await ctx.db.get(args.characterId);
    if (!character) throw new Error("Character not found");

    const items = await ctx.db
      .query("items")
      .withIndex("by_container", (q) => q.eq("containerId", args.containerId))
      .collect();

    if (items.length === 0) return { itemNames: [] };

    const itemNames: string[] = [];
    for (const item of items) {
      const isBop = item.bindingRule === "bop";
      await ctx.db.patch(item._id, {
        status: "inventory",
        ownerId: args.characterId,
        containerId: undefined,
        ...(isBop ? { boundTo: args.characterId } : {}),
      });

      await logItemEvent(ctx, {
        itemId: item._id,
        campaignId: container.campaignId,
        event: "looted",
        actorId: args.characterId,
        metadata: `Looted from ${container.name}`,
      });

      if (isBop) {
        await logItemEvent(ctx, {
          itemId: item._id,
          campaignId: container.campaignId,
          event: "bound",
          actorId: args.characterId,
          metadata: "Bind on Pickup",
        });
      }

      itemNames.push(item.name);
    }

    await ctx.db.patch(args.containerId, { isLooted: true });

    return { itemNames };
  },
});

/**
 * Seed a new loot container with items. For admin/test/DM use.
 * Creates item instances in the items table linked to the container.
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
    // Create the container first
    const containerId = await ctx.db.insert("lootContainers", {
      campaignId: args.campaignId,
      locationId: args.locationId,
      containerType: args.containerType,
      name: args.name,
      description: args.description,
      lock: args.lock,
      isOpened: args.containerType === "ground",
      isLooted: false,
      sourceType: args.sourceType,
      sourceEntityId: args.sourceEntityId,
      createdAt: Date.now(),
    });

    // Create item instances linked to the container
    for (const templateId of args.itemIds) {
      try {
        const itemId = await createItemInstance(ctx, {
          templateId,
          campaignId: args.campaignId,
          status: "container",
          containerId,
        });

        await logItemEvent(ctx, {
          itemId,
          campaignId: args.campaignId,
          event: "created",
          metadata: `Seeded in ${args.name}`,
        });
      } catch (e) {
        console.warn(`[seedContainer] Failed to create item: ${templateId}`, e);
      }
    }

    return containerId;
  },
});
