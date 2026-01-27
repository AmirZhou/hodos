import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getItemById } from "./data/equipmentItems";
import type { EquipmentItem, EquipedSlot } from "./data/equipmentItems";

// One-time migration: convert old equipped shape to new 11-slot system
export const migrateEquippedSlots = mutation({
  args: {},
  handler: async (ctx) => {
    const characters = await ctx.db.query("characters").collect();
    let migrated = 0;
    for (const character of characters) {
      const equipped = character.equipped as Record<string, unknown>;
      if ("accessories" in equipped || "armor" in equipped) {
        await ctx.db.patch(character._id, {
          equipped: {},
          inventory: [],
        });
        migrated++;
      }
    }
    return { migrated, total: characters.length };
  },
});

function itemToDoc(item: EquipmentItem) {
  return {
    id: item.id,
    name: item.name,
    nameFr: item.nameFr,
    description: item.description,
    type: item.type as "head" | "chest" | "hands" | "boots" | "cloak" | "ring" | "necklace" | "mainHand" | "offHand" | "book",
    rarity: item.rarity as "mundane" | "common" | "uncommon" | "rare" | "epic" | "legendary",
    stats: item.stats,
    specialAttributes: item.specialAttributes,
    passive: item.passive,
  };
}

function getSlotForItem(itemType: string, equipped: Record<string, unknown>): EquipedSlot | null {
  if (itemType === "ring") {
    if (!equipped.ring1) return "ring1";
    if (!equipped.ring2) return "ring2";
    return "ring1"; // Replace ring1 by default
  }
  const slotMap: Record<string, EquipedSlot> = {
    head: "head",
    chest: "chest",
    hands: "hands",
    boots: "boots",
    cloak: "cloak",
    necklace: "necklace",
    mainHand: "mainHand",
    offHand: "offHand",
    book: "book",
  };
  return slotMap[itemType] || null;
}

export const equipItem = mutation({
  args: {
    characterId: v.id("characters"),
    itemId: v.string(),
    targetSlot: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const character = await ctx.db.get(args.characterId);
    if (!character) throw new Error("Character not found");

    const inventory = character.inventory as Array<{ id: string; type: string; [k: string]: unknown }>;
    const inventoryIndex = inventory.findIndex(
      (i) => i.id === args.itemId
    );
    if (inventoryIndex === -1) throw new Error("Item not in inventory");

    const item = inventory[inventoryIndex];
    const equipped = character.equipped as Record<string, unknown>;
    const slot = (args.targetSlot as EquipedSlot) || getSlotForItem(item.type, equipped);
    if (!slot) throw new Error("No valid slot for item type: " + item.type);

    const newInventory = [...inventory];
    newInventory.splice(inventoryIndex, 1);

    // Unequip existing item in slot
    const existingItem = equipped[slot];
    if (existingItem) {
      newInventory.push(existingItem);
    }

    await ctx.db.patch(args.characterId, {
      inventory: newInventory,
      equipped: {
        ...equipped,
        [slot]: item,
      },
    });
  },
});

export const unequipItem = mutation({
  args: {
    characterId: v.id("characters"),
    slot: v.string(),
  },
  handler: async (ctx, args) => {
    const character = await ctx.db.get(args.characterId);
    if (!character) throw new Error("Character not found");

    const equipped = character.equipped as Record<string, unknown>;
    const inventory = character.inventory as unknown[];
    const slot = args.slot;
    const item = equipped[slot];
    if (!item) throw new Error("No item in slot: " + args.slot);

    await ctx.db.patch(args.characterId, {
      inventory: [...inventory, item],
      equipped: {
        ...equipped,
        [slot]: undefined,
      },
    });
  },
});

export const addItemToInventory = mutation({
  args: {
    characterId: v.id("characters"),
    itemId: v.string(),
  },
  handler: async (ctx, args) => {
    const character = await ctx.db.get(args.characterId);
    if (!character) throw new Error("Character not found");

    const itemData = getItemById(args.itemId);
    if (!itemData) throw new Error("Unknown item: " + args.itemId);

    await ctx.db.patch(args.characterId, {
      inventory: [...character.inventory, itemToDoc(itemData)],
    });
  },
});

export const removeItemFromInventory = mutation({
  args: {
    characterId: v.id("characters"),
    inventoryIndex: v.number(),
  },
  handler: async (ctx, args) => {
    const character = await ctx.db.get(args.characterId);
    if (!character) throw new Error("Character not found");

    if (args.inventoryIndex < 0 || args.inventoryIndex >= character.inventory.length) {
      throw new Error("Invalid inventory index");
    }

    const newInventory = [...character.inventory];
    newInventory.splice(args.inventoryIndex, 1);

    await ctx.db.patch(args.characterId, { inventory: newInventory });
  },
});

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

    const equipped: Record<string, ReturnType<typeof itemToDoc>> = {};
    for (const [slot, itemId] of Object.entries(gear.equip)) {
      const item = getItemById(itemId);
      if (item) {
        equipped[slot] = itemToDoc(item);
      }
    }

    const inventory = gear.inventory
      .map((id) => getItemById(id))
      .filter((i): i is EquipmentItem => i !== undefined)
      .map(itemToDoc);

    await ctx.db.patch(args.characterId, {
      equipped: { ...character.equipped, ...equipped },
      inventory: [...character.inventory, ...inventory],
    });
  },
});

export const getEquipment = query({
  args: { characterId: v.id("characters") },
  handler: async (ctx, args) => {
    const character = await ctx.db.get(args.characterId);
    if (!character) return null;
    return character.equipped;
  },
});

export const getInventory = query({
  args: { characterId: v.id("characters") },
  handler: async (ctx, args) => {
    const character = await ctx.db.get(args.characterId);
    if (!character) return null;
    return character.inventory;
  },
});
