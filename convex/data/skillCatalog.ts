/**
 * Skill Catalog — campaign-agnostic skill definitions.
 *
 * Static data array with lookup helpers, following the same pattern as itemCatalog.ts.
 */

export const SKILL_CATEGORIES = ["combat", "magic", "social", "intimate", "utility"] as const;
export type SkillCategory = (typeof SKILL_CATEGORIES)[number];

export type Ability =
  | "strength"
  | "dexterity"
  | "constitution"
  | "intelligence"
  | "wisdom"
  | "charisma";

export interface SkillDefinition {
  id: string;
  name: string;
  category: SkillCategory;
  baseAbility: Ability;
  counterAbility: Ability;
  description: string;
}

/** Tier 0 (Untrained) through Tier 8 (Legendary). */
export const TIER_LABELS: Record<number, string> = {
  0: "Untrained",
  1: "Novice",
  2: "Apprentice",
  3: "Journeyman",
  4: "Adept",
  5: "Expert",
  6: "Master",
  7: "Grandmaster",
  8: "Legendary",
};

/** XP required to advance FROM the given tier to the next one. */
export const XP_THRESHOLDS: Record<number, number> = {
  0: 50,
  1: 120,
  2: 220,
  3: 360,
  4: 550,
  5: 800,
  6: 1100,
  7: 1500,
};

// ---------------------------------------------------------------------------
// Skill definitions
// ---------------------------------------------------------------------------

