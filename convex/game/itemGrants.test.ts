import { describe, it, expect } from "vitest";
import { validateItemGrants, type RawItemGrant } from "./itemGrants";

describe("validateItemGrants", () => {
  const defaults = { characterLevel: 1, maxPerResponse: 3 };

  it("returns empty array for undefined input", () => {
    expect(validateItemGrants(undefined, defaults)).toEqual({
      valid: [],
      warnings: [],
    });
  });

  it("returns empty array for non-array input", () => {
    expect(validateItemGrants("not an array" as any, defaults)).toEqual({
      valid: [],
      warnings: [],
    });
  });

  it("accepts a valid mundane item", () => {
    const input: RawItemGrant[] = [
      { itemId: "boots_gray_01", source: "found", reason: "Found on the ground" },
    ];
    const result = validateItemGrants(input, defaults);
    expect(result.valid).toHaveLength(1);
    expect(result.valid[0].itemId).toBe("boots_gray_01");
    expect(result.warnings).toHaveLength(0);
  });

  it("rejects invalid item IDs with a warning", () => {
    const input: RawItemGrant[] = [
      { itemId: "does_not_exist_99", source: "loot", reason: "Dropped" },
    ];
    const result = validateItemGrants(input, defaults);
    expect(result.valid).toHaveLength(0);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("does_not_exist_99");
  });

  it("deduplicates items within the same response", () => {
    const input: RawItemGrant[] = [
      { itemId: "boots_gray_01", source: "loot", reason: "First" },
      { itemId: "boots_gray_01", source: "loot", reason: "Duplicate" },
    ];
    const result = validateItemGrants(input, defaults);
    expect(result.valid).toHaveLength(1);
    expect(result.warnings.some((w) => w.includes("duplicate"))).toBe(true);
  });

  it("enforces max items per response", () => {
    const input: RawItemGrant[] = [
      { itemId: "boots_gray_01", source: "loot", reason: "1" },
      { itemId: "boots_gray_02", source: "loot", reason: "2" },
      { itemId: "boots_white_01", source: "loot", reason: "3" },
      { itemId: "boots_white_02", source: "loot", reason: "4" },
    ];
    const result = validateItemGrants(input, { ...defaults, maxPerResponse: 3 });
    expect(result.valid).toHaveLength(3);
    expect(result.warnings.some((w) => w.includes("limit"))).toBe(true);
  });

  it("blocks rare items for level 1 characters", () => {
    const input: RawItemGrant[] = [
      { itemId: "head_blue_01", source: "gift", reason: "Crown of Command" },
    ];
    const result = validateItemGrants(input, { characterLevel: 1, maxPerResponse: 3 });
    expect(result.valid).toHaveLength(0);
    expect(result.warnings.some((w) => w.includes("rarity"))).toBe(true);
  });

  it("allows rare items for level 5+ characters", () => {
    const input: RawItemGrant[] = [
      { itemId: "head_blue_01", source: "gift", reason: "Crown of Command" },
    ];
    const result = validateItemGrants(input, { characterLevel: 5, maxPerResponse: 3 });
    expect(result.valid).toHaveLength(1);
  });

  it("blocks epic items for level 5 characters", () => {
    const input: RawItemGrant[] = [
      { itemId: "head_epic_01", source: "reward", reason: "Diadem" },
    ];
    const result = validateItemGrants(input, { characterLevel: 5, maxPerResponse: 3 });
    expect(result.valid).toHaveLength(0);
    expect(result.warnings.some((w) => w.includes("rarity"))).toBe(true);
  });

  it("allows epic items for level 10+ characters", () => {
    const input: RawItemGrant[] = [
      { itemId: "head_epic_01", source: "reward", reason: "Diadem" },
    ];
    const result = validateItemGrants(input, { characterLevel: 10, maxPerResponse: 3 });
    expect(result.valid).toHaveLength(1);
  });

  it("blocks legendary items for level 10 characters", () => {
    const input: RawItemGrant[] = [
      { itemId: "head_legendary_01", source: "reward", reason: "Veil" },
    ];
    const result = validateItemGrants(input, { characterLevel: 10, maxPerResponse: 3 });
    expect(result.valid).toHaveLength(0);
  });

  it("allows legendary items for level 15+ characters", () => {
    const input: RawItemGrant[] = [
      { itemId: "head_legendary_01", source: "reward", reason: "Veil" },
    ];
    const result = validateItemGrants(input, { characterLevel: 15, maxPerResponse: 3 });
    expect(result.valid).toHaveLength(1);
  });

  it("skips grants with missing itemId", () => {
    const input = [
      { source: "loot", reason: "No id" } as any,
      { itemId: "", source: "loot", reason: "Empty id" },
    ];
    const result = validateItemGrants(input, defaults);
    expect(result.valid).toHaveLength(0);
    expect(result.warnings.length).toBeGreaterThanOrEqual(2);
  });

  it("skips grants with non-string itemId", () => {
    const input = [{ itemId: 123, source: "loot", reason: "Number id" } as any];
    const result = validateItemGrants(input, defaults);
    expect(result.valid).toHaveLength(0);
    expect(result.warnings).toHaveLength(1);
  });

  it("handles mixed valid and invalid grants", () => {
    const input: RawItemGrant[] = [
      { itemId: "boots_gray_01", source: "found", reason: "Valid" },
      { itemId: "fake_item", source: "loot", reason: "Invalid" },
      { itemId: "head_legendary_01", source: "reward", reason: "Too rare" },
    ];
    const result = validateItemGrants(input, defaults);
    expect(result.valid).toHaveLength(1);
    expect(result.valid[0].itemId).toBe("boots_gray_01");
    expect(result.warnings).toHaveLength(2);
  });
});
