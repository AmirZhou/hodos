import { describe, it, expect } from "vitest";
import {
  getExtraAttacks,
  initializeClassResources,
} from "../lib/classFeatures";
import {
  hasSpellSlot,
  getCantripDiceCount,
  getSpellSaveDC,
  getSpellAttackBonus,
} from "../lib/spells";

// ============ EXTRA ATTACKS ============

describe("getExtraAttacks", () => {
  it("returns 0 for fighter level 4 (before Extra Attack)", () => {
    expect(getExtraAttacks("fighter", 4)).toBe(0);
  });

  it("returns 1 for fighter level 5", () => {
    expect(getExtraAttacks("fighter", 5)).toBe(1);
  });

  it("returns 2 for fighter level 11", () => {
    expect(getExtraAttacks("fighter", 11)).toBe(2);
  });

  it("returns 3 for fighter level 20", () => {
    expect(getExtraAttacks("fighter", 20)).toBe(3);
  });

  it("returns 0 for rogue level 20 (rogues do not get extra attack)", () => {
    expect(getExtraAttacks("rogue", 20)).toBe(0);
  });

  it("returns 1 for barbarian level 5", () => {
    expect(getExtraAttacks("barbarian", 5)).toBe(1);
  });

  it("returns 1 for paladin level 5", () => {
    expect(getExtraAttacks("paladin", 5)).toBe(1);
  });
});

// ============ SPELL SLOT CONSUMPTION ============

describe("hasSpellSlot", () => {
  it("returns true when used < max", () => {
    const slots = { "1": { max: 4, used: 2 } };
    expect(hasSpellSlot(slots, 1)).toBe(true);
  });

  it("returns false when used >= max", () => {
    const slots = { "1": { max: 4, used: 4 } };
    expect(hasSpellSlot(slots, 1)).toBe(false);
  });

  it("returns false for spell levels not in the table", () => {
    const slots = { "1": { max: 2, used: 0 } };
    expect(hasSpellSlot(slots, 3)).toBe(false);
  });

  it("returns false when used exceeds max", () => {
    const slots = { "2": { max: 3, used: 5 } };
    expect(hasSpellSlot(slots, 2)).toBe(false);
  });

  it("returns true when zero slots have been used", () => {
    const slots = { "5": { max: 1, used: 0 } };
    expect(hasSpellSlot(slots, 5)).toBe(true);
  });
});

// ============ CANTRIP SCALING ============

describe("getCantripDiceCount", () => {
  it("returns 1 die at level 1", () => {
    expect(getCantripDiceCount(1)).toBe(1);
  });

  it("returns 1 die at level 4 (just before first scaling)", () => {
    expect(getCantripDiceCount(4)).toBe(1);
  });

  it("returns 2 dice at level 5", () => {
    expect(getCantripDiceCount(5)).toBe(2);
  });

  it("returns 3 dice at level 11", () => {
    expect(getCantripDiceCount(11)).toBe(3);
  });

  it("returns 4 dice at level 17", () => {
    expect(getCantripDiceCount(17)).toBe(4);
  });

  it("returns 4 dice at level 20 (no further scaling)", () => {
    expect(getCantripDiceCount(20)).toBe(4);
  });
});

// ============ SPELL SAVE DC ============

describe("getSpellSaveDC", () => {
  it("returns 13 for proficiency 2 and ability score 16 (8 + 2 + 3)", () => {
    // abilityModifier(16) = floor((16-10)/2) = 3
    expect(getSpellSaveDC(2, 16)).toBe(13);
  });

  it("returns 19 for proficiency 6 and ability score 20 (8 + 6 + 5)", () => {
    // abilityModifier(20) = floor((20-10)/2) = 5
    expect(getSpellSaveDC(6, 20)).toBe(19);
  });

  it("returns 10 for proficiency 2 and ability score 10 (8 + 2 + 0)", () => {
    // abilityModifier(10) = 0
    expect(getSpellSaveDC(2, 10)).toBe(10);
  });
});

// ============ SPELL ATTACK BONUS ============

describe("getSpellAttackBonus", () => {
  it("returns 4 for proficiency 2 and ability score 14 (2 + 2)", () => {
    // abilityModifier(14) = floor((14-10)/2) = 2
    expect(getSpellAttackBonus(2, 14)).toBe(4);
  });

  it("returns 11 for proficiency 6 and ability score 20 (6 + 5)", () => {
    // abilityModifier(20) = 5
    expect(getSpellAttackBonus(6, 20)).toBe(11);
  });

  it("returns 2 for proficiency 2 and ability score 10 (2 + 0)", () => {
    expect(getSpellAttackBonus(2, 10)).toBe(2);
  });
});

// ============ CLASS RESOURCE INITIALIZATION ============

describe("initializeClassResources", () => {
  it("fighter level 2 has secondWind and actionSurge resources", () => {
    const resources = initializeClassResources("fighter", 2);
    expect(resources).toHaveProperty("secondWind");
    expect(resources.secondWind.max).toBe(1);
    expect(resources.secondWind.current).toBe(1);
    expect(resources).toHaveProperty("actionSurge");
    expect(resources.actionSurge.max).toBe(1);
    expect(resources.actionSurge.current).toBe(1);
  });

  it("barbarian level 1 has rage resource with max 2", () => {
    const resources = initializeClassResources("barbarian", 1);
    expect(resources).toHaveProperty("rage");
    expect(resources.rage.max).toBe(2);
    expect(resources.rage.current).toBe(2);
  });

  it("monk level 2 has ki resource with max equal to level", () => {
    const resources = initializeClassResources("monk", 2);
    expect(resources).toHaveProperty("ki");
    expect(resources.ki.max).toBe(2);
    expect(resources.ki.current).toBe(2);
  });

  it("monk level 10 has ki resource with max 10", () => {
    const resources = initializeClassResources("monk", 10);
    expect(resources.ki.max).toBe(10);
  });

  it("fighter level 1 has secondWind but not actionSurge", () => {
    const resources = initializeClassResources("fighter", 1);
    expect(resources).toHaveProperty("secondWind");
    expect(resources).not.toHaveProperty("actionSurge");
  });
});

// ============ HIT DIE SIZES ============

describe("hit die sizes for rest", () => {
  // D&D 5e hit die size per class — pure inline logic
  function getHitDie(characterClass: string): string {
    const hitDice: Record<string, string> = {
      barbarian: "d12",
      fighter: "d10",
      paladin: "d10",
      ranger: "d10",
      monk: "d8",
      rogue: "d8",
      bard: "d8",
      cleric: "d8",
      druid: "d8",
      warlock: "d8",
      wizard: "d6",
      sorcerer: "d6",
    };
    return hitDice[characterClass.toLowerCase()] ?? "d8";
  }

  it("barbarian uses d12", () => {
    expect(getHitDie("barbarian")).toBe("d12");
  });

  it("fighter uses d10", () => {
    expect(getHitDie("fighter")).toBe("d10");
  });

  it("wizard uses d6", () => {
    expect(getHitDie("wizard")).toBe("d6");
  });

  it("rogue uses d8", () => {
    expect(getHitDie("rogue")).toBe("d8");
  });

  it("paladin uses d10", () => {
    expect(getHitDie("paladin")).toBe("d10");
  });

  it("sorcerer uses d6", () => {
    expect(getHitDie("sorcerer")).toBe("d6");
  });

  it("defaults to d8 for unknown class", () => {
    expect(getHitDie("artificer")).toBe("d8");
  });
});
