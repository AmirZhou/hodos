import { describe, it, expect } from "vitest";
import {
  clampHp,
  clampAffinity,
  clampPercentage,
  validateStringLength,
  validateDiceString,
  parseDiceString,
} from "./validation";

describe("clampHp", () => {
  it("clamps to 0 when negative", () => {
    expect(clampHp(-5, 20)).toBe(0);
  });

  it("clamps to maxHp when exceeding", () => {
    expect(clampHp(25, 20)).toBe(20);
  });

  it("returns value when within range", () => {
    expect(clampHp(10, 20)).toBe(10);
  });

  it("handles edge cases", () => {
    expect(clampHp(0, 20)).toBe(0);
    expect(clampHp(20, 20)).toBe(20);
  });
});

describe("clampAffinity", () => {
  it("clamps to -100 minimum", () => {
    expect(clampAffinity(-150)).toBe(-100);
  });

  it("clamps to 100 maximum", () => {
    expect(clampAffinity(150)).toBe(100);
  });

  it("returns value when within range", () => {
    expect(clampAffinity(50)).toBe(50);
    expect(clampAffinity(-50)).toBe(-50);
  });
});

describe("clampPercentage", () => {
  it("clamps to 0 minimum", () => {
    expect(clampPercentage(-10)).toBe(0);
  });

  it("clamps to 100 maximum", () => {
    expect(clampPercentage(110)).toBe(100);
  });

  it("returns value when within range", () => {
    expect(clampPercentage(50)).toBe(50);
  });
});

describe("validateStringLength", () => {
  it("trims and returns valid string", () => {
    expect(validateStringLength("  hello  ", 10, "test")).toBe("hello");
  });

  it("throws for string exceeding max length", () => {
    expect(() => validateStringLength("a".repeat(101), 100, "name")).toThrow(
      "name exceeds maximum length of 100 characters"
    );
  });

  it("allows string at exact max length", () => {
    const str = "a".repeat(100);
    expect(validateStringLength(str, 100, "test")).toBe(str);
  });
});

describe("validateDiceString", () => {
  it("validates simple dice notation", () => {
    expect(validateDiceString("1d6")).toBe(true);
    expect(validateDiceString("2d8")).toBe(true);
    expect(validateDiceString("3d10")).toBe(true);
  });

  it("validates dice with modifier", () => {
    expect(validateDiceString("1d8+3")).toBe(true);
    expect(validateDiceString("2d6+5")).toBe(true);
  });

  it("validates compound dice", () => {
    expect(validateDiceString("2d6+1d4")).toBe(true);
  });

  it("validates dice with damage type suffix", () => {
    expect(validateDiceString("2d6 fire")).toBe(true);
  });

  it("rejects invalid notation", () => {
    expect(validateDiceString("abc")).toBe(false);
    expect(validateDiceString("")).toBe(false);
  });
});

describe("parseDiceString", () => {
  it("parses simple dice and returns result", () => {
    const result = parseDiceString("1d6");
    expect(result.rolls).toHaveLength(1);
    expect(result.rolls[0]).toBeGreaterThanOrEqual(1);
    expect(result.rolls[0]).toBeLessThanOrEqual(6);
    expect(result.modifier).toBe(0);
    expect(result.total).toBe(result.rolls[0]);
  });

  it("parses dice with modifier", () => {
    const result = parseDiceString("1d6+3");
    expect(result.rolls).toHaveLength(1);
    expect(result.modifier).toBe(3);
    expect(result.total).toBe(result.rolls[0] + 3);
  });

  it("parses compound dice", () => {
    const result = parseDiceString("2d6+1d4");
    expect(result.rolls).toHaveLength(3); // 2 d6 rolls + 1 d4 roll
    expect(result.modifier).toBe(0);
  });

  it("strips damage type suffix", () => {
    const result = parseDiceString("2d6 fire");
    expect(result.rolls).toHaveLength(2);
  });

  it("throws for invalid notation", () => {
    expect(() => parseDiceString("0d6")).toThrow();
    expect(() => parseDiceString("1d0")).toThrow();
  });
});
