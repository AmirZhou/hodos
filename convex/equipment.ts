import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { requireCharacterOwner } from "./lib/auth";
import { Id, Doc } from "./_generated/dataModel";
import { getItemById, getBindingRule } from "./data/equipmentItems";
import type { EquipmentItem, EquipedSlot, BindingRule } from "./data/equipmentItems";

// ============ HELPERS ============

/** Create a new item instance in the items table. Returns the item doc ID. */
export async function createItemInstance(
  ctx: MutationCtx,
  opts: {
    templateId: string;
    campaignId: Id<"campaigns">;
    status: "inventory" | "equipped" | "container" | "ground";
    ownerId?: Id<"characters">;
    equippedSlot?: string;
    containerId?: Id<"lootContainers">;
    locationId?: Id<"locations">;
    bindingRuleOverride?: BindingRule;
    boundTo?: Id<"characters">;
  }
): Promise<Id<"items">> {
  const template = getItemById(opts.templateId);
  if (!template) throw new Error("Unknown item: " + opts.templateId);

  const bindingRule = opts.bindingRuleOverride ?? getBindingRule(template);

  const itemId = await ctx.db.insert("items", {
    templateId: opts.templateId,
    instanceId: crypto.randomUUID(),
    status: opts.status,
    ownerId: opts.ownerId,
    equippedSlot: opts.equippedSlot,
    containerId: opts.containerId,
    locationId: opts.locationId,
    campaignId: opts.campaignId,
    bindingRule,
    boundTo: opts.boundTo,
    name: template.name,
    description: template.description,
    type: template.type,
    rarity: template.rarity,
    stats: template.stats,
    specialAttributes: template.specialAttributes,
    passive: template.passive,
    createdAt: Date.now(),
  });

  return itemId;
}

/** Log an event to the itemHistory table. */
export async function logItemEvent(
  ctx: MutationCtx,
  opts: {
    itemId: Id<"items">;
    campaignId: Id<"campaigns">;
    event: "created" | "looted" | "equipped" | "unequipped" | "traded" | "bound" | "destroyed" | "listed" | "delisted";
    actorId?: Id<"characters">;
    targetId?: Id<"characters">;
    metadata?: string;
  }
) {
  await ctx.db.insert("itemHistory", {
    itemId: opts.itemId,
    campaignId: opts.campaignId,
    event: opts.event,
    actorId: opts.actorId,
    targetId: opts.targetId,
    metadata: opts.metadata,
    createdAt: Date.now(),
  });
}

/** Returns true if the item is soulbound to a character. */
export function isItemBound(item: { boundTo?: Id<"characters"> }): boolean {
  return item.boundTo !== undefined;
}

/** Throws if the item is soulbound. Use as a guard before trade mutations. */
export function assertNotBound(item: { boundTo?: Id<"characters">; name: string }): void {
  if (item.boundTo !== undefined) {
    throw new Error(`Cannot trade ${item.name} — it is soulbound`);
  }
}

function getSlotForItem(itemType: string, equippedItems: Doc<"items">[]): EquipedSlot | null {
  if (itemType === "ring") {
    const occupiedSlots = new Set(equippedItems.map((i) => i.equippedSlot));
    if (!occupiedSlots.has("ring1")) return "ring1";
    if (!occupiedSlots.has("ring2")) return "ring2";
    return "ring1";
  }
  const slotMap: Record<string, EquipedSlot> = {
    head: "head", chest: "chest", hands: "hands", boots: "boots",
    cloak: "cloak", necklace: "necklace", mainHand: "mainHand",
    offHand: "offHand", book: "book",
    collar: "collar", restraints: "restraints", toy: "toy",
  };
  return slotMap[itemType] || null;
}

// ============ MUTATIONS ============

