import { describe, it, expect } from "vitest";
import {
  getCondition,
  resolveAttackAdvantage,
  canAct,
  canMove,
  getEffectiveSpeed,
  isAutoCrit,
  hasResistanceAll,
  processConditionDurations,
  concentrationSaveDC,
} from "./conditions";

describe("getCondition", () => {
  it("returns condition by name (case-insensitive)", () => {
    const cond = getCondition("Blinded");
    expect(cond).toBeDefined();
    expect(cond!.name).toBe("Blinded");
  });

  it("returns undefined for unknown condition", () => {
    expect(getCondition("made_up")).toBeUndefined();
  });

  it("finds all 14 conditions", () => {
    const names = [
      "blinded", "charmed", "deafened", "frightened", "grappled",
      "incapacitated", "invisible", "paralyzed", "petrified", "poisoned",
      "prone", "restrained", "stunned", "unconscious",
    ];
    for (const name of names) {
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
