import { describe, it, expect } from "vitest";
import {
  getCondition,
  resolveAttackAdvantage,
  canAct,
  canMove,
  canCast,
  getEffectiveSpeed,
  isAutoCrit,
  hasResistanceAll,
  processConditionDurations,
  concentrationSaveDC,
  getDotDamage,
  getDamageVulnerabilityMultiplier,
  getAcModifier,
  getOutgoingDamageMultiplier,
  removeConditionsOnDamage,
  applyDiminishingReturns,
  CC_CATEGORIES,
  DR_RESET_TURNS,
  applyOrReplaceCondition,
  applyCcResistance,
  spellCcBaseDuration,
  shouldBlockCc,
  canUseLegendaryResistance,
  processRepeatedSaves,
} from "./conditions";
import type { DrTracker, ActiveCondition } from "./conditions";

describe("getCondition", () => {
  it("returns condition by name (case-insensitive)", () => {
    const cond = getCondition("Blinded");
    expect(cond).toBeDefined();
    expect(cond!.name).toBe("Blinded");
  });

  it("returns undefined for unknown condition", () => {
    expect(getCondition("made_up")).toBeUndefined();
  });

  it("finds all 14 standard conditions", () => {
    const names = [
      "blinded", "charmed", "deafened", "frightened", "grappled",
      "incapacitated", "invisible", "paralyzed", "petrified", "poisoned",
      "prone", "restrained", "stunned", "unconscious",
    ];
    for (const name of names) {
      expect(getCondition(name)).toBeDefined();
    }
  });

  it("finds all new conditions", () => {
    const newNames = [
      "shaken", "weakened", "burning", "confused", "chilled", "slowed",
      "armor_broken", "pinned", "distracted", "freed", "silenced",
      "bleeding", "burning_intense", "staggered", "dominated", "doomed",
      "cc_immune",
    ];
    for (const name of newNames) {
      expect(getCondition(name)).toBeDefined();
    }
  });

  it("returns the dodging condition with attackedDisadvantage", () => {
    const cond = getCondition("dodging");
    expect(cond).toBeDefined();
    expect(cond!.name).toBe("Dodging");
    expect(cond!.effects.attackedDisadvantage).toBe(true);
  });

  it("dodging condition does not grant other combat effects", () => {
    const cond = getCondition("dodging");
    expect(cond).toBeDefined();
    expect(cond!.effects.attackDisadvantage).toBeUndefined();
    expect(cond!.effects.attackAdvantage).toBeUndefined();
    expect(cond!.effects.attackedAdvantage).toBeUndefined();
    expect(cond!.effects.cannotAct).toBeUndefined();
    expect(cond!.effects.cannotMove).toBeUndefined();
    expect(cond!.effects.speedZero).toBeUndefined();
  });
});

describe("resolveAttackAdvantage", () => {
  it("returns 0 for no conditions", () => {
    expect(resolveAttackAdvantage([], [], true, true)).toBe(0);
  });

  it("returns -1 for blinded attacker", () => {
    expect(resolveAttackAdvantage(["blinded"], [], true, true)).toBe(-1);
  });

  it("returns 1 for invisible attacker", () => {
    expect(resolveAttackAdvantage(["invisible"], [], true, true)).toBe(1);
  });

  it("cancels advantage and disadvantage", () => {
    // Invisible (advantage) + poisoned (disadvantage) = cancel
    expect(resolveAttackAdvantage(["invisible", "poisoned"], [], true, true)).toBe(0);
  });

  it("returns 1 when target is paralyzed (attacked advantage)", () => {
    expect(resolveAttackAdvantage([], ["paralyzed"], true, true)).toBe(1);
  });

  it("returns 1 for melee attack against prone target within 5ft", () => {
    expect(resolveAttackAdvantage([], ["prone"], true, true)).toBe(1);
  });

  it("returns -1 for ranged attack against prone target", () => {
    expect(resolveAttackAdvantage([], ["prone"], false, false)).toBe(-1);
  });

  it("returns -1 when target is dodging and attacker has no advantage sources", () => {
    expect(resolveAttackAdvantage([], ["dodging"], true, true)).toBe(-1);
  });

  it("returns -1 when target is dodging for ranged attacks too", () => {
    expect(resolveAttackAdvantage([], ["dodging"], false, false)).toBe(-1);
  });

  it("cancels dodging disadvantage with attacker advantage", () => {
    // Invisible attacker (advantage) vs dodging target (disadvantage) = cancel
    expect(resolveAttackAdvantage(["invisible"], ["dodging"], true, true)).toBe(0);
  });
});

