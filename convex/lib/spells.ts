import { abilityModifier } from "./stats";

/**
 * D&D 5e Spell Slot Tables and Casting Mechanics
 */

// ============ SPELL SLOT TABLE ============

// Spell slots per level for full casters (Wizard, Cleric, Druid, Sorcerer, Bard)
// Index: [characterLevel][spellLevel] → number of slots
// spellLevel 0 = cantrips (unlimited), 1-9 = spell levels
const FULL_CASTER_SLOTS: Record<number, Record<number, number>> = {
  1:  { 1: 2 },
  2:  { 1: 3 },
  3:  { 1: 4, 2: 2 },
  4:  { 1: 4, 2: 3 },
  5:  { 1: 4, 2: 3, 3: 2 },
  6:  { 1: 4, 2: 3, 3: 3 },
  7:  { 1: 4, 2: 3, 3: 3, 4: 1 },
  8:  { 1: 4, 2: 3, 3: 3, 4: 2 },
  9:  { 1: 4, 2: 3, 3: 3, 4: 3, 5: 1 },
  10: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 },
  11: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1 },
  12: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1 },
  13: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1 },
  14: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1 },
  15: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1 },
  16: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1 },
  17: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1, 9: 1 },
  18: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 1, 7: 1, 8: 1, 9: 1 },
  19: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 1, 8: 1, 9: 1 },
  20: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 2, 8: 1, 9: 1 },
};

// Half-caster slot table (Paladin, Ranger) — starts at level 2
const HALF_CASTER_SLOTS: Record<number, Record<number, number>> = {
  2:  { 1: 2 },
  3:  { 1: 3 },
  4:  { 1: 3 },
  5:  { 1: 4, 2: 2 },
  6:  { 1: 4, 2: 2 },
  7:  { 1: 4, 2: 3 },
  8:  { 1: 4, 2: 3 },
  9:  { 1: 4, 2: 3, 3: 2 },
  10: { 1: 4, 2: 3, 3: 2 },
  11: { 1: 4, 2: 3, 3: 3 },
  12: { 1: 4, 2: 3, 3: 3 },
  13: { 1: 4, 2: 3, 3: 3, 4: 1 },
  14: { 1: 4, 2: 3, 3: 3, 4: 1 },
  15: { 1: 4, 2: 3, 3: 3, 4: 2 },
  16: { 1: 4, 2: 3, 3: 3, 4: 2 },
  17: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 1 },
  18: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 1 },
  19: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 },
  20: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 },
};

// Third-casters not included for brevity — same pattern at 1/3 progression

const FULL_CASTER_CLASSES = new Set([
  "wizard", "mage", "scholar", "cleric", "druid", "sorcerer", "bard", "warlock",
]);

const HALF_CASTER_CLASSES = new Set(["paladin", "ranger"]);

// Casting ability per class
const CASTING_ABILITY: Record<string, "intelligence" | "wisdom" | "charisma"> = {
  wizard: "intelligence",
  mage: "intelligence",
  scholar: "intelligence",
  cleric: "wisdom",
  druid: "wisdom",
  ranger: "wisdom",
  sorcerer: "charisma",
  warlock: "charisma",
  bard: "charisma",
  paladin: "charisma",
};

// ============ PUBLIC API ============

/**
 * Get the spell slot table for a class at a given level.
 * Returns a map of spellLevel → maxSlots.
 */
export function getSpellSlots(
  characterClass: string,
  level: number,
): Record<number, number> {
  const cls = characterClass.toLowerCase();

  if (FULL_CASTER_CLASSES.has(cls)) {
    return FULL_CASTER_SLOTS[level] ?? {};
  }
  if (HALF_CASTER_CLASSES.has(cls)) {
    return HALF_CASTER_SLOTS[level] ?? {};
  }
  return {}; // non-caster
}

/**
 * Check if a class can cast spells.
 */
export function isCaster(characterClass: string): boolean {
  const cls = characterClass.toLowerCase();
  return FULL_CASTER_CLASSES.has(cls) || HALF_CASTER_CLASSES.has(cls);
}

/**
 * Get the casting ability for a class.
 */
export function getCastingAbility(
  characterClass: string,
): "intelligence" | "wisdom" | "charisma" | null {
  return CASTING_ABILITY[characterClass.toLowerCase()] ?? null;
}

/**
 * Calculate spell save DC.
 * DC = 8 + proficiency bonus + casting ability modifier
 */
export function getSpellSaveDC(
  proficiencyBonus: number,
  castingAbilityScore: number,
): number {
  return 8 + proficiencyBonus + abilityModifier(castingAbilityScore);
}

/**
 * Calculate spell attack bonus.
 * Bonus = proficiency bonus + casting ability modifier
 */
export function getSpellAttackBonus(
  proficiencyBonus: number,
  castingAbilityScore: number,
): number {
  return proficiencyBonus + abilityModifier(castingAbilityScore);
}

/**
 * Scale cantrip damage based on character level.
 * Cantrips scale at levels 5, 11, and 17.
 */
export function getCantripDiceCount(characterLevel: number): number {
  if (characterLevel >= 17) return 4;
  if (characterLevel >= 11) return 3;
  if (characterLevel >= 5) return 2;
  return 1;
}

/**
 * Check if a character has a spell slot available at the given level.
 */
export function hasSpellSlot(
  spellSlots: Record<string, { max: number; used: number }>,
  spellLevel: number,
): boolean {
  const slot = spellSlots[String(spellLevel)];
  if (!slot) return false;
  return slot.used < slot.max;
}

/**
 * Initialize spell slots for a character based on class and level.
 * Returns the slot structure for storage.
 */
export function initializeSpellSlots(
  characterClass: string,
  level: number,
): Record<string, { max: number; used: number }> {
  const table = getSpellSlots(characterClass, level);
  const slots: Record<string, { max: number; used: number }> = {};
  for (const [spellLevel, maxSlots] of Object.entries(table)) {
    slots[spellLevel] = { max: maxSlots, used: 0 };
  }
  return slots;
}
