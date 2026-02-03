/**
 * D&D 5e Conditions System
 *
 * All 14 standard conditions with mechanical effects, plus custom conditions
 * for CC categories, DoT, vulnerability, and combat mechanics.
 */

export interface ConditionEffect {
  attackDisadvantage?: boolean;
  attackAdvantage?: boolean;
  attackedAdvantage?: boolean;
  attackedDisadvantage?: boolean;
  cannotAct?: boolean;
  cannotMove?: boolean;
  speedZero?: boolean;
  autoFailStrDexSaves?: boolean;
  autoFailHearingChecks?: boolean;
  abilityCheckDisadvantage?: boolean;
  dexSaveDisadvantage?: boolean;
  critWithin5ft?: boolean;
  resistanceAll?: boolean;
  cannotApproachSource?: boolean;
  cannotAttackCharmer?: boolean;
  meleeAttackedAdvantage?: boolean;
  rangedAttackedDisadvantage?: boolean;
  // New fields for CC/DoT/vulnerability system
  dotDamage?: number;
  speedMultiplier?: number;
  acModifier?: number;
  cannotCast?: boolean;
  damageVulnerability?: string[];
  breakOnDamage?: boolean;
  outgoingDamageMultiplier?: number;
}

export interface ConditionDefinition {
  name: string;
  description: string;
  effects: ConditionEffect;
}

// ---------------------------------------------------------------------------
// CC Categories (WoW-style DR grouping)
// ---------------------------------------------------------------------------

export type CcCategory =
  | "stun"
  | "incapacitate"
  | "fear"
  | "root"
  | "slow"
  | "silence"
  | "disorient";

export const CC_CATEGORIES: Record<string, CcCategory> = {
  stunned: "stun",
  paralyzed: "stun",
  charmed: "incapacitate",
  unconscious: "incapacitate",
  dominated: "incapacitate",
  frightened: "fear",
  shaken: "fear",
  grappled: "root",
  restrained: "root",
  pinned: "root",
  slowed: "slow",
  chilled: "slow",
  silenced: "silence",
  confused: "silence",
  blinded: "disorient",
  distracted: "disorient",
};

// ---------------------------------------------------------------------------
// Condition definitions
// ---------------------------------------------------------------------------