describe("canAct", () => {
  it("returns true for no conditions", () => {
    expect(canAct([])).toBe(true);
  });

  it("returns false for stunned", () => {
    expect(canAct(["stunned"])).toBe(false);
  });

  it("returns false for paralyzed", () => {
    expect(canAct(["paralyzed"])).toBe(false);
  });

  it("returns false for unconscious", () => {
    expect(canAct(["unconscious"])).toBe(false);
  });

  it("returns true for blinded (can still act)", () => {
    expect(canAct(["blinded"])).toBe(true);
  });

  it("returns false for dominated", () => {
    expect(canAct(["dominated"])).toBe(false);
  });
});

describe("canMove", () => {
  it("returns true for no conditions", () => {
    expect(canMove([])).toBe(true);
  });

  it("returns false for grappled (speed 0)", () => {
    expect(canMove(["grappled"])).toBe(false);
  });

  it("returns false for restrained (speed 0)", () => {
    expect(canMove(["restrained"])).toBe(false);
  });

  it("returns false for paralyzed (cannotMove)", () => {
    expect(canMove(["paralyzed"])).toBe(false);
  });

  it("returns true for poisoned (can still move)", () => {
    expect(canMove(["poisoned"])).toBe(true);
  });

  it("returns false for pinned (speed 0)", () => {
    expect(canMove(["pinned"])).toBe(false);
  });
});

describe("canCast", () => {
  it("returns true for no conditions", () => {
    expect(canCast([])).toBe(true);
  });

  it("returns false for silenced", () => {
    expect(canCast(["silenced"])).toBe(false);
  });

  it("returns false for confused", () => {
    expect(canCast(["confused"])).toBe(false);
  });

  it("returns false for stunned (cannotAct implies cannotCast)", () => {
    expect(canCast(["stunned"])).toBe(false);
  });

  it("returns true for blinded (can still cast)", () => {
    expect(canCast(["blinded"])).toBe(true);
  });

  it("returns true for weakened (can still cast)", () => {
    expect(canCast(["weakened"])).toBe(true);
  });
});

describe("getEffectiveSpeed", () => {
  it("returns base speed with no conditions", () => {
    expect(getEffectiveSpeed(30, [])).toBe(30);
  });

  it("returns 0 when grappled", () => {
    expect(getEffectiveSpeed(30, ["grappled"])).toBe(0);
  });

  it("returns 0 when restrained", () => {
    expect(getEffectiveSpeed(30, ["restrained"])).toBe(0);
  });

  it("returns half speed when slowed", () => {
    expect(getEffectiveSpeed(30, ["slowed"])).toBe(15);
  });

  it("returns half speed when chilled", () => {
    expect(getEffectiveSpeed(30, ["chilled"])).toBe(15);
  });

  it("returns 0 when pinned (speedZero overrides multiplier)", () => {
    expect(getEffectiveSpeed(30, ["pinned"])).toBe(0);
  });

  it("uses lowest multiplier with multiple slow conditions", () => {
    // Both slowed (0.5) and chilled (0.5) — lowest is 0.5
    expect(getEffectiveSpeed(30, ["slowed", "chilled"])).toBe(15);
  });
});

describe("getDotDamage", () => {
  it("returns 0 for no conditions", () => {
    expect(getDotDamage([])).toBe(0);
  });

  it("returns 3 for burning", () => {
    expect(getDotDamage(["burning"])).toBe(3);
  });

  it("returns 2 for bleeding", () => {
    expect(getDotDamage(["bleeding"])).toBe(2);
  });

  it("returns 5 for doomed", () => {
    expect(getDotDamage(["doomed"])).toBe(5);
  });

  it("stacks DoT from multiple conditions", () => {
    expect(getDotDamage(["burning", "bleeding"])).toBe(5);
  });

  it("returns 0 for non-DoT conditions", () => {
    expect(getDotDamage(["stunned", "blinded"])).toBe(0);
  });
});

