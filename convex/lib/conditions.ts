/**
 * D&D 5e Conditions System
 *
 * All 14 standard conditions with mechanical effects.
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
}

export interface ConditionDefinition {
  name: string;
  description: string;
  effects: ConditionEffect;
}

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
    },
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
 * Get effective speed considering conditions.
 */
export function getEffectiveSpeed(baseSpeed: number, conditions: string[]): number {
  for (const name of conditions) {
    const cond = getCondition(name);
    if (cond?.effects.speedZero) return 0;
  }
  return baseSpeed;
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
