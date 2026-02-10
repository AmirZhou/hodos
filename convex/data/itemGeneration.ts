/**
 * Item Generation System
 *
 * Allows the DM to create items on-the-fly by specifying an archetype and rarity.
 * The system generates balanced stats based on templates.
 */

import type { EquipmentSlot, Rarity, BindingRule } from "./equipmentItems";

// Weapon archetypes with base damage and properties
export const WEAPON_ARCHETYPES = {
  // Simple Melee
  dagger: { slot: "mainHand" as const, baseDamage: "1d4", damageType: "piercing", properties: ["finesse", "light", "thrown"] },
  club: { slot: "mainHand" as const, baseDamage: "1d4", damageType: "bludgeoning", properties: ["light"] },
  handaxe: { slot: "mainHand" as const, baseDamage: "1d6", damageType: "slashing", properties: ["light", "thrown"] },
  mace: { slot: "mainHand" as const, baseDamage: "1d6", damageType: "bludgeoning", properties: [] },
  quarterstaff: { slot: "mainHand" as const, baseDamage: "1d6", damageType: "bludgeoning", properties: ["versatile"] },
  spear: { slot: "mainHand" as const, baseDamage: "1d6", damageType: "piercing", properties: ["thrown", "versatile"] },

  // Martial Melee
  shortsword: { slot: "mainHand" as const, baseDamage: "1d6", damageType: "piercing", properties: ["finesse", "light"] },
  longsword: { slot: "mainHand" as const, baseDamage: "1d8", damageType: "slashing", properties: ["versatile"] },
  rapier: { slot: "mainHand" as const, baseDamage: "1d8", damageType: "piercing", properties: ["finesse"] },
  scimitar: { slot: "mainHand" as const, baseDamage: "1d6", damageType: "slashing", properties: ["finesse", "light"] },
  battleaxe: { slot: "mainHand" as const, baseDamage: "1d8", damageType: "slashing", properties: ["versatile"] },
  warhammer: { slot: "mainHand" as const, baseDamage: "1d8", damageType: "bludgeoning", properties: ["versatile"] },
  greatsword: { slot: "mainHand" as const, baseDamage: "2d6", damageType: "slashing", properties: ["heavy", "two-handed"] },
  greataxe: { slot: "mainHand" as const, baseDamage: "1d12", damageType: "slashing", properties: ["heavy", "two-handed"] },

  // Ranged
  shortbow: { slot: "mainHand" as const, baseDamage: "1d6", damageType: "piercing", properties: ["ammunition", "two-handed"] },
  longbow: { slot: "mainHand" as const, baseDamage: "1d8", damageType: "piercing", properties: ["ammunition", "heavy", "two-handed"] },
  crossbow: { slot: "mainHand" as const, baseDamage: "1d8", damageType: "piercing", properties: ["ammunition", "loading"] },

  // Off-hand
  shield: { slot: "offHand" as const, baseDamage: "", damageType: "", properties: [], baseAc: 2 },
} as const;

export type WeaponArchetype = keyof typeof WEAPON_ARCHETYPES;

// Armor archetypes with base AC
export const ARMOR_ARCHETYPES = {
  // Head
  cap: { slot: "head" as const, baseAc: 0, category: "light" },
  helm: { slot: "head" as const, baseAc: 1, category: "medium" },
  greathelm: { slot: "head" as const, baseAc: 1, category: "heavy" },
  circlet: { slot: "head" as const, baseAc: 0, category: "cloth" },
  hood: { slot: "head" as const, baseAc: 0, category: "light" },

  // Chest
  robes: { slot: "chest" as const, baseAc: 0, category: "cloth" },
  leather: { slot: "chest" as const, baseAc: 1, category: "light" },
  chainmail: { slot: "chest" as const, baseAc: 2, category: "medium" },
  platemail: { slot: "chest" as const, baseAc: 3, category: "heavy" },

  // Hands
  gloves: { slot: "hands" as const, baseAc: 0, category: "light" },
  gauntlets: { slot: "hands" as const, baseAc: 1, category: "heavy" },
  bracers: { slot: "hands" as const, baseAc: 0, category: "medium" },

  // Boots
  sandals: { slot: "boots" as const, baseAc: 0, category: "cloth" },
  boots: { slot: "boots" as const, baseAc: 0, category: "light" },
  greaves: { slot: "boots" as const, baseAc: 1, category: "heavy" },

  // Cloak
  cloak: { slot: "cloak" as const, baseAc: 0, category: "cloth" },
  cape: { slot: "cloak" as const, baseAc: 0, category: "light" },
} as const;