export const equipItem = mutation({
  args: {
    characterId: v.id("characters"),
    itemId: v.id("items"),
    targetSlot: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireCharacterOwner(ctx, args.characterId);

    const character = await ctx.db.get(args.characterId);
    if (!character) throw new Error("Character not found");

    const item = await ctx.db.get(args.itemId);
    if (!item) throw new Error("Item not found");
    if (item.ownerId !== args.characterId || item.status !== "inventory") {
      throw new Error("Item not in your inventory");
    }

    // Determine target slot
    const equippedItems = await ctx.db
      .query("items")
      .withIndex("by_owner", (q) => q.eq("ownerId", args.characterId))
      .filter((q) => q.eq(q.field("status"), "equipped"))
      .collect();

    const slot = (args.targetSlot as EquipedSlot) || getSlotForItem(item.type, equippedItems);
    if (!slot) throw new Error("No valid slot for item type: " + item.type);

    // Unequip existing item in that slot
    const existingItem = equippedItems.find((i) => i.equippedSlot === slot);
    if (existingItem) {
      await ctx.db.patch(existingItem._id, {
        status: "inventory",
        equippedSlot: undefined,
      });
      await logItemEvent(ctx, {
        itemId: existingItem._id,
        campaignId: character.campaignId,
        event: "unequipped",
        actorId: args.characterId,
        metadata: `Swapped out from ${slot}`,
      });
    }

    // Equip the new item
    const patchData: Record<string, unknown> = {
      status: "equipped",
      equippedSlot: slot,
    };

    // BOE binding: bind on first equip
    if (item.bindingRule === "boe" && !item.boundTo) {
      patchData.boundTo = args.characterId;
    }

    await ctx.db.patch(args.itemId, patchData);

    await logItemEvent(ctx, {
      itemId: args.itemId,
      campaignId: character.campaignId,
      event: "equipped",
      actorId: args.characterId,
      metadata: `Equipped to ${slot}`,
    });

    // Log binding if it happened
    if (item.bindingRule === "boe" && !item.boundTo) {
      await logItemEvent(ctx, {
        itemId: args.itemId,
        campaignId: character.campaignId,
        event: "bound",
        actorId: args.characterId,
        metadata: "Bind on Equip",
      });
    }
  },
});

export const unequipItem = mutation({
  args: {
    characterId: v.id("characters"),
    slot: v.string(),
  },
  handler: async (ctx, args) => {
    await requireCharacterOwner(ctx, args.characterId);

    const character = await ctx.db.get(args.characterId);
    if (!character) throw new Error("Character not found");

    const equippedItems = await ctx.db
      .query("items")
      .withIndex("by_owner", (q) => q.eq("ownerId", args.characterId))
      .filter((q) => q.eq(q.field("status"), "equipped"))
      .collect();

    const item = equippedItems.find((i) => i.equippedSlot === args.slot);
    if (!item) throw new Error("No item in slot: " + args.slot);

    await ctx.db.patch(item._id, {
      status: "inventory",
      equippedSlot: undefined,
    });

    await logItemEvent(ctx, {
      itemId: item._id,
      campaignId: character.campaignId,
      event: "unequipped",
      actorId: args.characterId,
      metadata: `Unequipped from ${args.slot}`,
    });
  },
});

export const addItemToInventory = mutation({
  args: {
    characterId: v.id("characters"),
    itemId: v.string(), // template ID
  },
  handler: async (ctx, args) => {
    const character = await ctx.db.get(args.characterId);
    if (!character) throw new Error("Character not found");

    const template = getItemById(args.itemId);
    if (!template) throw new Error("Unknown item: " + args.itemId);

    const bindingRule = getBindingRule(template);
    const isBop = bindingRule === "bop";

    const newItemId = await createItemInstance(ctx, {
      templateId: args.itemId,
      campaignId: character.campaignId,
      status: "inventory",
      ownerId: args.characterId,
      boundTo: isBop ? args.characterId : undefined,
    });

    await logItemEvent(ctx, {
      itemId: newItemId,
      campaignId: character.campaignId,
      event: "created",
      actorId: args.characterId,
    });

    if (isBop) {
      await logItemEvent(ctx, {
        itemId: newItemId,
        campaignId: character.campaignId,
        event: "bound",
        actorId: args.characterId,
        metadata: "Bind on Pickup",
      });
    }
  },
});

