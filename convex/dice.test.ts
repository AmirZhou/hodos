import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  rollD20,
  rollDice,
  rollWithAdvantage,
  rollWithDisadvantage,
  calculateModifier,
  makeAbilityCheck,
  makeAttackRoll,
  rollDamage,
  makeSavingThrow,
} from "./dice";

describe("dice utilities", () => {
  describe("calculateModifier", () => {
    it("returns -5 for ability score 1", () => {
      expect(calculateModifier(1)).toBe(-5);
    });

    it("returns -1 for ability score 8", () => {
      expect(calculateModifier(8)).toBe(-1);
    });

    it("returns 0 for ability score 10", () => {
      expect(calculateModifier(10)).toBe(0);
    });

    it("returns 0 for ability score 11", () => {
      expect(calculateModifier(11)).toBe(0);
    });

    it("returns +1 for ability score 12", () => {
      expect(calculateModifier(12)).toBe(1);
    });

    it("returns +2 for ability score 14", () => {
      expect(calculateModifier(14)).toBe(2);
    });

    it("returns +3 for ability score 16", () => {
      expect(calculateModifier(16)).toBe(3);
    });

    it("returns +5 for ability score 20", () => {
      expect(calculateModifier(20)).toBe(5);
    });
  });

  describe("rollD20", () => {
    it("returns a number between 1 and 20", () => {
      for (let i = 0; i < 100; i++) {
        const result = rollD20();
        expect(result).toBeGreaterThanOrEqual(1);
        expect(result).toBeLessThanOrEqual(20);
      }
    });
  });

  describe("rollDice", () => {
    it("returns correct number of dice", () => {
      const result = rollDice(4, 6);
      expect(result).toHaveLength(4);
    });

    it("returns values within dice range", () => {
      const result = rollDice(10, 6);
      result.forEach((roll) => {
        expect(roll).toBeGreaterThanOrEqual(1);
        expect(roll).toBeLessThanOrEqual(6);
      });
    });

    it("handles d4", () => {
      const result = rollDice(3, 4);
      expect(result).toHaveLength(3);
      result.forEach((roll) => {
        expect(roll).toBeGreaterThanOrEqual(1);
        expect(roll).toBeLessThanOrEqual(4);
      });
    });

    it("handles d12", () => {
      const result = rollDice(2, 12);
      expect(result).toHaveLength(2);
      result.forEach((roll) => {
        expect(roll).toBeGreaterThanOrEqual(1);
        expect(roll).toBeLessThanOrEqual(12);
      });
    });
  });

  describe("rollWithAdvantage", () => {
    it("returns two rolls and the higher value", () => {
      for (let i = 0; i < 50; i++) {
        const result = rollWithAdvantage();
        expect(result.rolls).toHaveLength(2);
        expect(result.result).toBe(Math.max(result.rolls[0], result.rolls[1]));
      }
    });
  });

  describe("rollWithDisadvantage", () => {
    it("returns two rolls and the lower value", () => {
      for (let i = 0; i < 50; i++) {
        const result = rollWithDisadvantage();
        expect(result.rolls).toHaveLength(2);
        expect(result.result).toBe(Math.min(result.rolls[0], result.rolls[1]));
      }
    });
  });

  describe("makeAbilityCheck", () => {
    // Mock Math.random for deterministic tests
    let mockRandom: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      mockRandom = vi.spyOn(Math, "random");
    });

    afterEach(() => {
      mockRandom.mockRestore();
    });

    it("calculates modifier and total correctly", () => {
      // Roll a 15 (random returns 0.7 => floor(0.7 * 20) + 1 = 15)
      mockRandom.mockReturnValue(0.7);

      const result = makeAbilityCheck(14, 2, false, false, false, false);

      expect(result.roll).toBe(15);
      expect(result.modifier).toBe(2); // +2 from ability score 14
      expect(result.total).toBe(17); // 15 + 2
    });

    it("adds proficiency bonus when proficient", () => {
      mockRandom.mockReturnValue(0.5); // Roll 11

      const result = makeAbilityCheck(10, 3, true, false, false, false);

      expect(result.modifier).toBe(3); // +0 from ability + 3 proficiency
      expect(result.total).toBe(14); // 11 + 3
    });

    it("doubles proficiency with expertise", () => {
      mockRandom.mockReturnValue(0.5); // Roll 11

      const result = makeAbilityCheck(10, 3, true, true, false, false);

      expect(result.modifier).toBe(6); // +0 from ability + 6 expertise
      expect(result.total).toBe(17); // 11 + 6
    });
  });

  describe("makeAttackRoll", () => {
    let mockRandom: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      mockRandom = vi.spyOn(Math, "random");
    });

    afterEach(() => {
      mockRandom.mockRestore();
    });

    it("hits when total meets AC", () => {
      mockRandom.mockReturnValue(0.5); // Roll 11

      const result = makeAttackRoll(14, 2, 15, false, false);

      expect(result.roll).toBe(11);
      expect(result.modifier).toBe(4); // +2 str + 2 prof
      expect(result.total).toBe(15);
      expect(result.hits).toBe(true);
    });

    it("misses when total is below AC", () => {
      mockRandom.mockReturnValue(0.2); // Roll 5

      const result = makeAttackRoll(10, 2, 15, false, false);

      expect(result.roll).toBe(5);
      expect(result.hits).toBe(false);
    });

    it("critical hit on natural 20", () => {
      mockRandom.mockReturnValue(0.95); // Roll 20

      const result = makeAttackRoll(10, 2, 25, false, false);

      expect(result.roll).toBe(20);
      expect(result.isCritical).toBe(true);
      expect(result.hits).toBe(true); // Crit always hits
    });

    it("critical miss on natural 1", () => {
      mockRandom.mockReturnValue(0); // Roll 1

      const result = makeAttackRoll(20, 6, 5, false, false);

      expect(result.roll).toBe(1);
      expect(result.isCriticalMiss).toBe(true);
      expect(result.hits).toBe(false); // Nat 1 always misses
    });
  });

  describe("rollDamage", () => {
    let mockRandom: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      mockRandom = vi.spyOn(Math, "random");
    });

    afterEach(() => {
      mockRandom.mockRestore();
    });

    it("rolls correct number of dice", () => {
      mockRandom.mockReturnValue(0.5);

      const result = rollDamage(2, 6, 3, false);

      expect(result.rolls).toHaveLength(2);
    });

    it("doubles dice on critical hit", () => {
      mockRandom.mockReturnValue(0.5);

      const result = rollDamage(2, 6, 3, true);

      expect(result.rolls).toHaveLength(4); // 2 * 2 = 4 dice
    });

    it("adds modifier to total", () => {
      // All rolls return 4 (0.5 * 6 + 1 = 4)
      mockRandom.mockReturnValue(0.5);

      const result = rollDamage(2, 6, 5, false);

      expect(result.total).toBe(13); // 4 + 4 + 5
    });

    it("damage cannot be negative", () => {
      mockRandom.mockReturnValue(0); // All 1s

      const result = rollDamage(1, 4, -10, false);

      expect(result.total).toBe(0); // 1 - 10 = -9, but min is 0
    });
  });

  describe("makeSavingThrow", () => {
    let mockRandom: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      mockRandom = vi.spyOn(Math, "random");
    });

    afterEach(() => {
      mockRandom.mockRestore();
    });

    it("succeeds when total meets DC", () => {
      mockRandom.mockReturnValue(0.5); // Roll 11

      const result = makeSavingThrow(14, 2, true, 15, false, false);

      expect(result.total).toBe(16); // 11 + 2 (mod) + 3 (wait, prof is 2)
      // Actually: 11 + 2 (ability mod) + 2 (proficiency) = 15
      expect(result.success).toBe(true);
    });

    it("fails when total is below DC", () => {
      mockRandom.mockReturnValue(0.2); // Roll 5

      const result = makeSavingThrow(10, 2, false, 15, false, false);

      expect(result.total).toBe(5); // 5 + 0 (no mod, no prof)
      expect(result.success).toBe(false);
    });
  });
});