export const ALL_SKILLS: SkillDefinition[] = [
  // ── COMBAT ──────────────────────────────────────────────────────────────
  {
    id: "martial_arts",
    name: "Martial Arts",
    category: "combat",
    baseAbility: "dexterity",
    counterAbility: "dexterity",
    description: "Unarmed fighting techniques including strikes, grapples, and throws.",
  },
  {
    id: "blade_mastery",
    name: "Blade Mastery",
    category: "combat",
    baseAbility: "dexterity",
    counterAbility: "dexterity",
    description: "Proficiency with swords, daggers, and other bladed weapons.",
  },
  {
    id: "heavy_weapons",
    name: "Heavy Weapons",
    category: "combat",
    baseAbility: "strength",
    counterAbility: "constitution",
    description: "Mastery of axes, maces, hammers, and other heavy armaments.",
  },
  {
    id: "archery",
    name: "Archery",
    category: "combat",
    baseAbility: "dexterity",
    counterAbility: "dexterity",
    description: "Skill with bows, crossbows, and ranged weaponry.",
  },
  {
    id: "shield_craft",
    name: "Shield Craft",
    category: "combat",
    baseAbility: "strength",
    counterAbility: "strength",
    description: "Defensive techniques using shields and blocking.",
  },
  {
    id: "dirty_fighting",
    name: "Dirty Fighting",
    category: "combat",
    baseAbility: "dexterity",
    counterAbility: "wisdom",
    description: "Underhanded combat tactics — feints, trips, and cheap shots.",
  },

  // ── MAGIC ───────────────────────────────────────────────────────────────
  {
    id: "fire_magic",
    name: "Fire Magic",
    category: "magic",
    baseAbility: "intelligence",
    counterAbility: "constitution",
    description: "Command over flame and heat, from sparks to infernos.",
  },
  {
    id: "ice_magic",
    name: "Ice Magic",
    category: "magic",
    baseAbility: "intelligence",
    counterAbility: "constitution",
    description: "Manipulation of cold, frost, and ice.",
  },
  {
    id: "healing_magic",
    name: "Healing Magic",
    category: "magic",
    baseAbility: "wisdom",
    counterAbility: "wisdom",
    description: "Restorative spells that mend wounds and cure ailments.",
  },
  {
    id: "enchantment",
    name: "Enchantment",
    category: "magic",
    baseAbility: "charisma",
    counterAbility: "wisdom",
    description: "Magical influence over minds — charm, compulsion, and suggestion.",
  },
  {
    id: "shadow_magic",
    name: "Shadow Magic",
    category: "magic",
    baseAbility: "intelligence",
    counterAbility: "wisdom",
    description: "Dark arts drawing power from shadow and darkness.",
  },
  {
    id: "divine_magic",
    name: "Divine Magic",
    category: "magic",
    baseAbility: "wisdom",
    counterAbility: "charisma",
    description: "Holy power channelled through faith and devotion.",
  },

  // ── SOCIAL ──────────────────────────────────────────────────────────────
  {
    id: "persuasion",
    name: "Persuasion",
    category: "social",
    baseAbility: "charisma",
    counterAbility: "wisdom",
    description: "Convincing others through reason, charm, or rhetoric.",
  },
  {
    id: "intimidation",
    name: "Intimidation",
    category: "social",
    baseAbility: "charisma",
    counterAbility: "wisdom",
    description: "Coercion through threats, presence, or displays of power.",
  },
  {
    id: "deception",
    name: "Deception",
    category: "social",
    baseAbility: "charisma",
    counterAbility: "wisdom",
    description: "Lying, bluffing, and misdirection.",
  },
  {
    id: "seduction",
    name: "Seduction",
    category: "social",
    baseAbility: "charisma",
    counterAbility: "wisdom",
    description: "The art of allure, flirtation, and romantic persuasion.",
  },

  // ── INTIMATE ────────────────────────────────────────────────────────────
  {
    id: "rope_arts",
    name: "Rope Arts",
    category: "intimate",
    baseAbility: "dexterity",
    counterAbility: "strength",
    description: "Bondage techniques — knots, ties, and restraint patterns.",
  },
  {
    id: "impact_technique",
    name: "Impact Technique",
    category: "intimate",
    baseAbility: "dexterity",
    counterAbility: "constitution",
    description: "Controlled striking for sensation — spanking, flogging, and more.",
  },
  {
    id: "sensation_craft",
    name: "Sensation Craft",
    category: "intimate",
    baseAbility: "wisdom",
    counterAbility: "constitution",
    description: "Mastery of sensory stimulation — temperature, texture, and touch.",
  },
  {
    id: "domination",
    name: "Domination",
    category: "intimate",
    baseAbility: "charisma",
    counterAbility: "wisdom",
    description: "The art of command, control, and psychological dominance.",
  },
  {
    id: "submission_arts",
    name: "Submission Arts",
    category: "intimate",
    baseAbility: "wisdom",
    counterAbility: "charisma",
    description: "Graceful yielding, service, and the art of surrender.",
  },
  {
    id: "aftercare",
    name: "Aftercare",
    category: "intimate",
    baseAbility: "wisdom",
    counterAbility: "wisdom",
    description: "Emotional and physical recovery techniques after intense scenes.",
  },
  {
    id: "edge_play",
    name: "Edge Play",
    category: "intimate",
    baseAbility: "wisdom",
    counterAbility: "constitution",
    description: "Advanced techniques that push boundaries safely — breath play, knife play, etc.",
  },

  // ── UTILITY ─────────────────────────────────────────────────────────────
  {
    id: "stealth",
    name: "Stealth",
    category: "utility",
    baseAbility: "dexterity",
    counterAbility: "wisdom",
    description: "Moving unseen and unheard.",
  },
  {
    id: "lockpicking",
    name: "Lockpicking",
    category: "utility",
    baseAbility: "dexterity",
    counterAbility: "dexterity",
    description: "Bypassing locks, traps, and mechanical security.",
  },
  {
    id: "perception",
    name: "Perception",
    category: "utility",
    baseAbility: "wisdom",
    counterAbility: "dexterity",
    description: "Keen senses — noticing hidden things, reading body language.",
  },
  {
    id: "herbalism",
    name: "Herbalism",
    category: "utility",
    baseAbility: "intelligence",
    counterAbility: "intelligence",
    description: "Knowledge of plants, potions, and natural remedies.",
  },
  {
    id: "negotiation",
    name: "Negotiation",
    category: "utility",
    baseAbility: "charisma",
    counterAbility: "charisma",
    description: "Haggling, deal-making, and commercial persuasion.",
  },
];

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

const skillIndex = new Map<string, SkillDefinition>(
  ALL_SKILLS.map((s) => [s.id, s]),
);

export function getSkillById(id: string): SkillDefinition | undefined {
  return skillIndex.get(id);
}

export function getSkillsByCategory(category: SkillCategory): SkillDefinition[] {
  return ALL_SKILLS.filter((s) => s.category === category);
}
