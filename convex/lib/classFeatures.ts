/**
 * D&D 5e Class Features System
 *
 * Class-specific combat abilities keyed by class and level.
 */

export interface ClassFeature {
  id: string;
  name: string;
  level: number;
  description: string;
  combatEffect?: CombatEffect;
  resource?: ResourceDefinition;
}

export interface CcBreakEffect {
  breaksCategories: string[];
  actionCost: "reaction" | "bonus_action" | "free" | "passive";
  cooldownRounds: number;
  resourceCost?: { resource: string; amount: number };
  grantsStealthOnUse?: boolean;
  requiresRaging?: boolean;
}

export interface CombatEffect {
  extraAttacks?: number; // number of additional attacks per Attack action
  sneakAttackDice?: number; // number of d6 for sneak attack
  rageDamageBonus?: number; // flat bonus to melee damage while raging
  rageResistance?: boolean; // resistance to bludgeoning/piercing/slashing while raging
  unarmoredDefenseAbility?: "constitution" | "wisdom"; // AC = 10 + DEX + this ability
  martialArtsDie?: string; // e.g. "1d6" for monk
  actionSurge?: boolean; // extra action once per rest
  secondWind?: boolean; // bonus action heal
  ccBreak?: CcBreakEffect; // CC break ability
}

export interface ResourceDefinition {
  name: string;
  maxAtLevel: (level: number) => number;
  rechargesOn: "short_rest" | "long_rest";
}

// ============ CLASS FEATURE MAPS ============

const FIGHTER_FEATURES: ClassFeature[] = [
  {
    id: "fighting_style",
    name: "Fighting Style",
    level: 1,
    description: "Choose a fighting style specialization.",
  },
  {
    id: "second_wind",
    name: "Second Wind",
    level: 1,
    description: "Bonus action: regain 1d10 + fighter level HP. Once per short rest.",
    combatEffect: { secondWind: true },
    resource: {
      name: "secondWind",
      maxAtLevel: () => 1,
      rechargesOn: "short_rest",
    },
  },
  {
    id: "action_surge",
    name: "Action Surge",
    level: 2,
    description: "Take one additional action on your turn. Once per short rest (twice at 17).",
    combatEffect: { actionSurge: true },
    resource: {
      name: "actionSurge",
      maxAtLevel: (level) => (level >= 17 ? 2 : 1),
      rechargesOn: "short_rest",
    },
  },
  {
    id: "extra_attack",
    name: "Extra Attack",
    level: 5,
    description: "Attack twice when you take the Attack action.",
    combatEffect: { extraAttacks: 1 },
  },
  {
    id: "extra_attack_2",
    name: "Extra Attack (2)",
    level: 11,
    description: "Attack three times when you take the Attack action.",
    combatEffect: { extraAttacks: 2 },
  },
  {
    id: "extra_attack_3",
    name: "Extra Attack (3)",
    level: 20,
    description: "Attack four times when you take the Attack action.",
    combatEffect: { extraAttacks: 3 },
  },
  {
    id: "indomitable_will",
    name: "Indomitable Will",
    level: 9,
    description: "Use reaction to break free from stun, fear, or incapacitate effects. Recharges after 3 rounds.",
    combatEffect: {
      ccBreak: {
        breaksCategories: ["stun", "fear", "incapacitate"],
        actionCost: "reaction",
        cooldownRounds: 3,
      },
    },
  },
];

