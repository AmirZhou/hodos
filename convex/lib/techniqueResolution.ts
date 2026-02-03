/**
 * Deterministic technique resolution engine.
 *
 * No dice rolls — pure power-vs-resistance math.  Actor power is compared
 * against target resistance to derive a Potency level, which then scales
 * the technique's context-specific effects.
 */

import { abilityModifier } from "./stats";
import type { TechniqueEffects, TechniqueContext } from "../data/techniqueCatalog";
import { getDamageVulnerabilityMultiplier } from "./conditions";

// ---------------------------------------------------------------------------
// Potency
// ---------------------------------------------------------------------------

export type Potency =
  | "critical"
  | "overwhelming"
  | "full"
  | "standard"
  | "reduced"
  | "negated"
  | "resisted";

export const POTENCY_MULTIPLIERS: Record<Potency, number> = {
  critical: 2.0,
  overwhelming: 1.5,
  full: 1.0,
  standard: 0.8,
  reduced: 0.5,
  negated: 0,
  resisted: 0,
};

// ---------------------------------------------------------------------------
// Power & Resistance
// ---------------------------------------------------------------------------

/**
 * Calculate the actor's effective power for a technique use.
 *
 * `currentTier` — the actor's current tier in the relevant skill (0-based).
 * `abilityScore` — the raw ability score governing the technique (e.g. DEX 16).
 * `rollBonus`    — the technique's inherent roll bonus.
 */
export function calculateActorPower(
  currentTier: number,
  abilityScore: number,
  rollBonus: number,
): number {
  return currentTier * 3 + abilityModifier(abilityScore) + rollBonus;
}

/**
 * Calculate the target's resistance to an incoming technique.
 *
 * `counterTier`         — the target's tier in the countering skill.
 * `counterAbilityScore` — the raw ability score used to resist.
 */
export function calculateTargetResistance(
  counterTier: number,
  counterAbilityScore: number,
): number {
  return counterTier * 3 + abilityModifier(counterAbilityScore);
}

// ---------------------------------------------------------------------------
// Potency determination
// ---------------------------------------------------------------------------

/**
 * Determine the potency of a technique use given actor power and target
 * resistance.
 *
 * Extreme outliers (critical / resisted) are checked first, then the
 * signed gap (power − resistance) is bucketed into standard tiers.
 */
export function determinePotency(
  actorPower: number,
  targetResistance: number,
): Potency {
  // Extreme: actor vastly outclasses target
  if (actorPower > 2 * targetResistance && targetResistance > 0) {
    return "critical";
  }

  // Extreme: target vastly outclasses actor
  if (targetResistance >= 3 * actorPower && actorPower > 0) {
    return "resisted";
  }

  const gap = actorPower - targetResistance;

  if (gap >= 10) return "overwhelming";
  if (gap >= 5) return "full";
  if (gap >= 0) return "standard";
  if (gap >= -5) return "reduced";
  return "negated";
}

// ---------------------------------------------------------------------------
// Effect calculation
// ---------------------------------------------------------------------------

/**
 * Scale a technique's context-specific effects by the resolved potency.
 *
 * Numeric values are multiplied by the potency multiplier (and rounded
 * toward zero).  Strings and booleans are passed through unchanged
 * unless the potency is negated or resisted, in which case booleans
 * become `false` and strings become empty.
 */
export function calculateEffects<C extends TechniqueContext>(
  effects: TechniqueEffects,
  context: C,
  potency: Potency,
): NonNullable<TechniqueEffects[C]> {
  const contextEffects = effects[context];
  if (!contextEffects) {
    return {} as NonNullable<TechniqueEffects[C]>;
  }

  const multiplier = POTENCY_MULTIPLIERS[potency];
  const isNullified = potency === "negated" || potency === "resisted";

  const result: Record<string, number | string | boolean> = {};

  for (const [key, value] of Object.entries(contextEffects)) {
    if (typeof value === "number") {
      result[key] = multiplier === 0 ? 0 : Math.trunc(value * multiplier);
    } else if (typeof value === "boolean") {
      result[key] = isNullified ? false : value;
    } else if (typeof value === "string") {
      result[key] = isNullified ? "" : value;
    } else {
      result[key] = value;
    }
  }

  return result as NonNullable<TechniqueEffects[C]>;
}

// ---------------------------------------------------------------------------
// CC Duration from Potency
// ---------------------------------------------------------------------------