describe("getDamageVulnerabilityMultiplier", () => {
  it("returns 1.0 for no conditions", () => {
    expect(getDamageVulnerabilityMultiplier([], "fire_magic")).toBe(1.0);
  });

  it("returns 1.5 for burning + fire_magic", () => {
    expect(getDamageVulnerabilityMultiplier(["burning"], "fire_magic")).toBe(1.5);
  });

  it("returns 1.5 for chilled + ice_magic", () => {
    expect(getDamageVulnerabilityMultiplier(["chilled"], "ice_magic")).toBe(1.5);
  });

  it("returns 1.5 for armor_broken + heavy_weapons", () => {
    expect(getDamageVulnerabilityMultiplier(["armor_broken"], "heavy_weapons")).toBe(1.5);
  });

  it("returns 1.5 for armor_broken + archery", () => {
    expect(getDamageVulnerabilityMultiplier(["armor_broken"], "archery")).toBe(1.5);
  });

  it("returns 1.5 for bleeding + blade_mastery", () => {
    expect(getDamageVulnerabilityMultiplier(["bleeding"], "blade_mastery")).toBe(1.5);
  });

  it("returns 1.5 for bleeding + dirty_fighting", () => {
    expect(getDamageVulnerabilityMultiplier(["bleeding"], "dirty_fighting")).toBe(1.5);
  });

  it("returns 1.5 for pinned + archery", () => {
    expect(getDamageVulnerabilityMultiplier(["pinned"], "archery")).toBe(1.5);
  });

  it("returns 1.0 for non-matching skill", () => {
    expect(getDamageVulnerabilityMultiplier(["burning"], "ice_magic")).toBe(1.0);
  });
});

describe("getAcModifier", () => {
  it("returns 0 for no conditions", () => {
    expect(getAcModifier([])).toBe(0);
  });

  it("returns -3 for armor_broken", () => {
    expect(getAcModifier(["armor_broken"])).toBe(-3);
  });

  it("returns 0 for non-AC conditions", () => {
    expect(getAcModifier(["stunned", "blinded"])).toBe(0);
  });
});

describe("getOutgoingDamageMultiplier", () => {
  it("returns 1.0 for no conditions", () => {
    expect(getOutgoingDamageMultiplier([])).toBe(1.0);
  });

  it("returns 0.5 for weakened", () => {
    expect(getOutgoingDamageMultiplier(["weakened"])).toBe(0.5);
  });

  it("returns 1.0 for non-damage-reducing conditions", () => {
    expect(getOutgoingDamageMultiplier(["blinded"])).toBe(1.0);
  });
});

describe("removeConditionsOnDamage", () => {
  it("removes charmed on damage", () => {
    const conditions = [
      { name: "charmed", duration: 3, source: "test" },
      { name: "stunned", duration: 1, source: "test" },
    ];
    const result = removeConditionsOnDamage(conditions);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("stunned");
  });

  it("removes dominated on damage", () => {
    const conditions = [
      { name: "dominated", duration: 2, source: "test" },
    ];
    const result = removeConditionsOnDamage(conditions);
    expect(result).toHaveLength(0);
  });

  it("keeps non-breakOnDamage conditions", () => {
    const conditions = [
      { name: "stunned", duration: 1, source: "test" },
      { name: "blinded", duration: 2, source: "test" },
    ];
    const result = removeConditionsOnDamage(conditions);
    expect(result).toHaveLength(2);
  });
});

describe("isAutoCrit", () => {
  it("returns false when not within 5ft", () => {
    expect(isAutoCrit(["paralyzed"], false)).toBe(false);
  });

  it("returns true for paralyzed target within 5ft", () => {
    expect(isAutoCrit(["paralyzed"], true)).toBe(true);
  });

  it("returns true for unconscious target within 5ft", () => {
    expect(isAutoCrit(["unconscious"], true)).toBe(true);
  });

  it("returns false for blinded target (no crit effect)", () => {
    expect(isAutoCrit(["blinded"], true)).toBe(false);
  });
});

