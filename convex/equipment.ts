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
          equipped: {} as typeof character.equipped,
          inventory: [] as typeof character.inventory,
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
    description: item.description,
    type: item.type as "head" | "chest" | "hands" | "boots" | "cloak" | "ring" | "necklace" | "mainHand" | "offHand" | "book",
    rarity: item.rarity as "mundane" | "common" | "uncommon" | "rare" | "epic" | "legendary",
    stats: item.stats,
    specialAttributes: item.specialAttributes,
    passive: item.passive,
  };
}

type EquipDoc = ReturnType<typeof itemToDoc>;

function getSlotForItem(itemType: string, equipped: Record<string, unknown>): EquipedSlot | null {
  if (itemType === "ring") {
    if (!equipped.ring1) return "ring1";
    if (!equipped.ring2) return "ring2";
    return "ring1";
  }
  const slotMap: Record<string, EquipedSlot> = {
    head: "head", chest: "chest", hands: "hands", boots: "boots",
    cloak: "cloak", necklace: "necklace", mainHand: "mainHand",
    offHand: "offHand", book: "book",
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

    const inventoryIndex = character.inventory.findIndex(
      (i) => i.id === args.itemId
    );
    if (inventoryIndex === -1) throw new Error("Item not in inventory");

    const item = character.inventory[inventoryIndex];
    const slot = (args.targetSlot as EquipedSlot) || getSlotForItem(
      item.type,
      character.equipped as Record<string, unknown>
    );
    if (!slot) throw new Error("No valid slot for item type: " + item.type);

    const newInventory = [...character.inventory];
    newInventory.splice(inventoryIndex, 1);

    // Unequip existing item in slot
    const existingItem = character.equipped[slot as keyof typeof character.equipped];
    if (existingItem) {
      newInventory.push(existingItem);
    }

    await ctx.db.patch(args.characterId, {
      inventory: newInventory,
      equipped: {
        ...character.equipped,
        [slot]: item,
      } as typeof character.equipped,
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

    const slot = args.slot as keyof typeof character.equipped;
    const item = character.equipped[slot];
    if (!item) throw new Error("No item in slot: " + args.slot);

    await ctx.db.patch(args.characterId, {
      inventory: [...character.inventory, item],
      equipped: {
        ...character.equipped,
        [slot]: undefined,
      } as typeof character.equipped,
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

    const doc = itemToDoc(itemData);
    await ctx.db.patch(args.characterId, {
      inventory: [...character.inventory, doc] as typeof character.inventory,
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

    const equipped: Record<string, EquipDoc> = {};
    for (const [slot, itemId] of Object.entries(gear.equip)) {
      const item = getItemById(itemId);
      if (item) {
        equipped[slot] = itemToDoc(item);
      }
    }

    const inventoryItems = gear.inventory
      .map((id) => getItemById(id))
      .filter((i): i is EquipmentItem => i !== undefined)
      .map(itemToDoc);

    await ctx.db.patch(args.characterId, {
      equipped: { ...character.equipped, ...equipped } as typeof character.equipped,
      inventory: [...character.inventory, ...inventoryItems] as typeof character.inventory,
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
