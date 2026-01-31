import { Doc } from "../_generated/dataModel";

// ============ TYPES ============

export interface EquipmentBonuses {
  ac: number;
  hp: number;
  speed: number;
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
  damageBonus: number;
  critChance: number;
  spellPower: number;
  healingPower: number;
  stealthBonus: number;
  perceptionBonus: number;
  persuasionBonus: number;
  xpBonus: number;
}

export interface AbilityModifiers {
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
}

export interface EffectiveAbilities {
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
}

export interface DerivedStats {
  effectiveAc: number;
  effectiveMaxHp: number;
  effectiveSpeed: number;
  effectiveAbilities: EffectiveAbilities;
  abilityModifiers: AbilityModifiers;
  attackBonus: number;
  spellSaveDC: number;
  equipmentBonuses: EquipmentBonuses;
}

// ============ HELPERS ============

export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

// ============ EQUIPMENT BONUSES ============

/**
 * Sum up all stat bonuses from equipped items.
 */
export function computeEquipmentBonuses(
  equippedItems: Array<Pick<Doc<"items">, "stats" | "specialAttributes">>,
): EquipmentBonuses {
  const bonuses: EquipmentBonuses = {
    ac: 0,
    hp: 0,
    speed: 0,
    strength: 0,
    dexterity: 0,
    constitution: 0,
    intelligence: 0,
    wisdom: 0,
    charisma: 0,
    damageBonus: 0,
    critChance: 0,
    spellPower: 0,
    healingPower: 0,
    stealthBonus: 0,
    perceptionBonus: 0,
    persuasionBonus: 0,
    xpBonus: 0,
  };

  for (const item of equippedItems) {
    const s = item.stats;
    if (s.ac) bonuses.ac += s.ac;
    if (s.hp) bonuses.hp += s.hp;
    if (s.speed) bonuses.speed += s.speed;
    if (s.strength) bonuses.strength += s.strength;
    if (s.dexterity) bonuses.dexterity += s.dexterity;
    if (s.constitution) bonuses.constitution += s.constitution;
    if (s.intelligence) bonuses.intelligence += s.intelligence;
    if (s.wisdom) bonuses.wisdom += s.wisdom;
    if (s.charisma) bonuses.charisma += s.charisma;

    // Special attributes mapped to bonus fields
    const sa = item.specialAttributes;
    if (sa) {
      if (sa.damageBonus) bonuses.damageBonus += sa.damageBonus;
      if (sa.critChance) bonuses.critChance += sa.critChance;
      if (sa.spellPower) bonuses.spellPower += sa.spellPower;
      if (sa.healingPower) bonuses.healingPower += sa.healingPower;
      if (sa.stealthBonus) bonuses.stealthBonus += sa.stealthBonus;
      if (sa.perceptionBonus) bonuses.perceptionBonus += sa.perceptionBonus;
      if (sa.persuasionBonus) bonuses.persuasionBonus += sa.persuasionBonus;
      if (sa.xpBonus) bonuses.xpBonus += sa.xpBonus;
    }
  }

  return bonuses;
}

// ============ DERIVED STATS ============

/**
 * Compute fully derived stats for a character given base data and equipment bonuses.
 */
export function computeDerivedStats(
  character: Pick<
    Doc<"characters">,
    "ac" | "maxHp" | "speed" | "abilities" | "proficiencyBonus" | "class"
  >,
  bonuses: EquipmentBonuses,
): DerivedStats {
  const effectiveAbilities: EffectiveAbilities = {
    strength: character.abilities.strength + bonuses.strength,
    dexterity: character.abilities.dexterity + bonuses.dexterity,
    constitution: character.abilities.constitution + bonuses.constitution,
    intelligence: character.abilities.intelligence + bonuses.intelligence,
    wisdom: character.abilities.wisdom + bonuses.wisdom,
    charisma: character.abilities.charisma + bonuses.charisma,
  };

  const mods: AbilityModifiers = {
    strength: abilityModifier(effectiveAbilities.strength),
    dexterity: abilityModifier(effectiveAbilities.dexterity),
    constitution: abilityModifier(effectiveAbilities.constitution),
    intelligence: abilityModifier(effectiveAbilities.intelligence),
    wisdom: abilityModifier(effectiveAbilities.wisdom),
    charisma: abilityModifier(effectiveAbilities.charisma),
  };

  // Determine primary attack ability based on class
  const castingClasses: Record<string, keyof AbilityModifiers> = {
    wizard: "intelligence",
    mage: "intelligence",
    scholar: "intelligence",
    sorcerer: "charisma",
    warlock: "charisma",
    bard: "charisma",
    paladin: "charisma",
    cleric: "wisdom",
    druid: "wisdom",
    ranger: "wisdom",
  };

  const meleeClasses = new Set([
    "warrior",
    "fighter",
    "barbarian",
    "paladin",
    "monk",
  ]);

  const dexClasses = new Set(["rogue", "ranger", "monk"]);

  const cls = (character.class ?? "").toLowerCase();

  // Attack bonus: proficiency + relevant ability mod
  let attackAbility: keyof AbilityModifiers = "strength";
  if (dexClasses.has(cls)) {
    attackAbility = "dexterity";
  } else if (castingClasses[cls]) {
    attackAbility = castingClasses[cls];
  }
  const attackBonus = character.proficiencyBonus + mods[attackAbility];

  // Spell save DC: 8 + proficiency + casting mod
  const castingMod = castingClasses[cls]
    ? mods[castingClasses[cls]]
    : mods.intelligence;
  const spellSaveDC = 8 + character.proficiencyBonus + castingMod;

  return {
    effectiveAc: character.ac + bonuses.ac,
    effectiveMaxHp: character.maxHp + bonuses.hp,
    effectiveSpeed: character.speed + bonuses.speed,
    effectiveAbilities,
    abilityModifiers: mods,
    attackBonus,
    spellSaveDC,
    equipmentBonuses: bonuses,
  };
}
