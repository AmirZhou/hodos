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
