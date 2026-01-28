import type { EquipmentSlot, EquipedSlot, Rarity } from "../../convex/data/equipmentItems";

export const RARITY_COLORS: Record<Rarity, string> = {
  mundane: "#9d9d9d",
  common: "#ffffff",
  uncommon: "#1eff00",
  rare: "#0070dd",
  epic: "#a335ee",
  legendary: "#ff8000",
};

export const RARITY_BG_COLORS: Record<Rarity, string> = {
  mundane: "rgba(157, 157, 157, 0.15)",
  common: "rgba(255, 255, 255, 0.1)",
  uncommon: "rgba(30, 255, 0, 0.15)",
  rare: "rgba(0, 112, 221, 0.15)",
  epic: "rgba(163, 53, 238, 0.15)",
  legendary: "rgba(255, 128, 0, 0.2)",
};

export const RARITY_BORDER_COLORS: Record<Rarity, string> = {
  mundane: "rgba(157, 157, 157, 0.3)",
  common: "rgba(255, 255, 255, 0.2)",
  uncommon: "rgba(30, 255, 0, 0.4)",
  rare: "rgba(0, 112, 221, 0.5)",
  epic: "rgba(163, 53, 238, 0.5)",
  legendary: "rgba(255, 128, 0, 0.6)",
};

export const RARITY_LABELS: Record<Rarity, string> = {
  mundane: "Mundane",
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  epic: "Epic",
  legendary: "Legendary",
};

export const SLOT_LABELS: Record<EquipmentSlot | EquipedSlot, string> = {
  head: "Head",
  chest: "Chest",
  hands: "Hands",
  boots: "Boots",
  cloak: "Cloak",
  ring: "Ring",
  ring1: "Ring 1",
  ring2: "Ring 2",
  necklace: "Necklace",
  mainHand: "Main Hand",
  offHand: "Off Hand",
  book: "Book",
  collar: "Collar",
  restraints: "Restraints",
  toy: "Toy",
};

// Map equipped slot to item type for ring slots
export function equippedSlotToItemType(slot: EquipedSlot): EquipmentSlot {
  if (slot === "ring1" || slot === "ring2") return "ring";
  return slot;
}

export function getRarityColor(rarity: Rarity): string {
  return RARITY_COLORS[rarity];
}

export function getRarityLabel(rarity: Rarity): string {
  return RARITY_LABELS[rarity];
}

export function getSlotLabel(slot: EquipmentSlot | EquipedSlot): string {
  return SLOT_LABELS[slot];
}

export function formatStatName(stat: string): string {
  const names: Record<string, string> = {
    ac: "Armor Class",
    hp: "Hit Points",
    speed: "Speed",
    damage: "Damage",
    strength: "Strength",
    dexterity: "Dexterity",
    constitution: "Constitution",
    intelligence: "Intelligence",
    wisdom: "Wisdom",
    charisma: "Charisma",
    critChance: "Crit Chance",
    damageBonus: "Damage Bonus",
    spellPower: "Spell Power",
    healingPower: "Healing Power",
    stealthBonus: "Stealth",
    perceptionBonus: "Perception",
    persuasionBonus: "Persuasion",
    xpBonus: "XP Bonus",
    seduction: "Seduction",
    intimidation: "Intimidation",
    submission: "Submission",
    bondageArts: "Bondage Arts",
    sensationMastery: "Sensation Mastery",
    trustBuilding: "Trust Building",
    aftercarePower: "Aftercare",
    painThreshold: "Pain Threshold",
    allure: "Allure",
    commandPresence: "Command Presence",
  };
  return names[stat] || stat;
}

export function formatStatValue(key: string, value: number | string): string {
  if (typeof value === "string") return value;
  if (key === "xpBonus" || key === "critChance") return `+${value}%`;
  return `+${value}`;
}
