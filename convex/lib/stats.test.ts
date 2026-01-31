import { describe, it, expect } from "vitest";
import {
  abilityModifier,
  computeEquipmentBonuses,
  computeDerivedStats,
} from "./stats";

describe("abilityModifier", () => {
  it("returns correct modifier for standard scores", () => {
    expect(abilityModifier(10)).toBe(0);
    expect(abilityModifier(11)).toBe(0);
    expect(abilityModifier(12)).toBe(1);
    expect(abilityModifier(14)).toBe(2);
    expect(abilityModifier(16)).toBe(3);
    expect(abilityModifier(18)).toBe(4);
    expect(abilityModifier(20)).toBe(5);
  });

  it("handles low scores correctly", () => {
    expect(abilityModifier(8)).toBe(-1);
    expect(abilityModifier(6)).toBe(-2);
    expect(abilityModifier(1)).toBe(-5);
  });

  it("handles odd scores (rounds down)", () => {
    expect(abilityModifier(9)).toBe(-1);
    expect(abilityModifier(13)).toBe(1);
    expect(abilityModifier(15)).toBe(2);
  });
});

describe("computeEquipmentBonuses", () => {
  it("returns zeroes for empty list", () => {
    const bonuses = computeEquipmentBonuses([]);
    expect(bonuses.ac).toBe(0);
    expect(bonuses.hp).toBe(0);
    expect(bonuses.speed).toBe(0);
    expect(bonuses.strength).toBe(0);
    expect(bonuses.damageBonus).toBe(0);
  });

  it("sums stats from multiple items", () => {
    const items = [
      { stats: { ac: 2, hp: 5 }, specialAttributes: undefined },
      { stats: { ac: 1, strength: 2 }, specialAttributes: { damageBonus: 1 } },
    ];
    const bonuses = computeEquipmentBonuses(items);
    expect(bonuses.ac).toBe(3);
    expect(bonuses.hp).toBe(5);
    expect(bonuses.strength).toBe(2);
    expect(bonuses.damageBonus).toBe(1);
  });

  it("handles items with no stats gracefully", () => {
    const items = [
      { stats: {}, specialAttributes: undefined },
    ];
    const bonuses = computeEquipmentBonuses(items);
    expect(bonuses.ac).toBe(0);
  });

  it("accumulates special attributes", () => {
    const items = [
      { stats: {}, specialAttributes: { critChance: 5, spellPower: 3 } },
      { stats: {}, specialAttributes: { critChance: 3, xpBonus: 10 } },
    ];
    const bonuses = computeEquipmentBonuses(items);
    expect(bonuses.critChance).toBe(8);
    expect(bonuses.spellPower).toBe(3);
    expect(bonuses.xpBonus).toBe(10);
  });
});

describe("computeDerivedStats", () => {
  const baseCharacter = {
    ac: 12,
    maxHp: 20,
    speed: 30,
    abilities: {
      strength: 16,
      dexterity: 14,
      constitution: 12,
      intelligence: 10,
      wisdom: 8,
      charisma: 10,
    },
    proficiencyBonus: 2,
    class: "fighter" as string | undefined,
  };

  const zeroBonuses = computeEquipmentBonuses([]);

  it("computes effective AC with equipment bonus", () => {
    const bonuses = { ...zeroBonuses, ac: 3 };
    const stats = computeDerivedStats(baseCharacter, bonuses);
    expect(stats.effectiveAc).toBe(15);
  });

  it("computes effective max HP with equipment bonus", () => {
    const bonuses = { ...zeroBonuses, hp: 10 };
    const stats = computeDerivedStats(baseCharacter, bonuses);
    expect(stats.effectiveMaxHp).toBe(30);
  });

  it("computes effective speed with equipment bonus", () => {
    const bonuses = { ...zeroBonuses, speed: 10 };
    const stats = computeDerivedStats(baseCharacter, bonuses);
    expect(stats.effectiveSpeed).toBe(40);
  });

  it("computes ability modifiers correctly", () => {
    const stats = computeDerivedStats(baseCharacter, zeroBonuses);
    expect(stats.abilityModifiers.strength).toBe(3);
    expect(stats.abilityModifiers.dexterity).toBe(2);
    expect(stats.abilityModifiers.constitution).toBe(1);
    expect(stats.abilityModifiers.intelligence).toBe(0);
    expect(stats.abilityModifiers.wisdom).toBe(-1);
    expect(stats.abilityModifiers.charisma).toBe(0);
  });

  it("computes attack bonus for fighter (STR-based)", () => {
    const stats = computeDerivedStats(baseCharacter, zeroBonuses);
    // fighter = STR class, proficiency 2 + STR mod 3 = 5
    expect(stats.attackBonus).toBe(5);
  });

  it("computes attack bonus for rogue (DEX-based)", () => {
    const rogue = { ...baseCharacter, class: "rogue" };
    const stats = computeDerivedStats(rogue, zeroBonuses);
    // rogue = DEX class, proficiency 2 + DEX mod 2 = 4
    expect(stats.attackBonus).toBe(4);
  });

  it("computes spell save DC for wizard", () => {
    const wizard = { ...baseCharacter, class: "wizard" };
    const stats = computeDerivedStats(wizard, zeroBonuses);
    // 8 + proficiency 2 + INT mod 0 = 10
    expect(stats.spellSaveDC).toBe(10);
  });

  it("applies equipment ability bonuses", () => {
    const bonuses = { ...zeroBonuses, strength: 4 };
    const stats = computeDerivedStats(baseCharacter, bonuses);
    expect(stats.effectiveAbilities.strength).toBe(20);
    expect(stats.abilityModifiers.strength).toBe(5);
  });
});