export const CONDITIONS: Record<string, ConditionDefinition> = {
  blinded: {
    name: "Blinded",
    description:
      "Can't see. Auto-fails checks requiring sight. Attack rolls have disadvantage; attacks against have advantage.",
    effects: {
      attackDisadvantage: true,
      attackedAdvantage: true,
    },
  },
  charmed: {
    name: "Charmed",
    description:
      "Can't attack the charmer or target them with harmful abilities. Charmer has advantage on social checks.",
    effects: {
      cannotAttackCharmer: true,
      breakOnDamage: true,
    },
  },
  deafened: {
    name: "Deafened",
    description: "Can't hear. Auto-fails checks requiring hearing.",
    effects: {
      autoFailHearingChecks: true,
    },
  },
  frightened: {
    name: "Frightened",
    description:
      "Disadvantage on ability checks and attack rolls while source of fear is in line of sight. Can't willingly move closer to the source.",
    effects: {
      attackDisadvantage: true,
      abilityCheckDisadvantage: true,
      cannotApproachSource: true,
    },
  },
  grappled: {
    name: "Grappled",
    description: "Speed becomes 0. Ends if grappler is incapacitated or moved out of reach.",
    effects: {
      speedZero: true,
    },
  },
  incapacitated: {
    name: "Incapacitated",
    description: "Can't take actions or reactions.",
    effects: {
      cannotAct: true,
    },
  },
  invisible: {
    name: "Invisible",
    description:
      "Impossible to see without special sense. Attack rolls have advantage; attacks against have disadvantage.",
    effects: {
      attackAdvantage: true,
      attackedDisadvantage: true,
    },
  },
  paralyzed: {
    name: "Paralyzed",
    description:
      "Incapacitated, can't move or speak. Auto-fails STR/DEX saves. Attacks have advantage; hits within 5 ft are crits.",
    effects: {
      cannotAct: true,
      cannotMove: true,
      autoFailStrDexSaves: true,
      attackedAdvantage: true,
      critWithin5ft: true,
    },
  },
  petrified: {
    name: "Petrified",
    description:
      "Transformed to stone. Incapacitated, can't move or speak. Resistance to all damage. Auto-fails STR/DEX saves.",
    effects: {
      cannotAct: true,
      cannotMove: true,
      autoFailStrDexSaves: true,
      attackedAdvantage: true,
      critWithin5ft: true,
      resistanceAll: true,
    },
  },
  poisoned: {
    name: "Poisoned",
    description: "Disadvantage on attack rolls and ability checks.",
    effects: {
      attackDisadvantage: true,
      abilityCheckDisadvantage: true,
    },
  },
  prone: {
    name: "Prone",
    description:
      "Disadvantage on attack rolls. Melee attacks within 5 ft have advantage; ranged attacks have disadvantage.",
    effects: {
      attackDisadvantage: true,
      meleeAttackedAdvantage: true,
      rangedAttackedDisadvantage: true,
    },
  },
  restrained: {
    name: "Restrained",
    description:
      "Speed 0. Attack rolls have disadvantage; attacks against have advantage. DEX saves have disadvantage.",
    effects: {
      speedZero: true,
      attackDisadvantage: true,
      attackedAdvantage: true,
      dexSaveDisadvantage: true,
    },
  },
  stunned: {
    name: "Stunned",
    description:
      "Incapacitated, can't move, speak only falteringly. Auto-fails STR/DEX saves. Attacks against have advantage.",
    effects: {
      cannotAct: true,
      autoFailStrDexSaves: true,
      attackedAdvantage: true,
    },
  },
  unconscious: {
    name: "Unconscious",
    description:
      "Incapacitated, can't move or speak, unaware. Falls prone. Auto-fails STR/DEX saves. Attacks have advantage; hits within 5 ft are crits.",
    effects: {
      cannotAct: true,
      cannotMove: true,
      autoFailStrDexSaves: true,
      attackedAdvantage: true,
      critWithin5ft: true,
      breakOnDamage: true,
    },
  },
  dodging: {
    name: "Dodging",
    description:
      "Using the Dodge action. Attack rolls against have disadvantage. Advantage on DEX saving throws.",
    effects: {
      attackedDisadvantage: true,
    },
  },
  reckless: {
    name: "Reckless",
    description:
      "Used Reckless Attack. Attacks against you have advantage until your next turn.",
    effects: {
      attackedAdvantage: true,
    },
  },
  disengaged: {
    name: "Disengaged",
    description:
      "Used the Disengage action. Movement doesn't provoke opportunity attacks this turn.",
    effects: {},
  },
  dead: {
    name: "Dead",
    description:
      "The creature has died. It cannot take any actions, move, or be revived without powerful magic.",
    effects: {
      cannotAct: true,
      cannotMove: true,
    },
  },

  // ── NEW CONDITIONS ─────────────────────────────────────────────────────

  shaken: {
    name: "Shaken",
    description: "Unnerved. Disadvantage on attack rolls from fear.",
    effects: {
      attackDisadvantage: true,
      cannotApproachSource: true,
    },
  },
  weakened: {
    name: "Weakened",
    description: "Sapped of strength. Outgoing damage reduced by 50%.",
    effects: {
      outgoingDamageMultiplier: 0.5,
    },
  },
  burning: {
    name: "Burning",
    description: "On fire. Takes 3 damage at start of turn. Vulnerable to fire magic.",
    effects: {
      dotDamage: 3,
      damageVulnerability: ["fire_magic"],
    },
  },
  confused: {
    name: "Confused",
    description: "Mind is scrambled. Cannot cast spells or use techniques.",
    effects: {
      cannotCast: true,
      abilityCheckDisadvantage: true,
    },
  },
  chilled: {
    name: "Chilled",
    description: "Slowed by cold. Half movement speed. Vulnerable to ice magic.",
    effects: {
      speedMultiplier: 0.5,
      damageVulnerability: ["ice_magic"],
    },
  },
  slowed: {
    name: "Slowed",
    description: "Movement is impaired. Half movement speed.",
    effects: {
      speedMultiplier: 0.5,
    },
  },
  armor_broken: {
    name: "Armor Broken",
    description: "Armor is damaged. AC reduced by 3. Vulnerable to heavy weapons and archery.",
    effects: {
      acModifier: -3,
      damageVulnerability: ["heavy_weapons", "archery"],
    },
  },
  pinned: {
    name: "Pinned",
    description: "Pinned in place. Speed 0. Vulnerable to archery.",
    effects: {
      speedZero: true,
      damageVulnerability: ["archery"],
    },
  },
  distracted: {
    name: "Distracted",
    description: "Attention diverted. Disadvantage on attacks and ability checks.",
    effects: {
      attackDisadvantage: true,
      abilityCheckDisadvantage: true,
      attackedAdvantage: true,
    },
  },
  freed: {
    name: "Freed",
    description: "Released from restraints.",
    effects: {},
  },
  silenced: {
    name: "Silenced",
    description: "Cannot speak or cast spells with verbal components.",
    effects: {
      cannotCast: true,
    },
  },
  bleeding: {
    name: "Bleeding",
    description: "Losing blood. Takes 2 damage at start of turn. Vulnerable to blades and dirty fighting.",
    effects: {
      dotDamage: 2,
      damageVulnerability: ["blade_mastery", "dirty_fighting"],
    },
  },
  burning_intense: {
    name: "Burning (Intense)",
    description: "Engulfed in intense flames. Takes 5 damage at start of turn.",
    effects: {
      dotDamage: 5,
      damageVulnerability: ["fire_magic"],
    },
  },
  staggered: {
    name: "Staggered",
    description: "Off-balance. Disadvantage on next attack roll.",
    effects: {
      attackDisadvantage: true,
    },
  },
  dominated: {
    name: "Dominated",
    description: "Under total mental control. Cannot act independently. Breaks on damage.",
    effects: {
      cannotAct: true,
      breakOnDamage: true,
    },
  },
  doomed: {
    name: "Doomed",
    description: "Marked for death. Takes 5 damage at start of turn from internal vibrations.",
    effects: {
      dotDamage: 5,
    },
  },
  cc_immune: {
    name: "CC Immune",
    description: "Temporarily immune to crowd control effects in a specific category.",
    effects: {},
  },
};