const ROGUE_FEATURES: ClassFeature[] = [
  {
    id: "sneak_attack",
    name: "Sneak Attack",
    level: 1,
    description: "Once per turn, deal extra damage when you have advantage or an ally is within 5 ft of target.",
    combatEffect: { sneakAttackDice: 1 },
  },
  {
    id: "cunning_action",
    name: "Cunning Action",
    level: 2,
    description: "Use bonus action to Dash, Disengage, or Hide.",
  },
  {
    id: "uncanny_dodge",
    name: "Uncanny Dodge",
    level: 5,
    description: "Use reaction to halve damage from an attack you can see.",
  },
  {
    id: "evasion",
    name: "Evasion",
    level: 7,
    description: "On a successful DEX save, take no damage instead of half.",
  },
  {
    id: "slip_free",
    name: "Slip Free",
    level: 5,
    description: "Use bonus action to escape root, slow, or stun effects and gain stealth. Recharges after 2 rounds.",
    combatEffect: {
      ccBreak: {
        breaksCategories: ["root", "slow", "stun"],
        actionCost: "bonus_action",
        cooldownRounds: 2,
        grantsStealthOnUse: true,
      },
    },
  },
];

const BARBARIAN_FEATURES: ClassFeature[] = [
  {
    id: "rage",
    name: "Rage",
    level: 1,
    description: "Bonus action: gain advantage on STR checks/saves, bonus melee damage, resistance to physical damage.",
    combatEffect: { rageDamageBonus: 2, rageResistance: true },
    resource: {
      name: "rage",
      maxAtLevel: (level) => {
        if (level >= 20) return -1; // unlimited
        if (level >= 17) return 6;
        if (level >= 12) return 5;
        if (level >= 6) return 4;
        if (level >= 3) return 3;
        return 2;
      },
      rechargesOn: "long_rest",
    },
  },
  {
    id: "unarmored_defense_barbarian",
    name: "Unarmored Defense",
    level: 1,
    description: "AC = 10 + DEX modifier + CON modifier when not wearing armor.",
    combatEffect: { unarmoredDefenseAbility: "constitution" },
  },
  {
    id: "reckless_attack",
    name: "Reckless Attack",
    level: 2,
    description: "Gain advantage on melee STR attacks, but attacks against you have advantage until next turn.",
  },
  {
    id: "extra_attack_barbarian",
    name: "Extra Attack",
    level: 5,
    description: "Attack twice when you take the Attack action.",
    combatEffect: { extraAttacks: 1 },
  },
  {
    id: "brutal_critical",
    name: "Brutal Critical",
    level: 9,
    description: "Roll one additional weapon damage die on a critical hit.",
  },
  {
    id: "rage_break",
    name: "Rage Break",
    level: 6,
    description: "While raging, automatically break free from stun, fear, and incapacitate effects at the start of your turn.",
    combatEffect: {
      ccBreak: {
        breaksCategories: ["stun", "fear", "incapacitate"],
        actionCost: "passive",
        cooldownRounds: 0,
        requiresRaging: true,
      },
    },
  },
];

const MONK_FEATURES: ClassFeature[] = [
  {
    id: "unarmored_defense_monk",
    name: "Unarmored Defense",
    level: 1,
    description: "AC = 10 + DEX modifier + WIS modifier when not wearing armor.",
    combatEffect: { unarmoredDefenseAbility: "wisdom" },
  },
  {
    id: "martial_arts",
    name: "Martial Arts",
    level: 1,
    description: "Use DEX for unarmed strikes. Bonus action unarmed strike after Attack action.",
    combatEffect: { martialArtsDie: "1d4" },
  },
  {
    id: "ki",
    name: "Ki",
    level: 2,
    description: "Spend ki points for Flurry of Blows, Patient Defense, or Step of the Wind.",
    resource: {
      name: "ki",
      maxAtLevel: (level) => level,
      rechargesOn: "short_rest",
    },
  },
  {
    id: "extra_attack_monk",
    name: "Extra Attack",
    level: 5,
    description: "Attack twice when you take the Attack action.",
    combatEffect: { extraAttacks: 1 },
  },
  {
    id: "stunning_strike",
    name: "Stunning Strike",
    level: 5,
    description: "Spend 1 ki: target must succeed on CON save or be stunned until end of your next turn.",
  },
];

