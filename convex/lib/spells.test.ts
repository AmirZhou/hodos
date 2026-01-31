import { describe, it, expect } from "vitest";
import {
  getSpellSlots,
  isCaster,
  getCastingAbility,
  getSpellSaveDC,
  getSpellAttackBonus,
  getCantripDiceCount,
  hasSpellSlot,
  initializeSpellSlots,
} from "./spells";

describe("getSpellSlots", () => {
  it("returns slots for wizard at level 1", () => {
    const slots = getSpellSlots("wizard", 1);
    expect(slots[1]).toBe(2);
    expect(slots[2]).toBeUndefined();
  });

  it("returns slots for wizard at level 5", () => {
    const slots = getSpellSlots("wizard", 5);
    expect(slots[1]).toBe(4);
    expect(slots[2]).toBe(3);
    expect(slots[3]).toBe(2);
  });

  it("returns slots for paladin (half-caster) at level 2", () => {
    const slots = getSpellSlots("paladin", 2);
    expect(slots[1]).toBe(2);
  });

  it("returns empty for non-caster", () => {
    const slots = getSpellSlots("fighter", 5);
    expect(Object.keys(slots)).toHaveLength(0);
  });

  it("returns empty for invalid level", () => {
    const slots = getSpellSlots("wizard", 0);
    expect(Object.keys(slots)).toHaveLength(0);
  });
});

describe("isCaster", () => {
  it("returns true for full casters", () => {
    expect(isCaster("wizard")).toBe(true);
    expect(isCaster("cleric")).toBe(true);
    expect(isCaster("sorcerer")).toBe(true);
    expect(isCaster("bard")).toBe(true);
    expect(isCaster("druid")).toBe(true);
  });

  it("returns true for half casters", () => {
    expect(isCaster("paladin")).toBe(true);
    expect(isCaster("ranger")).toBe(true);
  });

  it("returns false for non-casters", () => {
    expect(isCaster("fighter")).toBe(false);
    expect(isCaster("rogue")).toBe(false);
    expect(isCaster("barbarian")).toBe(false);
  });

  it("is case-insensitive", () => {
    expect(isCaster("Wizard")).toBe(true);
    expect(isCaster("CLERIC")).toBe(true);
  });
});

describe("getCastingAbility", () => {
  it("returns intelligence for wizard", () => {
    expect(getCastingAbility("wizard")).toBe("intelligence");
  });

  it("returns wisdom for cleric", () => {
    expect(getCastingAbility("cleric")).toBe("wisdom");
  });

  it("returns charisma for sorcerer", () => {
    expect(getCastingAbility("sorcerer")).toBe("charisma");
  });

  it("returns null for non-caster", () => {
    expect(getCastingAbility("fighter")).toBeNull();
  });
});

describe("getSpellSaveDC", () => {
  it("computes DC correctly", () => {
    // DC = 8 + proficiency + ability modifier
    // ability 16 → mod 3, prof 2 → DC 13
    expect(getSpellSaveDC(2, 16)).toBe(13);
  });

  it("handles low ability score", () => {
    // ability 8 → mod -1, prof 2 → DC 9
    expect(getSpellSaveDC(2, 8)).toBe(9);
  });
});

describe("getSpellAttackBonus", () => {
  it("computes bonus correctly", () => {
    // prof 2 + ability 16 → mod 3 → bonus 5
    expect(getSpellAttackBonus(2, 16)).toBe(5);
  });
});

describe("getCantripDiceCount", () => {
  it("returns 1 for levels 1-4", () => {
    expect(getCantripDiceCount(1)).toBe(1);
    expect(getCantripDiceCount(4)).toBe(1);
  });

  it("returns 2 for levels 5-10", () => {
    expect(getCantripDiceCount(5)).toBe(2);
    expect(getCantripDiceCount(10)).toBe(2);
  });

  it("returns 3 for levels 11-16", () => {
    expect(getCantripDiceCount(11)).toBe(3);
    expect(getCantripDiceCount(16)).toBe(3);
  });

  it("returns 4 for levels 17-20", () => {
    expect(getCantripDiceCount(17)).toBe(4);
    expect(getCantripDiceCount(20)).toBe(4);
  });
});

describe("hasSpellSlot", () => {
  it("returns true when slot available", () => {
    const slots = { "1": { max: 2, used: 0 } };
    expect(hasSpellSlot(slots, 1)).toBe(true);
  });

  it("returns false when all slots used", () => {
    const slots = { "1": { max: 2, used: 2 } };
    expect(hasSpellSlot(slots, 1)).toBe(false);
  });

  it("returns false for unavailable level", () => {
    const slots = { "1": { max: 2, used: 0 } };
    expect(hasSpellSlot(slots, 3)).toBe(false);
  });
});

describe("initializeSpellSlots", () => {
  it("initializes wizard slots at level 1", () => {
    const slots = initializeSpellSlots("wizard", 1);
    expect(slots["1"]).toEqual({ max: 2, used: 0 });
  });

  it("initializes wizard slots at level 5", () => {
    const slots = initializeSpellSlots("wizard", 5);
    expect(slots["1"]).toEqual({ max: 4, used: 0 });
    expect(slots["2"]).toEqual({ max: 3, used: 0 });
    expect(slots["3"]).toEqual({ max: 2, used: 0 });
  });

  it("returns empty for non-caster", () => {
    const slots = initializeSpellSlots("fighter", 5);
    expect(Object.keys(slots)).toHaveLength(0);
  });
});
