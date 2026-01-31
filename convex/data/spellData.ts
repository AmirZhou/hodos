/**
 * SRD Spell Definitions
 *
 * Core spell data for D&D 5e combat integration.
 * Covers a representative set of SRD spells across levels 0-3.
 */

export interface SpellDefinition {
  id: string;
  name: string;
  level: number; // 0 = cantrip
  school: "abjuration" | "conjuration" | "divination" | "enchantment" | "evocation" | "illusion" | "necromancy" | "transmutation";
  castingTime: "action" | "bonus_action" | "reaction" | "1_minute" | "10_minutes";
  range: number; // in feet, 0 = self, 5 = touch
  components: ("V" | "S" | "M")[];
  duration: string; // "instantaneous", "concentration, up to 1 minute", etc.
  concentration: boolean;
  damage?: {
    dice: string; // e.g. "1d10"
    type: string; // e.g. "fire"
    scalesWithLevel?: boolean; // cantrip scaling
  };
  healing?: {
    dice: string;
  };
  saveType?: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
  attackRoll?: boolean;
  areaOfEffect?: {
    type: "sphere" | "cone" | "line" | "cube" | "cylinder";
    size: number; // radius or length in feet
  };
  conditions?: string[]; // conditions applied
  description: string;
}

export const SPELLS: Record<string, SpellDefinition> = {
  // ============ CANTRIPS (Level 0) ============

  fire_bolt: {
    id: "fire_bolt",
    name: "Fire Bolt",
    level: 0,
    school: "evocation",
    castingTime: "action",
    range: 120,
    components: ["V", "S"],
    duration: "instantaneous",
    concentration: false,
    damage: { dice: "1d10", type: "fire", scalesWithLevel: true },
    attackRoll: true,
    description: "Hurl a mote of fire at a creature or object within range.",
  },

  sacred_flame: {
    id: "sacred_flame",
    name: "Sacred Flame",
    level: 0,
    school: "evocation",
    castingTime: "action",
    range: 60,
    components: ["V", "S"],
    duration: "instantaneous",
    concentration: false,
    damage: { dice: "1d8", type: "radiant", scalesWithLevel: true },
    saveType: "dexterity",
    description: "Flame-like radiance descends on a creature. DEX save or take damage.",
  },

  eldritch_blast: {
    id: "eldritch_blast",
    name: "Eldritch Blast",
    level: 0,
    school: "evocation",
    castingTime: "action",
    range: 120,
    components: ["V", "S"],
    duration: "instantaneous",
    concentration: false,
    damage: { dice: "1d10", type: "force", scalesWithLevel: true },
    attackRoll: true,
    description: "A beam of crackling energy streaks toward a creature within range.",
  },

  ray_of_frost: {
    id: "ray_of_frost",
    name: "Ray of Frost",
    level: 0,
    school: "evocation",
    castingTime: "action",
    range: 60,
    components: ["V", "S"],
    duration: "instantaneous",
    concentration: false,
    damage: { dice: "1d8", type: "cold", scalesWithLevel: true },
    attackRoll: true,
    description: "A frigid beam of blue-white light streaks toward a creature. Speed reduced by 10 ft.",
  },

  chill_touch: {
    id: "chill_touch",
    name: "Chill Touch",
    level: 0,
    school: "necromancy",
    castingTime: "action",
    range: 120,
    components: ["V", "S"],
    duration: "1 round",
    concentration: false,
    damage: { dice: "1d8", type: "necrotic", scalesWithLevel: true },
    attackRoll: true,
    description: "A ghostly, skeletal hand grasps at a creature. Can't regain HP until your next turn.",
  },

  // ============ LEVEL 1 ============

  magic_missile: {
    id: "magic_missile",
    name: "Magic Missile",
    level: 1,
    school: "evocation",
    castingTime: "action",
    range: 120,
    components: ["V", "S"],
    duration: "instantaneous",
    concentration: false,
    damage: { dice: "1d4+1", type: "force" },
    description: "Three glowing darts of magical force. Each dart hits automatically for 1d4+1 force damage.",
  },

  cure_wounds: {
    id: "cure_wounds",
    name: "Cure Wounds",
    level: 1,
    school: "evocation",
    castingTime: "action",
    range: 5,
    components: ["V", "S"],
    duration: "instantaneous",
    concentration: false,
    healing: { dice: "1d8" },
    description: "A creature you touch regains 1d8 + spellcasting modifier hit points.",
  },

  shield: {
    id: "shield",
    name: "Shield",
    level: 1,
    school: "abjuration",
    castingTime: "reaction",
    range: 0,
    components: ["V", "S"],
    duration: "1 round",
    concentration: false,
    description: "+5 bonus to AC until the start of your next turn, including against the triggering attack.",
  },

  burning_hands: {
    id: "burning_hands",
    name: "Burning Hands",
    level: 1,
    school: "evocation",
    castingTime: "action",
    range: 0,
    components: ["V", "S"],
    duration: "instantaneous",
    concentration: false,
    damage: { dice: "3d6", type: "fire" },
    saveType: "dexterity",
    areaOfEffect: { type: "cone", size: 15 },
    description: "A thin sheet of flames shoots forth. DEX save; half damage on success.",
  },

  thunderwave: {
    id: "thunderwave",
    name: "Thunderwave",
    level: 1,
    school: "evocation",
    castingTime: "action",
    range: 0,
    components: ["V", "S"],
    duration: "instantaneous",
    concentration: false,
    damage: { dice: "2d8", type: "thunder" },
    saveType: "constitution",
    areaOfEffect: { type: "cube", size: 15 },
    description: "A wave of thunderous force sweeps out. CON save or take damage and be pushed 10 ft.",
  },

  sleep: {
    id: "sleep",
    name: "Sleep",
    level: 1,
    school: "enchantment",
    castingTime: "action",
    range: 90,
    components: ["V", "S", "M"],
    duration: "1 minute",
    concentration: false,
    conditions: ["unconscious"],
    areaOfEffect: { type: "sphere", size: 20 },
    description: "5d8 HP of creatures fall unconscious, starting with the lowest current HP.",
  },

  // ============ LEVEL 2 ============

  scorching_ray: {
    id: "scorching_ray",
    name: "Scorching Ray",
    level: 2,
    school: "evocation",
    castingTime: "action",
    range: 120,
    components: ["V", "S"],
    duration: "instantaneous",
    concentration: false,
    damage: { dice: "2d6", type: "fire" },
    attackRoll: true,
    description: "Three rays of fire. Make a ranged spell attack for each; each deals 2d6 fire on hit.",
  },

  hold_person: {
    id: "hold_person",
    name: "Hold Person",
    level: 2,
    school: "enchantment",
    castingTime: "action",
    range: 60,
    components: ["V", "S", "M"],
    duration: "concentration, up to 1 minute",
    concentration: true,
    saveType: "wisdom",
    conditions: ["paralyzed"],
    description: "Target humanoid must succeed on WIS save or be paralyzed. Repeat save at end of each turn.",
  },

  misty_step: {
    id: "misty_step",
    name: "Misty Step",
    level: 2,
    school: "conjuration",
    castingTime: "bonus_action",
    range: 0,
    components: ["V"],
    duration: "instantaneous",
    concentration: false,
    description: "Teleport up to 30 feet to an unoccupied space you can see.",
  },

  // ============ LEVEL 3 ============

  fireball: {
    id: "fireball",
    name: "Fireball",
    level: 3,
    school: "evocation",
    castingTime: "action",
    range: 150,
    components: ["V", "S", "M"],
    duration: "instantaneous",
    concentration: false,
    damage: { dice: "8d6", type: "fire" },
    saveType: "dexterity",
    areaOfEffect: { type: "sphere", size: 20 },
    description: "A bright streak of fire detonates. DEX save; 8d6 fire damage, half on success.",
  },

  counterspell: {
    id: "counterspell",
    name: "Counterspell",
    level: 3,
    school: "abjuration",
    castingTime: "reaction",
    range: 60,
    components: ["S"],
    duration: "instantaneous",
    concentration: false,
    description: "Interrupt a creature casting a spell of 3rd level or lower. Higher: ability check DC 10 + spell level.",
  },

  dispel_magic: {
    id: "dispel_magic",
    name: "Dispel Magic",
    level: 3,
    school: "abjuration",
    castingTime: "action",
    range: 120,
    components: ["V", "S"],
    duration: "instantaneous",
    concentration: false,
    description: "End one spell of 3rd level or lower on a target. Higher: ability check DC 10 + spell level.",
  },

  haste: {
    id: "haste",
    name: "Haste",
    level: 3,
    school: "transmutation",
    castingTime: "action",
    range: 30,
    components: ["V", "S", "M"],
    duration: "concentration, up to 1 minute",
    concentration: true,
    description: "Target gains +2 AC, advantage on DEX saves, doubled speed, and an extra action each turn.",
  },
};

/**
 * Get a spell by its ID.
 */
export function getSpellById(id: string): SpellDefinition | undefined {
  return SPELLS[id];
}

/**
 * Get all spells at a given level.
 */
export function getSpellsByLevel(level: number): SpellDefinition[] {
  return Object.values(SPELLS).filter((s) => s.level === level);
}

/**
 * Get all cantrips.
 */
export function getCantrips(): SpellDefinition[] {
  return getSpellsByLevel(0);
}
