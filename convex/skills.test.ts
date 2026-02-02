import { describe, it, expect } from "vitest";
import { canLearnTechnique, canTierUp } from "./skills";

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
