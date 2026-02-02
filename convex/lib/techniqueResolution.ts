/**
 * Deterministic technique resolution engine.
 *
 * No dice rolls — pure power-vs-resistance math.  Actor power is compared
 * against target resistance to derive a Potency level, which then scales
 * the technique's context-specific effects.
 */

import { abilityModifier } from "./stats";
import type { TechniqueEffects, TechniqueContext } from "../data/techniqueCatalog";

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
      result[key] = Math.trunc(value * multiplier);
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
