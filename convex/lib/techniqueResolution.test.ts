import { describe, it, expect } from "vitest";
import {
  calculateActorPower,
  calculateTargetResistance,
  determinePotency,
  calculateEffects,
  calculateXpAward,
  type Potency,
} from "./techniqueResolution";

describe("calculateActorPower", () => {
  it("combines tier, ability mod, and roll bonus", () => {
    // tier 4 = 12, DEX 16 = +3 mod, rollBonus 2 = 17
    expect(calculateActorPower(4, 16, 2)).toBe(17);
  });
  it("handles tier 0", () => {
    expect(calculateActorPower(0, 10, 0)).toBe(0);
  });
});

describe("calculateTargetResistance", () => {
  it("combines counter tier and counter ability mod", () => {
    // tier 3 = 9, STR 14 = +2 = 11
    expect(calculateTargetResistance(3, 14)).toBe(11);
  });
  it("handles no counter skill (tier 0)", () => {
    expect(calculateTargetResistance(0, 10)).toBe(0);
  });
});

describe("determinePotency", () => {
  it("returns overwhelming for gap >= 10", () => {
    expect(determinePotency(20, 10)).toBe("overwhelming");
  });
  it("returns full for gap >= 5", () => {
    expect(determinePotency(15, 10)).toBe("full");
  });
  it("returns standard for gap >= 0", () => {
    expect(determinePotency(12, 12)).toBe("standard");
  });
  it("returns reduced for gap >= -5", () => {
    expect(determinePotency(8, 12)).toBe("reduced");
  });
  it("returns negated for gap < -5", () => {
    expect(determinePotency(5, 12)).toBe("negated");
  });
  it("returns critical for power > 2x resistance", () => {
    expect(determinePotency(25, 10)).toBe("critical");
  });
  it("returns resisted for resistance > 2x power", () => {
    expect(determinePotency(5, 15)).toBe("resisted");
  });
});

describe("calculateEffects", () => {
  it("applies 150% for overwhelming", () => {
    const effects = { scene: { intensityChange: 20, comfortImpact: -10 } };
    const result = calculateEffects(effects, "scene", "overwhelming");
    expect(result.intensityChange).toBe(30);
    expect(result.comfortImpact).toBe(-15);
  });
  it("applies 100% for full", () => {
    const effects = { scene: { intensityChange: 20, comfortImpact: -10 } };
    const result = calculateEffects(effects, "scene", "full");
    expect(result.intensityChange).toBe(20);
    expect(result.comfortImpact).toBe(-10);
  });
  it("applies 80% for standard", () => {
    const effects = { scene: { intensityChange: 20, comfortImpact: -10 } };
    const result = calculateEffects(effects, "scene", "standard");
    expect(result.intensityChange).toBe(16);
    expect(result.comfortImpact).toBe(-8);
  });
  it("applies 50% for reduced", () => {
    const effects = { scene: { intensityChange: 20, comfortImpact: -10 } };
    const result = calculateEffects(effects, "scene", "reduced");
    expect(result.intensityChange).toBe(10);
    expect(result.comfortImpact).toBe(-5);
  });
  it("returns zeroed effects for negated", () => {
    const effects = { scene: { intensityChange: 20, comfortImpact: -10 } };
    const result = calculateEffects(effects, "scene", "negated");
    expect(result.intensityChange).toBe(0);
    expect(result.comfortImpact).toBe(0);
  });
  it("applies 200% for critical", () => {
    const effects = { scene: { intensityChange: 20, comfortImpact: -10 } };
    const result = calculateEffects(effects, "scene", "critical");
    expect(result.intensityChange).toBe(40);
    expect(result.comfortImpact).toBe(-20);
  });
  it("returns zeroed effects for resisted", () => {
    const effects = { scene: { intensityChange: 20, comfortImpact: -10 } };
    const result = calculateEffects(effects, "scene", "resisted");
    expect(result.intensityChange).toBe(0);
    expect(result.comfortImpact).toBe(0);
  });
});