/**
 * Convert a potency level to a CC duration in turns.
 *
 * | Potency       | Duration |
 * |---------------|----------|
 * | critical      | 3 turns  |
 * | overwhelming  | 2 turns  |
 * | full          | 2 turns  |
 * | standard      | 1 turn   |
 * | reduced       | 1 turn   |
 * | negated       | 0        |
 * | resisted      | 0        |
 */
export function potencyToCcDuration(potency: Potency): number {
  switch (potency) {
    case "critical":
      return 3;
    case "overwhelming":
    case "full":
      return 2;
    case "standard":
    case "reduced":
      return 1;
    case "negated":
    case "resisted":
      return 0;
  }
}

// ---------------------------------------------------------------------------
// Vulnerability Damage Bonus
// ---------------------------------------------------------------------------

/**
 * Apply vulnerability bonus to base damage.
 *
 * If the target has any condition granting vulnerability to the technique's
 * skill, the damage is multiplied by 1.5 (50% bonus).
 */
export function applyVulnerabilityBonus(
  baseDamage: number,
  targetConditionNames: string[],
  skillId: string,
): number {
  const multiplier = getDamageVulnerabilityMultiplier(targetConditionNames, skillId);
  return Math.floor(baseDamage * multiplier);
}

// ---------------------------------------------------------------------------
// Combo Chain Bonus
// ---------------------------------------------------------------------------

/** Maximum number of rounds a combo chain remains valid. */
export const COMBO_WINDOW = 2;

/**
 * Combo chain definitions: technique → valid setup techniques + bonus damage.
 */
export const COMBO_CHAINS: Record<string, { comboFrom: string[]; comboBonusDamage: number }> = {
  pressure_point: { comboFrom: ["grapple_hold"], comboBonusDamage: 3 },
  whirlwind_slash: { comboFrom: ["quick_draw"], comboBonusDamage: 4 },
  fireball: { comboFrom: ["fire_bolt"], comboBonusDamage: 5 },
  frozen_ground: { comboFrom: ["frost_bolt"], comboBonusDamage: 3 },
  pocket_sand: { comboFrom: ["low_blow"], comboBonusDamage: 2 },
  iron_fist: { comboFrom: ["pressure_point"], comboBonusDamage: 4 },
  phoenix_flame: { comboFrom: ["fireball", "fire_bolt"], comboBonusDamage: 5 },
  thousand_cuts: { comboFrom: ["whirlwind_slash", "quick_draw"], comboBonusDamage: 4 },
};

/**
 * Calculate combo bonus damage for a technique, given the last technique used.
 *
 * Returns the bonus damage (0 if no combo or combo expired).
 */
export function calculateComboBonus(
  techniqueId: string,
  lastTechniqueId: string | undefined,
  lastTechniqueRound: number | undefined,
  currentRound: number,
): number {
  if (!lastTechniqueId || lastTechniqueRound === undefined) return 0;

  const chain = COMBO_CHAINS[techniqueId];
  if (!chain) return 0;

  if (!chain.comboFrom.includes(lastTechniqueId)) return 0;

  // Check combo window
  if (currentRound - lastTechniqueRound > COMBO_WINDOW) return 0;

  return chain.comboBonusDamage;
}

// ---------------------------------------------------------------------------
// XP Award
// ---------------------------------------------------------------------------

export interface XpAwardInput {
  isFirstUse: boolean;
  targetTierHigher: boolean;
  potency: Potency;
  usesToday: number;
  techniqueTier: number;
  actorTier: number;
}

/**
 * Calculate the XP awarded for a single technique use.
 *
 * Rules:
 *  - Daily cap: 3+ uses of the same technique today → 0 XP.
 *  - Negated / resisted → flat 3 XP (learn from failure).
 *  - Base: 10 XP.
 *  - Bonuses: +20 first-use, +5 higher-tier opponent, +5 overwhelming/critical.
 *  - Diminishing returns: if actorTier − techniqueTier > 2, halve total.
 */
export function calculateXpAward(input: XpAwardInput): number {
  const {
    isFirstUse,
    targetTierHigher,
    potency,
    usesToday,
    techniqueTier,
    actorTier,
  } = input;

  // Daily cap
  if (usesToday >= 3) return 0;

  // Learn from failure
  if (potency === "negated" || potency === "resisted") return 3;

  let xp = 10;

  if (isFirstUse) xp += 20;
  if (targetTierHigher) xp += 5;
  if (potency === "overwhelming" || potency === "critical") xp += 5;

  // Diminishing returns for low-tier techniques
  if (actorTier - techniqueTier > 2) {
    xp = Math.floor(xp / 2);
  }

  return xp;
}