describe("hasResistanceAll", () => {
  it("returns false for no conditions", () => {
    expect(hasResistanceAll([])).toBe(false);
  });

  it("returns true for petrified", () => {
    expect(hasResistanceAll(["petrified"])).toBe(true);
  });

  it("returns false for stunned", () => {
    expect(hasResistanceAll(["stunned"])).toBe(false);
  });
});

describe("processConditionDurations", () => {
  it("removes expired conditions", () => {
    const conditions = [
      { name: "poisoned", duration: 1, expiresOn: "end" as const },
    ];
    const result = processConditionDurations(conditions, "end");
    expect(result).toHaveLength(0);
  });

  it("decrements duration", () => {
    const conditions = [
      { name: "blinded", duration: 3, expiresOn: "end" as const },
    ];
    const result = processConditionDurations(conditions, "end");
    expect(result).toHaveLength(1);
    expect(result[0].duration).toBe(2);
  });

  it("preserves permanent conditions", () => {
    const conditions = [
      { name: "charmed" },
    ];
    const result = processConditionDurations(conditions, "end");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("charmed");
  });

  it("only processes conditions matching timing", () => {
    const conditions = [
      { name: "poisoned", duration: 1, expiresOn: "start" as const },
    ];
    // Processing at "end" should not remove a "start" condition
    const result = processConditionDurations(conditions, "end");
    expect(result).toHaveLength(1);
  });
});

describe("concentrationSaveDC", () => {
  it("returns 10 for low damage", () => {
    expect(concentrationSaveDC(5)).toBe(10);
    expect(concentrationSaveDC(10)).toBe(10);
    expect(concentrationSaveDC(19)).toBe(10);
  });

  it("returns damage/2 for high damage", () => {
    expect(concentrationSaveDC(20)).toBe(10);
    expect(concentrationSaveDC(22)).toBe(11);
    expect(concentrationSaveDC(30)).toBe(15);
    expect(concentrationSaveDC(50)).toBe(25);
  });
});

// ============ CC CATEGORIES ============

describe("CC_CATEGORIES", () => {
  it("maps stunned to stun category", () => {
    expect(CC_CATEGORIES["stunned"]).toBe("stun");
  });

  it("maps paralyzed to stun category", () => {
    expect(CC_CATEGORIES["paralyzed"]).toBe("stun");
  });

  it("maps charmed to incapacitate category", () => {
    expect(CC_CATEGORIES["charmed"]).toBe("incapacitate");
  });

  it("maps frightened to fear category", () => {
    expect(CC_CATEGORIES["frightened"]).toBe("fear");
  });

  it("maps grappled to root category", () => {
    expect(CC_CATEGORIES["grappled"]).toBe("root");
  });

  it("maps slowed to slow category", () => {
    expect(CC_CATEGORIES["slowed"]).toBe("slow");
  });

  it("maps silenced to silence category", () => {
    expect(CC_CATEGORIES["silenced"]).toBe("silence");
  });

  it("maps blinded to disorient category", () => {
    expect(CC_CATEGORIES["blinded"]).toBe("disorient");
  });

  it("returns undefined for non-CC conditions", () => {
    expect(CC_CATEGORIES["poisoned"]).toBeUndefined();
    expect(CC_CATEGORIES["burning"]).toBeUndefined();
    expect(CC_CATEGORIES["bleeding"]).toBeUndefined();
  });
});

// ============ DIMINISHING RETURNS ============