describe("calculateXpAward", () => {
  it("returns base XP for normal use", () => {
    expect(calculateXpAward({ isFirstUse: false, targetTierHigher: false, potency: "standard", usesToday: 1, techniqueTier: 3, actorTier: 3 })).toBe(10);
  });
  it("adds first-use bonus", () => {
    expect(calculateXpAward({ isFirstUse: true, targetTierHigher: false, potency: "standard", usesToday: 1, techniqueTier: 3, actorTier: 3 })).toBe(30);
  });
  it("adds higher-tier opponent bonus", () => {
    expect(calculateXpAward({ isFirstUse: false, targetTierHigher: true, potency: "standard", usesToday: 1, techniqueTier: 3, actorTier: 3 })).toBe(15);
  });
  it("adds overwhelming bonus", () => {
    expect(calculateXpAward({ isFirstUse: false, targetTierHigher: false, potency: "overwhelming", usesToday: 1, techniqueTier: 3, actorTier: 3 })).toBe(15);
  });
  it("gives negated XP (learn from failure)", () => {
    expect(calculateXpAward({ isFirstUse: false, targetTierHigher: false, potency: "negated", usesToday: 1, techniqueTier: 3, actorTier: 3 })).toBe(3);
  });
  it("returns 0 when daily cap hit (3+ uses)", () => {
    expect(calculateXpAward({ isFirstUse: false, targetTierHigher: false, potency: "standard", usesToday: 3, techniqueTier: 3, actorTier: 3 })).toBe(0);
  });
  it("halves XP for techniques far below actor tier", () => {
    expect(calculateXpAward({ isFirstUse: false, targetTierHigher: false, potency: "standard", usesToday: 1, techniqueTier: 1, actorTier: 4 })).toBe(5);
  });
});

// ===========================================================================
// EDGE CASE TESTS
// ===========================================================================

describe("calculateActorPower edge cases", () => {
  it("negative ability modifier (score 1 → modifier -4)", () => {
    // tier 0 * 3 = 0, abilityModifier(1) = Math.floor((1-10)/2) = -4, rollBonus 0 → -4
    expect(calculateActorPower(0, 1, 0)).toBe(-4);
  });
  it("very high tier 8 with abilityScore 20 and rollBonus 5", () => {
    // tier 8 * 3 = 24, abilityModifier(20) = +5, rollBonus 5 → 34
    expect(calculateActorPower(8, 20, 5)).toBe(34);
  });
  it("large rollBonus dominates result", () => {
    // tier 0 * 3 = 0, abilityModifier(10) = 0, rollBonus 100 → 100
    expect(calculateActorPower(0, 10, 100)).toBe(100);
  });
});

describe("calculateTargetResistance edge cases", () => {
  it("counterTier 0 with low ability (score 1)", () => {
    // 0 * 3 = 0, abilityModifier(1) = -4 → -4
    expect(calculateTargetResistance(0, 1)).toBe(-4);
  });
  it("counterTier 8 with high ability (score 20)", () => {
    // 8 * 3 = 24, abilityModifier(20) = +5 → 29
    expect(calculateTargetResistance(8, 20)).toBe(29);
  });
});