const PALADIN_FEATURES: ClassFeature[] = [
  {
    id: "divine_sense",
    name: "Divine Sense",
    level: 1,
    description: "Detect celestials, fiends, and undead within 60 ft.",
  },
  {
    id: "lay_on_hands",
    name: "Lay on Hands",
    level: 1,
    description: "Heal a pool of HP equal to paladin level × 5.",
    resource: {
      name: "layOnHands",
      maxAtLevel: (level) => level * 5,
      rechargesOn: "long_rest",
    },
  },
  {
    id: "divine_smite",
    name: "Divine Smite",
    level: 2,
    description: "Expend a spell slot to deal extra 2d8 radiant damage on a melee hit (+1d8 per slot above 1st).",
  },
  {
    id: "extra_attack_paladin",
    name: "Extra Attack",
    level: 5,
    description: "Attack twice when you take the Attack action.",
    combatEffect: { extraAttacks: 1 },
  },
  {
    id: "aura_of_protection",
    name: "Aura of Protection",
    level: 6,
    description: "You and allies within 10 ft gain bonus to saving throws equal to CHA modifier.",
  },
];

const RANGER_FEATURES: ClassFeature[] = [
  {
    id: "favored_enemy",
    name: "Favored Enemy",
    level: 1,
    description: "Advantage on survival checks to track and INT checks to recall info about chosen enemy types.",
  },
  {
    id: "fighting_style_ranger",
    name: "Fighting Style",
    level: 2,
    description: "Choose a fighting style specialization.",
  },
  {
    id: "extra_attack_ranger",
    name: "Extra Attack",
    level: 5,
    description: "Attack twice when you take the Attack action.",
    combatEffect: { extraAttacks: 1 },
  },
];

// Map class names to feature lists
const CLASS_FEATURES: Record<string, ClassFeature[]> = {
  fighter: FIGHTER_FEATURES,
  warrior: FIGHTER_FEATURES, // alias
  rogue: ROGUE_FEATURES,
  barbarian: BARBARIAN_FEATURES,
  monk: MONK_FEATURES,
  paladin: PALADIN_FEATURES,
  ranger: RANGER_FEATURES,
};

// ============ PUBLIC API ============

/**
 * Get all features available to a class at a given level.
 */
export function getFeaturesForClassAtLevel(
  characterClass: string,
  level: number,
): ClassFeature[] {
  const cls = characterClass.toLowerCase();
  const features = CLASS_FEATURES[cls];
  if (!features) return [];
  return features.filter((f) => f.level <= level);
}

/**
 * Get the number of extra attacks for a class at a given level.
 * Returns 0 if no extra attacks.
 */
export function getExtraAttacks(characterClass: string, level: number): number {
  const features = getFeaturesForClassAtLevel(characterClass, level);
  let max = 0;
  for (const f of features) {
    if (f.combatEffect?.extraAttacks && f.combatEffect.extraAttacks > max) {
      max = f.combatEffect.extraAttacks;
    }
  }
  return max;
}

/**
 * Get sneak attack dice count for a rogue at a given level.
 * Scales at odd levels: 1d6 at 1, 2d6 at 3, 3d6 at 5, etc.
 */
export function getSneakAttackDice(level: number): number {
  return Math.ceil(level / 2);
}

/**
 * Get rage damage bonus for a barbarian at a given level.
 */
export function getRageDamageBonus(level: number): number {
  if (level >= 16) return 4;
  if (level >= 9) return 3;
  return 2;
}

/**
 * Get the martial arts die for a monk at a given level.
 */
export function getMartialArtsDie(level: number): string {
  if (level >= 17) return "1d10";
  if (level >= 11) return "1d8";
  if (level >= 5) return "1d6";
  return "1d4";
}

/**
 * Initialize class resources for a character.
 * Returns a map of resource name → { max, current }.
 */
export function initializeClassResources(
  characterClass: string,
  level: number,
): Record<string, { max: number; current: number }> {
  const features = getFeaturesForClassAtLevel(characterClass, level);
  const resources: Record<string, { max: number; current: number }> = {};

  for (const f of features) {
    if (f.resource) {
      const max = f.resource.maxAtLevel(level);
      resources[f.resource.name] = { max, current: max };
    }
  }

  return resources;
}