export type ArmorArchetype = keyof typeof ARMOR_ARCHETYPES;

// Accessory archetypes
export const ACCESSORY_ARCHETYPES = {
  ring: { slot: "ring" as const },
  necklace: { slot: "necklace" as const },
  amulet: { slot: "necklace" as const },
  pendant: { slot: "necklace" as const },
  book: { slot: "book" as const },
  tome: { slot: "book" as const },
  grimoire: { slot: "book" as const },
} as const;

export type AccessoryArchetype = keyof typeof ACCESSORY_ARCHETYPES;

export type ItemArchetype = WeaponArchetype | ArmorArchetype | AccessoryArchetype;

// Rarity modifiers - bonuses added based on item rarity
const RARITY_MODIFIERS: Record<Rarity, {
  damageBonus: number;    // Added to damage (e.g., +1, +2)
  acBonus: number;        // Added to AC
  statBonus: number;      // Bonus to ability scores
  specialChance: number;  // Chance of getting a special attribute (0-1)
}> = {
  mundane: { damageBonus: 0, acBonus: 0, statBonus: 0, specialChance: 0 },
  common: { damageBonus: 0, acBonus: 0, statBonus: 0, specialChance: 0.1 },
  uncommon: { damageBonus: 1, acBonus: 1, statBonus: 1, specialChance: 0.3 },
  rare: { damageBonus: 2, acBonus: 1, statBonus: 2, specialChance: 0.5 },
  epic: { damageBonus: 3, acBonus: 2, statBonus: 3, specialChance: 0.8 },
  legendary: { damageBonus: 4, acBonus: 3, statBonus: 4, specialChance: 1.0 },
};

// Minimum character level for each rarity (matches existing validation)
export const RARITY_MIN_LEVEL: Record<Rarity, number> = {
  mundane: 1,
  common: 1,
  uncommon: 1,
  rare: 5,
  epic: 10,
  legendary: 15,
};

// Special attributes pool for random selection
const SPECIAL_ATTRIBUTES_POOL = [
  "critChance",
  "spellPower",
  "healingPower",
  "stealthBonus",
  "perceptionBonus",
] as const;

export interface GeneratedItemInput {
  archetype: ItemArchetype;
  rarity: Rarity;
  name: string;
  description?: string;
}

export interface GeneratedItem {
  name: string;
  description: string;
  type: EquipmentSlot;
  rarity: Rarity;
  bindingRule: BindingRule;
  stats: {
    ac?: number;
    damage?: string; // e.g., "1d8+2"
    strength?: number;
    dexterity?: number;
    constitution?: number;
    intelligence?: number;
    wisdom?: number;
    charisma?: number;
  };
  specialAttributes?: Record<string, number>;
  generatedFrom: string; // Track the source archetype
}

/**
 * Generate an item from an archetype and rarity
 */