export const removeItemFromInventory = mutation({
  args: {
    characterId: v.id("characters"),
    itemId: v.id("items"),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item) throw new Error("Item not found");
    if (item.ownerId !== args.characterId || item.status !== "inventory") {
      throw new Error("Item not in your inventory");
    }

    await ctx.db.patch(args.itemId, {
      status: "destroyed",
      ownerId: undefined,
    });

    await logItemEvent(ctx, {
      itemId: args.itemId,
      campaignId: item.campaignId,
      event: "destroyed",
      actorId: args.characterId,
    });
  },
});

// ============ STARTING GEAR ============

const CLASS_STARTING_GEAR: Record<string, { equip: Record<string, string>; inventory: string[] }> = {
  warrior: {
    equip: {
      head: "head_white_02",
      chest: "chest_white_02",
      hands: "hands_white_02",
      boots: "boots_white_02",
      mainHand: "main_white_01",
      offHand: "off_white_02",
    },
    inventory: [],
  },
  rogue: {
    equip: {
      head: "head_green_01",
      chest: "chest_white_03",
      hands: "hands_white_01",
      boots: "boots_green_02",
      mainHand: "main_white_04",
    },
    inventory: ["off_white_03"],
  },
  scholar: {
    equip: {
      head: "head_white_03",
      chest: "chest_white_04",
      hands: "hands_white_03",
      boots: "boots_white_03",
      mainHand: "main_white_02",
      book: "book_white_01",
    },
    inventory: [],
  },
  mage: {
    equip: {
      head: "head_white_03",
      chest: "chest_white_04",
      hands: "hands_white_03",
      boots: "boots_white_03",
      mainHand: "main_white_02",
      book: "book_white_01",
    },
    inventory: ["off_green_02"],
  },
  default: {
    equip: {
      chest: "chest_gray_01",
      boots: "boots_gray_02",
      mainHand: "main_gray_01",
    },
    inventory: [],
  },
};

export const giveStartingGear = mutation({
  args: {
    characterId: v.id("characters"),
    className: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const character = await ctx.db.get(args.characterId);
    if (!character) throw new Error("Character not found");

    const className = (args.className || "default").toLowerCase();
    const gear = CLASS_STARTING_GEAR[className] || CLASS_STARTING_GEAR.default;

    // Create equipped items
    for (const [slot, templateId] of Object.entries(gear.equip)) {
      const template = getItemById(templateId);
      if (!template) continue;

      const itemId = await createItemInstance(ctx, {
        templateId,
        campaignId: character.campaignId,
        status: "equipped",
        ownerId: args.characterId,
        equippedSlot: slot,
      });

      await logItemEvent(ctx, {
        itemId,
        campaignId: character.campaignId,
        event: "created",
        actorId: args.characterId,
        metadata: "Starting gear",
      });
    }

    // Create inventory items
    for (const templateId of gear.inventory) {
      const template = getItemById(templateId);
      if (!template) continue;

      const itemId = await createItemInstance(ctx, {
        templateId,
        campaignId: character.campaignId,
        status: "inventory",
        ownerId: args.characterId,
      });

      await logItemEvent(ctx, {
        itemId,
        campaignId: character.campaignId,
        event: "created",
        actorId: args.characterId,
        metadata: "Starting gear",
      });
    }
  },
});

// ============ QUERIES ============

export const getEquipment = query({
  args: { characterId: v.id("characters") },
  handler: async (ctx, args) => {
    const equippedItems = await ctx.db
      .query("items")
      .withIndex("by_owner", (q) => q.eq("ownerId", args.characterId))
      .filter((q) => q.eq(q.field("status"), "equipped"))
      .collect();

    // Build slot map matching the old shape: { head: item | null, chest: item | null, ... }
    const slotMap: Record<string, Doc<"items"> | null> = {};
    const allSlots = [
      "head", "chest", "hands", "boots", "cloak",
      "ring1", "ring2", "necklace", "mainHand", "offHand", "book",
      "collar", "restraints", "toy",
    ];
    for (const slot of allSlots) {
      slotMap[slot] = equippedItems.find((i) => i.equippedSlot === slot) ?? null;
    }

    return slotMap;
  },
});

export const getInventory = query({
  args: { characterId: v.id("characters") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("items")
      .withIndex("by_owner", (q) => q.eq("ownerId", args.characterId))
      .filter((q) => q.eq(q.field("status"), "inventory"))
      .collect();
  },
});