describe("determinePotency edge cases", () => {
  it("both actor and target are 0 → gap is 0 → standard", () => {
    expect(determinePotency(0, 0)).toBe("standard");
  });
  it("actor 0, target > 0 → reduced or negated (no resisted because actorPower must be > 0)", () => {
    // actor=0, target=5 → resisted check: 5 >= 3*0=0 true, but actorPower > 0 fails
    // gap = 0 - 5 = -5 → reduced
    expect(determinePotency(0, 5)).toBe("reduced");
  });
  it("actor 0, target 6 → gap = -6 → negated", () => {
    expect(determinePotency(0, 6)).toBe("negated");
  });
  it("actor 1, target 0 → critical check: 1 > 0 but target must be > 0, so gap=1 → standard", () => {
    expect(determinePotency(1, 0)).toBe("standard");
  });
  it("exact boundary: gap = exactly 10 → overwhelming", () => {
    expect(determinePotency(20, 10)).toBe("overwhelming");
  });
  it("exact boundary: gap = exactly 5 → full", () => {
    expect(determinePotency(15, 10)).toBe("full");
  });
  it("exact boundary: gap = exactly -5 → reduced", () => {
    expect(determinePotency(5, 10)).toBe("reduced");
  });
  it("exact boundary: gap = exactly -6 → negated", () => {
    expect(determinePotency(4, 10)).toBe("negated");
  });
  it("critical boundary: actor=21, target=10 → 21 > 20 → critical", () => {
    expect(determinePotency(21, 10)).toBe("critical");
  });
  it("critical boundary exact: actor=20, target=10 → 20 > 20 is FALSE → gap=10 → overwhelming", () => {
    expect(determinePotency(20, 10)).toBe("overwhelming");
  });
  it("resisted boundary: target=30, actor=10 → 30 >= 30 → resisted", () => {
    expect(determinePotency(10, 30)).toBe("resisted");
  });
  it("resisted boundary exact: target=29, actor=10 → 29 >= 30 is FALSE → gap=-19 → negated", () => {
    expect(determinePotency(10, 29)).toBe("negated");
  });
});

describe("calculateEffects edge cases", () => {
  it("context not present in effects object → returns empty object", () => {
    const effects = { scene: { intensityChange: 20 } };
    const result = calculateEffects(effects, "combat", "full");
    expect(result).toEqual({});
  });

  it("boolean values with standard potency → boolean stays true", () => {
    const effects = { social: { insightReveal: true, persuasionBonus: 10 } };
    const result = calculateEffects(effects, "social", "standard");
    expect(result.insightReveal).toBe(true);
    expect(result.persuasionBonus).toBe(8); // 10 * 0.8 = 8
  });

  it("boolean values with negated potency → boolean becomes false", () => {
    const effects = { social: { insightReveal: true, persuasionBonus: 10 } };
    const result = calculateEffects(effects, "social", "negated");
    expect(result.insightReveal).toBe(false);
    expect(result.persuasionBonus).toBe(0);
  });

  it("boolean values with resisted potency → boolean becomes false", () => {
    const effects = { exploration: { trapDisable: true, perceptionBonus: 5 } };
    const result = calculateEffects(effects, "exploration", "resisted");
    expect(result.trapDisable).toBe(false);
    expect(result.perceptionBonus).toBe(0);
  });

  it("string values with standard potency → string stays", () => {
    const effects = { scene: { moodShift: "restrained", intensityChange: 10 } };
    const result = calculateEffects(effects, "scene", "standard");
    expect(result.moodShift).toBe("restrained");
    expect(result.intensityChange).toBe(8);
  });

  it("string values with negated potency → string becomes empty", () => {
    const effects = { scene: { moodShift: "restrained", intensityChange: 10 } };
    const result = calculateEffects(effects, "scene", "negated");
    expect(result.moodShift).toBe("");
    expect(result.intensityChange).toBe(0);
  });

  it("string values with resisted potency → string becomes empty", () => {
    const effects = { combat: { condition: "stunned", damage: 5 } };
    const result = calculateEffects(effects, "combat", "resisted");
    expect(result.condition).toBe("");
    expect(result.damage).toBe(0);
  });

  it("negative numbers truncate toward zero with overwhelming (150%)", () => {
    const effects = { scene: { comfortImpact: -10 } };
    const result = calculateEffects(effects, "scene", "overwhelming");
    // -10 * 1.5 = -15, Math.trunc(-15) = -15
    expect(result.comfortImpact).toBe(-15);
  });

  it("negative numbers truncate toward zero with standard (80%)", () => {
    const effects = { scene: { comfortImpact: -7 } };
    const result = calculateEffects(effects, "scene", "standard");
    // -7 * 0.8 = -5.6, Math.trunc(-5.6) = -5
    expect(result.comfortImpact).toBe(-5);
  });

  it("positive numbers truncate toward zero with standard (80%)", () => {
    const effects = { scene: { intensityChange: 7 } };
    const result = calculateEffects(effects, "scene", "standard");
    // 7 * 0.8 = 5.6, Math.trunc(5.6) = 5
    expect(result.intensityChange).toBe(5);
  });

  it("combat effects with boolean and number mixed (critical)", () => {
    const effects = { exploration: { trapDisable: true, stealthBonus: 3, perceptionBonus: 5 } };
    const result = calculateEffects(effects, "exploration", "critical");
    expect(result.trapDisable).toBe(true);
    expect(result.stealthBonus).toBe(6); // 3 * 2.0
    expect(result.perceptionBonus).toBe(10); // 5 * 2.0
  });
});

