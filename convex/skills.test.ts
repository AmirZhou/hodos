import { describe, it, expect } from "vitest";
import { canLearnTechnique, canTierUp } from "./skills";
import { XP_THRESHOLDS } from "./data/skillCatalog";

describe("canLearnTechnique", () => {
  it("returns true when tier meets requirement and prerequisites met", () => {
    expect(canLearnTechnique(3, 3, ["basic_binding"], new Set(["basic_binding"]))).toBe(true);
  });
  it("returns false when tier too low", () => {
    expect(canLearnTechnique(1, 3, [], new Set())).toBe(false);
  });
  it("returns false when prerequisite missing", () => {
    expect(canLearnTechnique(3, 3, ["basic_binding"], new Set())).toBe(false);
  });
});

describe("canTierUp", () => {
  it("returns true when XP meets threshold and below ceiling", () => {
    expect(canTierUp(50, 0, 3)).toBe(true);
  });
  it("returns false when at ceiling", () => {
    expect(canTierUp(9999, 3, 3)).toBe(false);
  });
  it("returns false when XP insufficient", () => {
    expect(canTierUp(10, 0, 3)).toBe(false);
  });
  it("returns false at max tier 8", () => {
    expect(canTierUp(9999, 8, 8)).toBe(false);
  });
});

describe("canTierUp edge cases", () => {
  it("returns true at exact threshold", () => {
    expect(canTierUp(50, 0, 3)).toBe(true); // XP_THRESHOLDS[0] = 50
  });
  it("returns false at one below threshold", () => {
    expect(canTierUp(49, 0, 3)).toBe(false);
  });
  it("returns true with excess XP", () => {
    expect(canTierUp(1000, 0, 3)).toBe(true);
  });
  it("respects ceiling at each tier", () => {
    // ceiling = 2, so can tier from 0→1 and 1→2 but not 2→3
    expect(canTierUp(50, 0, 2)).toBe(true);
    expect(canTierUp(120, 1, 2)).toBe(true);
    expect(canTierUp(220, 2, 2)).toBe(false); // at ceiling
  });
  it("handles tier 7→8 transition (highest valid)", () => {
    expect(canTierUp(1500, 7, 8)).toBe(true);
    expect(canTierUp(1499, 7, 8)).toBe(false);
  });
  it("returns false for tier 8 regardless of XP", () => {
    expect(canTierUp(99999, 8, 10)).toBe(false);
  });
  it("returns false when threshold not defined (tier 9+)", () => {
    // @ts-expect-error — testing invalid tier
    expect(canTierUp(99999, 9, 10)).toBe(false);
  });
});

describe("XP_THRESHOLDS", () => {
  it("has thresholds for tiers 0 through 7", () => {
    for (let tier = 0; tier <= 7; tier++) {
      expect(XP_THRESHOLDS[tier]).toBeDefined();
      expect(XP_THRESHOLDS[tier]).toBeGreaterThan(0);
    }
  });
  it("thresholds increase with tier", () => {
    for (let tier = 1; tier <= 7; tier++) {
      expect(XP_THRESHOLDS[tier]).toBeGreaterThan(XP_THRESHOLDS[tier - 1]!);
    }
  });
  it("no threshold defined for tier 8 (max tier)", () => {
    expect(XP_THRESHOLDS[8]).toBeUndefined();
  });
});
