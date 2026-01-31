import { describe, it, expect } from "vitest";
import {
  getFeaturesForClassAtLevel,
  getExtraAttacks,
  getSneakAttackDice,
  getRageDamageBonus,
  getMartialArtsDie,
  initializeClassResources,
} from "./classFeatures";

describe("getFeaturesForClassAtLevel", () => {
  it("returns empty for unknown class", () => {
    expect(getFeaturesForClassAtLevel("unknown", 5)).toHaveLength(0);
  });

  it("returns features up to the given level", () => {
    const features = getFeaturesForClassAtLevel("fighter", 5);
    expect(features.length).toBeGreaterThan(0);
    // All features should be at level 5 or below
    for (const f of features) {
      expect(f.level).toBeLessThanOrEqual(5);
    }
  });

  it("includes second wind for fighter at level 1", () => {
    const features = getFeaturesForClassAtLevel("fighter", 1);
    expect(features.some(f => f.id === "second_wind")).toBe(true);
  });

  it("includes action surge for fighter at level 2", () => {
    const features = getFeaturesForClassAtLevel("fighter", 2);
    expect(features.some(f => f.id === "action_surge")).toBe(true);
  });

  it("does not include extra attack for fighter at level 4", () => {
    const features = getFeaturesForClassAtLevel("fighter", 4);
    expect(features.some(f => f.id === "extra_attack")).toBe(false);
  });

  it("includes extra attack for fighter at level 5", () => {
    const features = getFeaturesForClassAtLevel("fighter", 5);
    expect(features.some(f => f.id === "extra_attack")).toBe(true);
  });

  it("is case-insensitive", () => {
    const features = getFeaturesForClassAtLevel("Fighter", 5);
    expect(features.length).toBeGreaterThan(0);
  });
});

describe("getExtraAttacks", () => {
  it("returns 0 for fighter below level 5", () => {
    expect(getExtraAttacks("fighter", 4)).toBe(0);
  });

  it("returns 1 for fighter at level 5", () => {
    expect(getExtraAttacks("fighter", 5)).toBe(1);
  });

  it("returns 2 for fighter at level 11", () => {
    expect(getExtraAttacks("fighter", 11)).toBe(2);
  });

  it("returns 3 for fighter at level 20", () => {
    expect(getExtraAttacks("fighter", 20)).toBe(3);
  });

  it("returns 1 for barbarian at level 5", () => {
    expect(getExtraAttacks("barbarian", 5)).toBe(1);
  });

  it("returns 0 for rogue (no extra attack)", () => {
    expect(getExtraAttacks("rogue", 20)).toBe(0);
  });
});

describe("getSneakAttackDice", () => {
  it("returns 1 at level 1", () => {
    expect(getSneakAttackDice(1)).toBe(1);
  });

  it("returns 2 at level 3", () => {
    expect(getSneakAttackDice(3)).toBe(2);
  });

  it("returns 5 at level 9", () => {
    expect(getSneakAttackDice(9)).toBe(5);
  });

  it("returns 10 at level 19", () => {
    expect(getSneakAttackDice(19)).toBe(10);
  });
});

describe("getRageDamageBonus", () => {
  it("returns 2 for low levels", () => {
    expect(getRageDamageBonus(1)).toBe(2);
    expect(getRageDamageBonus(8)).toBe(2);
  });

  it("returns 3 for mid levels", () => {
    expect(getRageDamageBonus(9)).toBe(3);
    expect(getRageDamageBonus(15)).toBe(3);
  });

  it("returns 4 for high levels", () => {
    expect(getRageDamageBonus(16)).toBe(4);
    expect(getRageDamageBonus(20)).toBe(4);
  });
});

describe("getMartialArtsDie", () => {
  it("returns 1d4 for levels 1-4", () => {
    expect(getMartialArtsDie(1)).toBe("1d4");
    expect(getMartialArtsDie(4)).toBe("1d4");
  });

  it("returns 1d6 for levels 5-10", () => {
    expect(getMartialArtsDie(5)).toBe("1d6");
    expect(getMartialArtsDie(10)).toBe("1d6");
  });

  it("returns 1d8 for levels 11-16", () => {
    expect(getMartialArtsDie(11)).toBe("1d8");
    expect(getMartialArtsDie(16)).toBe("1d8");
  });

  it("returns 1d10 for levels 17-20", () => {
    expect(getMartialArtsDie(17)).toBe("1d10");
    expect(getMartialArtsDie(20)).toBe("1d10");
  });
});

describe("initializeClassResources", () => {
  it("initializes fighter resources at level 2", () => {
    const resources = initializeClassResources("fighter", 2);
    expect(resources.secondWind).toEqual({ max: 1, current: 1 });
    expect(resources.actionSurge).toEqual({ max: 1, current: 1 });
  });

  it("initializes barbarian rage at level 1", () => {
    const resources = initializeClassResources("barbarian", 1);
    expect(resources.rage).toEqual({ max: 2, current: 2 });
  });

  it("initializes monk ki at level 2", () => {
    const resources = initializeClassResources("monk", 2);
    expect(resources.ki).toEqual({ max: 2, current: 2 });
  });

  it("scales ki with level", () => {
    const resources = initializeClassResources("monk", 10);
    expect(resources.ki).toEqual({ max: 10, current: 10 });
  });

  it("returns empty for non-resource class at level 1", () => {
    const resources = initializeClassResources("rogue", 1);
    // Rogue has no explicit resources in the feature map
    expect(Object.keys(resources)).toHaveLength(0);
  });

  it("returns empty for unknown class", () => {
    const resources = initializeClassResources("unknown", 5);
    expect(Object.keys(resources)).toHaveLength(0);
  });
});