export function generateItem(input: GeneratedItemInput): GeneratedItem | null {
  const { archetype, rarity, name, description } = input;
  const modifier = RARITY_MODIFIERS[rarity];

  // Determine binding rule based on rarity
  const bindingRule: BindingRule =
    rarity === "legendary" ? "bop" :
    rarity === "epic" ? "boe" : "none";

  // Check if it's a weapon
  if (archetype in WEAPON_ARCHETYPES) {
    const template = WEAPON_ARCHETYPES[archetype as WeaponArchetype];

    // Build damage string with bonus
    let damage: string = template.baseDamage;
    if (damage && modifier.damageBonus > 0) {
      damage = `${damage}+${modifier.damageBonus}`;
    }

    // Shield special case - has AC instead of damage
    const stats: GeneratedItem["stats"] = {};
    if ("baseAc" in template && template.baseAc !== undefined) {
      stats.ac = template.baseAc + modifier.acBonus;
    } else if (damage) {
      stats.damage = damage;
    }

    return {
      name,
      description: description || `A ${rarity} ${archetype}`,
      type: template.slot,
      rarity,
      bindingRule,
      stats,
      specialAttributes: generateSpecialAttributes(modifier.specialChance, rarity),
      generatedFrom: archetype,
    };
  }

  // Check if it's armor
  if (archetype in ARMOR_ARCHETYPES) {
    const template = ARMOR_ARCHETYPES[archetype as ArmorArchetype];

    return {
      name,
      description: description || `A ${rarity} ${archetype}`,
      type: template.slot,
      rarity,
      bindingRule,
      stats: {
        ac: template.baseAc + modifier.acBonus,
      },
      specialAttributes: generateSpecialAttributes(modifier.specialChance, rarity),
      generatedFrom: archetype,
    };
  }

  // Check if it's an accessory
  if (archetype in ACCESSORY_ARCHETYPES) {
    const template = ACCESSORY_ARCHETYPES[archetype as AccessoryArchetype];

    // Accessories get stat bonuses instead of AC/damage
    const stats: GeneratedItem["stats"] = {};
    if (modifier.statBonus > 0) {
      // Pick a random stat to boost
      const statOptions = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"] as const;
      const randomStat = statOptions[Math.floor(Math.random() * statOptions.length)];
      stats[randomStat] = modifier.statBonus;
    }

    return {
      name,
      description: description || `A ${rarity} ${archetype}`,
      type: template.slot,
      rarity,
      bindingRule,
      stats,
      specialAttributes: generateSpecialAttributes(modifier.specialChance, rarity),
      generatedFrom: archetype,
    };
  }

  // Unknown archetype
  return null;
}

/**
 * Generate random special attributes based on rarity
 */
function generateSpecialAttributes(chance: number, rarity: Rarity): Record<string, number> | undefined {
  if (Math.random() > chance) return undefined;

  const attrs: Record<string, number> = {};
  const bonusAmount = RARITY_MODIFIERS[rarity].statBonus;

  // Pick 1-2 random special attributes
  const numAttrs = rarity === "legendary" ? 2 : 1;
  const shuffled = [...SPECIAL_ATTRIBUTES_POOL].sort(() => Math.random() - 0.5);

  for (let i = 0; i < numAttrs && i < shuffled.length; i++) {
    attrs[shuffled[i]] = bonusAmount;
  }

  return Object.keys(attrs).length > 0 ? attrs : undefined;
}

/**
 * Validate a generated item request
 */
export function validateGeneratedItem(
  input: unknown,
  characterLevel: number
): { valid: GeneratedItemInput | null; error?: string } {
  if (!input || typeof input !== "object") {
    return { valid: null, error: "Invalid input" };
  }

  const obj = input as Record<string, unknown>;

  // Check required fields
  if (typeof obj.archetype !== "string") {
    return { valid: null, error: "Missing archetype" };
  }
  if (typeof obj.rarity !== "string") {
    return { valid: null, error: "Missing rarity" };
  }
  if (typeof obj.name !== "string" || obj.name.length === 0) {
    return { valid: null, error: "Missing name" };
  }

  // Validate archetype exists
  const archetype = obj.archetype as string;
  const isValidArchetype =
    archetype in WEAPON_ARCHETYPES ||
    archetype in ARMOR_ARCHETYPES ||
    archetype in ACCESSORY_ARCHETYPES;

  if (!isValidArchetype) {
    return { valid: null, error: `Unknown archetype: ${archetype}` };
  }

  // Validate rarity
  const rarity = obj.rarity as Rarity;
  if (!RARITY_MIN_LEVEL[rarity]) {
    return { valid: null, error: `Unknown rarity: ${rarity}` };
  }

  // Check level requirement
  if (characterLevel < RARITY_MIN_LEVEL[rarity]) {
    return { valid: null, error: `Character level ${characterLevel} too low for ${rarity} items (need ${RARITY_MIN_LEVEL[rarity]})` };
  }

  return {
    valid: {
      archetype: archetype as ItemArchetype,
      rarity,
      name: obj.name as string,
      description: typeof obj.description === "string" ? obj.description : undefined,
    },
  };
}

/**
 * Get list of all valid archetypes for the DM prompt
 */
export function getArchetypeList(): string {
  const weapons = Object.keys(WEAPON_ARCHETYPES).join(", ");
  const armor = Object.keys(ARMOR_ARCHETYPES).join(", ");
  const accessories = Object.keys(ACCESSORY_ARCHETYPES).join(", ");

  return `Weapons: ${weapons}\nArmor: ${armor}\nAccessories: ${accessories}`;
}