describe("calculateXpAward edge cases", () => {
  it("usesToday = 2 (just below cap) → still awards XP", () => {
    expect(calculateXpAward({ isFirstUse: false, targetTierHigher: false, potency: "standard", usesToday: 2, techniqueTier: 3, actorTier: 3 })).toBe(10);
  });
  it("exact daily cap: usesToday = 3 → 0", () => {
    expect(calculateXpAward({ isFirstUse: false, targetTierHigher: false, potency: "standard", usesToday: 3, techniqueTier: 3, actorTier: 3 })).toBe(0);
  });
  it("usesToday = 100 → still 0", () => {
    expect(calculateXpAward({ isFirstUse: false, targetTierHigher: false, potency: "standard", usesToday: 100, techniqueTier: 3, actorTier: 3 })).toBe(0);
  });
  it("all bonuses combined: isFirstUse + targetTierHigher + overwhelming → 10+20+5+5=40", () => {
    expect(calculateXpAward({ isFirstUse: true, targetTierHigher: true, potency: "overwhelming", usesToday: 0, techniqueTier: 3, actorTier: 3 })).toBe(40);
  });
  it("all bonuses + diminishing: techniqueTier=0, actorTier=4 → 40/2=20", () => {
    // actorTier - techniqueTier = 4 > 2, so halve: 40 / 2 = 20
    expect(calculateXpAward({ isFirstUse: true, targetTierHigher: true, potency: "overwhelming", usesToday: 0, techniqueTier: 0, actorTier: 4 })).toBe(20);
  });
  it("critical potency → same +5 bonus as overwhelming", () => {
    expect(calculateXpAward({ isFirstUse: false, targetTierHigher: false, potency: "critical", usesToday: 1, techniqueTier: 3, actorTier: 3 })).toBe(15);
  });
  it("resisted + first use → still only 3 (failure XP overrides first-use)", () => {
    expect(calculateXpAward({ isFirstUse: true, targetTierHigher: false, potency: "resisted", usesToday: 0, techniqueTier: 3, actorTier: 3 })).toBe(3);
  });
  it("techniqueTier exactly 2 below actorTier: actorTier=4, techniqueTier=2 → diff=2, NOT halved", () => {
    // 4 - 2 = 2, which is NOT > 2, so no halving
    expect(calculateXpAward({ isFirstUse: false, targetTierHigher: false, potency: "standard", usesToday: 1, techniqueTier: 2, actorTier: 4 })).toBe(10);
  });
  it("techniqueTier exactly 3 below actorTier: actorTier=5, techniqueTier=2 → diff=3, halved", () => {
    // 5 - 2 = 3, which IS > 2, so halve: 10 / 2 = 5
    expect(calculateXpAward({ isFirstUse: false, targetTierHigher: false, potency: "standard", usesToday: 1, techniqueTier: 2, actorTier: 5 })).toBe(5);
  });
});