// ============ HELPERS ============

/**
 * Get the condition definition by name (case-insensitive).
 */
export function getCondition(name: string): ConditionDefinition | undefined {
  return CONDITIONS[name.toLowerCase()];
}

/**
 * Determine if an attacker has advantage based on their conditions and the target's conditions.
 * Returns: 1 = advantage, -1 = disadvantage, 0 = neither.
 * If both advantage and disadvantage apply, they cancel out (D&D 5e rules).
 */
export function resolveAttackAdvantage(
  attackerConditions: string[],
  targetConditions: string[],
  isMelee: boolean,
  isWithin5ft: boolean,
): number {
  let advantage = 0;
  let disadvantage = 0;

  // Attacker's own conditions
  for (const name of attackerConditions) {
    const cond = getCondition(name);
    if (!cond) continue;
    if (cond.effects.attackAdvantage) advantage++;
    if (cond.effects.attackDisadvantage) disadvantage++;
  }

  // Target's conditions that affect attacks against them
  for (const name of targetConditions) {
    const cond = getCondition(name);
    if (!cond) continue;
    if (cond.effects.attackedAdvantage) advantage++;
    if (cond.effects.attackedDisadvantage) disadvantage++;
    // Prone special case
    if (cond.effects.meleeAttackedAdvantage && isMelee && isWithin5ft) advantage++;
    if (cond.effects.rangedAttackedDisadvantage && !isMelee) disadvantage++;
  }

  if (advantage > 0 && disadvantage > 0) return 0; // cancel out
  if (advantage > 0) return 1;
  if (disadvantage > 0) return -1;
  return 0;
}

/**
 * Check if a combatant can act (take actions/reactions).
 */
export function canAct(conditions: string[]): boolean {
  for (const name of conditions) {
    const cond = getCondition(name);
    if (cond?.effects.cannotAct) return false;
  }
  return true;
}

/**
 * Check if a combatant can move.
 */
export function canMove(conditions: string[]): boolean {
  for (const name of conditions) {
    const cond = getCondition(name);
    if (cond?.effects.cannotMove || cond?.effects.speedZero) return false;
  }
  return true;
}

/**
 * Check if a combatant can cast spells/use techniques.
 */
export function canCast(conditions: string[]): boolean {
  for (const name of conditions) {
    const cond = getCondition(name);
    if (cond?.effects.cannotCast) return false;
    if (cond?.effects.cannotAct) return false;
  }
  return true;
}

/**
 * Get effective speed considering conditions (speedZero and speedMultiplier).
 */
export function getEffectiveSpeed(baseSpeed: number, conditions: string[]): number {
  let multiplier = 1;
  for (const name of conditions) {
    const cond = getCondition(name);
    if (cond?.effects.speedZero) return 0;
    if (cond?.effects.speedMultiplier !== undefined) {
      multiplier = Math.min(multiplier, cond.effects.speedMultiplier);
    }
  }
  return Math.floor(baseSpeed * multiplier);
}

/**
 * Get total DoT damage from all conditions.
 */
export function getDotDamage(conditions: string[]): number {
  let total = 0;
  for (const name of conditions) {
    const cond = getCondition(name);
    if (cond?.effects.dotDamage) {
      total += cond.effects.dotDamage;
    }
  }
  return total;
}

/**
 * Get damage vulnerability multiplier for a given skill.
 * Returns 1.5 if any condition grants vulnerability to the skill, 1.0 otherwise.
 */
export function getDamageVulnerabilityMultiplier(
  conditions: string[],
  skillId: string,
): number {
  for (const name of conditions) {
    const cond = getCondition(name);
    if (cond?.effects.damageVulnerability?.includes(skillId)) {
      return 1.5;
    }
  }
  return 1.0;
}