describe("applyDiminishingReturns", () => {
  it("first CC in category: 100% duration", () => {
    const tracker: DrTracker = {};
    const result = applyDiminishingReturns(3, "stunned", tracker, 1);
    expect(result.duration).toBe(3);
  });

  it("second CC in same category: 50% duration (min 1)", () => {
    const tracker: DrTracker = { stun: { count: 1, lastAppliedRound: 1 } };
    const result = applyDiminishingReturns(3, "stunned", tracker, 2);
    expect(result.duration).toBe(1); // floor(3 * 0.5) = 1
  });

  it("second CC with higher base: 50% rounds up", () => {
    const tracker: DrTracker = { stun: { count: 1, lastAppliedRound: 1 } };
    const result = applyDiminishingReturns(4, "paralyzed", tracker, 2);
    expect(result.duration).toBe(2); // floor(4 * 0.5) = 2
  });

  it("third CC in same category: 25% duration (min 1)", () => {
    const tracker: DrTracker = { stun: { count: 2, lastAppliedRound: 2 } };
    const result = applyDiminishingReturns(3, "stunned", tracker, 3);
    expect(result.duration).toBe(1); // max(1, floor(3 * 0.25)) = max(1, 0) = 1
  });

  it("fourth CC in same category: immune (0 duration)", () => {
    const tracker: DrTracker = { stun: { count: 3, lastAppliedRound: 3 } };
    const result = applyDiminishingReturns(3, "stunned", tracker, 4);
    expect(result.duration).toBe(0);
  });

  it("DR resets after DR_RESET_TURNS without CC in that category", () => {
    const tracker: DrTracker = { stun: { count: 3, lastAppliedRound: 1 } };
    // Round 1 + 3 = round 4, so round 4 should reset
    const result = applyDiminishingReturns(3, "stunned", tracker, 1 + DR_RESET_TURNS);
    expect(result.duration).toBe(3); // reset, so 100%
  });

  it("DR does NOT reset before DR_RESET_TURNS", () => {
    const tracker: DrTracker = { stun: { count: 3, lastAppliedRound: 1 } };
    const result = applyDiminishingReturns(3, "stunned", tracker, 1 + DR_RESET_TURNS - 1);
    expect(result.duration).toBe(0); // still immune
  });

  it("different CC categories track independently", () => {
    const tracker: DrTracker = { stun: { count: 3, lastAppliedRound: 1 } };
    // Stun is at immune, but fear category is fresh
    const result = applyDiminishingReturns(3, "frightened", tracker, 2);
    expect(result.duration).toBe(3); // 100% for fear category
  });

  it("non-CC conditions bypass DR entirely", () => {
    const tracker: DrTracker = { stun: { count: 3, lastAppliedRound: 1 } };
    const result = applyDiminishingReturns(3, "poisoned", tracker, 2);
    expect(result.duration).toBe(3); // not a CC, full duration
  });

  it("non-CC conditions don't modify tracker", () => {
    const tracker: DrTracker = {};
    const result = applyDiminishingReturns(3, "burning", tracker, 1);
    expect(result.duration).toBe(3);
    expect(Object.keys(result.updatedTracker)).toHaveLength(0);
  });

  it("updates tracker correctly after each application", () => {
    let tracker: DrTracker = {};

    // 1st stun
    let result = applyDiminishingReturns(3, "stunned", tracker, 1);
    expect(result.updatedTracker.stun.count).toBe(1);
    tracker = result.updatedTracker;

    // 2nd stun
    result = applyDiminishingReturns(3, "stunned", tracker, 2);
    expect(result.updatedTracker.stun.count).toBe(2);
    tracker = result.updatedTracker;

    // 3rd stun
    result = applyDiminishingReturns(3, "stunned", tracker, 3);
    expect(result.updatedTracker.stun.count).toBe(3);
  });

  it("paralyzed shares stun category with stunned", () => {
    const tracker: DrTracker = { stun: { count: 1, lastAppliedRound: 1 } };
    const result = applyDiminishingReturns(3, "paralyzed", tracker, 2);
    expect(result.duration).toBe(1); // 50% because stun category count is 1
  });

  it("min 1 turn on 50% with base 1", () => {
    const tracker: DrTracker = { stun: { count: 1, lastAppliedRound: 1 } };
    const result = applyDiminishingReturns(1, "stunned", tracker, 2);
    expect(result.duration).toBe(1); // max(1, floor(1 * 0.5)) = max(1, 0) = 1
  });

  it("min 1 turn on 25% with base 1", () => {
    const tracker: DrTracker = { stun: { count: 2, lastAppliedRound: 2 } };
    const result = applyDiminishingReturns(1, "stunned", tracker, 3);
    expect(result.duration).toBe(1); // max(1, floor(1 * 0.25)) = max(1, 0) = 1
  });
});