/**
 * Get total AC modifier from conditions.
 */
export function getAcModifier(conditions: string[]): number {
  let total = 0;
  for (const name of conditions) {
    const cond = getCondition(name);
    if (cond?.effects.acModifier) {
      total += cond.effects.acModifier;
    }
  }
  return total;
}

/**
 * Get the outgoing damage multiplier for an attacker's conditions.
 * Returns the lowest multiplier (most penalizing).
 */
export function getOutgoingDamageMultiplier(conditions: string[]): number {
  let multiplier = 1.0;
  for (const name of conditions) {
    const cond = getCondition(name);
    if (cond?.effects.outgoingDamageMultiplier !== undefined) {
      multiplier = Math.min(multiplier, cond.effects.outgoingDamageMultiplier);
    }
  }
  return multiplier;
}

/**
 * Remove conditions that break on damage. Returns the filtered list.
 */
export function removeConditionsOnDamage(
  conditions: ActiveCondition[],
): ActiveCondition[] {
  return conditions.filter((c) => {
    const def = getCondition(c.name);
    return !def?.effects.breakOnDamage;
  });
}

/**
 * Check if a hit within 5 ft should auto-crit (paralyzed/unconscious).
 */
export function isAutoCrit(targetConditions: string[], isWithin5ft: boolean): boolean {
  if (!isWithin5ft) return false;
  for (const name of targetConditions) {
    const cond = getCondition(name);
    if (cond?.effects.critWithin5ft) return true;
  }
  return false;
}

/**
 * Check if target has resistance to all damage (petrified).
 */
export function hasResistanceAll(conditions: string[]): boolean {
  for (const name of conditions) {
    const cond = getCondition(name);
    if (cond?.effects.resistanceAll) return true;
  }
  return false;
}

export interface ActiveCondition {
  name: string;
  duration?: number; // turns remaining
  expiresOn?: "start" | "end"; // when to check expiration
  source?: string;
}

/**
 * Process condition durations at turn start or end.
 * Returns the updated list of conditions (expired ones removed).
 */
export function processConditionDurations(
  conditions: ActiveCondition[],
  timing: "start" | "end",
): ActiveCondition[] {
  return conditions
    .map((c) => {
      if (c.duration === undefined) return c; // permanent
      if (c.expiresOn && c.expiresOn !== timing) return c; // not this timing
      const remaining = c.duration - 1;
      if (remaining <= 0) return null; // expired
      return { ...c, duration: remaining };
    })
    .filter((c): c is ActiveCondition => c !== null);
}

/**
 * Calculate concentration save DC based on damage taken.
 * DC = max(10, floor(damage / 2))
 */
export function concentrationSaveDC(damage: number): number {
  return Math.max(10, Math.floor(damage / 2));
}

// ---------------------------------------------------------------------------
// Diminishing Returns System
// ---------------------------------------------------------------------------

export const DR_RESET_TURNS = 3;

export interface DrEntry {
  count: number;
  lastAppliedRound: number;
}

export type DrTracker = Record<string, DrEntry>;

/**
 * Apply diminishing returns to a CC duration.
 *
 * Returns the effective duration after DR, and the updated DR tracker.
 * - 1st CC in category: 100% duration
 * - 2nd CC: 50% (min 1)
 * - 3rd CC: 25% (min 1)
 * - 4th+: immune (0 duration)
 *
 * DR resets after DR_RESET_TURNS without CC in that category.
 */
export function applyDiminishingReturns(
  baseDuration: number,
  conditionName: string,
  tracker: DrTracker,
  currentRound: number,
): { duration: number; updatedTracker: DrTracker } {
  const category = CC_CATEGORIES[conditionName];

  // Non-CC conditions bypass DR entirely
  if (!category) {
    return { duration: baseDuration, updatedTracker: tracker };
  }

  const updatedTracker = { ...tracker };
  const entry = updatedTracker[category];

  // Check if DR should reset (3+ turns since last application)
  if (entry && currentRound - entry.lastAppliedRound >= DR_RESET_TURNS) {
    delete updatedTracker[category];
  }

  const currentEntry = updatedTracker[category];
  const count = currentEntry ? currentEntry.count : 0;

  let effectiveDuration: number;
  if (count === 0) {
    effectiveDuration = baseDuration; // 100%
  } else if (count === 1) {
    effectiveDuration = Math.max(1, Math.floor(baseDuration * 0.5)); // 50%
  } else if (count === 2) {
    effectiveDuration = Math.max(1, Math.floor(baseDuration * 0.25)); // 25%
  } else {
    effectiveDuration = 0; // immune
  }

  // Update tracker
  updatedTracker[category] = {
    count: count + 1,
    lastAppliedRound: currentRound,
  };

  return { duration: effectiveDuration, updatedTracker };
}
