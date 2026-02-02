import { describe, it, expect } from "vitest";
import { ALL_SKILLS, getSkillById, getSkillsByCategory, SKILL_CATEGORIES, TIER_LABELS } from "./skillCatalog";

describe("skillCatalog", () => {
  it("exports all skill definitions", () => {
    expect(ALL_SKILLS.length).toBeGreaterThan(0);
    for (const skill of ALL_SKILLS) {
      expect(skill.id).toBeTruthy();
      expect(skill.name).toBeTruthy();
      expect(SKILL_CATEGORIES).toContain(skill.category);
      expect(skill.baseAbility).toBeTruthy();
      expect(skill.counterAbility).toBeTruthy();
    }
  });

  it("getSkillById returns correct skill", () => {
    const skill = getSkillById("rope_arts");
    expect(skill).toBeDefined();
    expect(skill!.name).toBe("Rope Arts");
    expect(skill!.category).toBe("intimate");
  });

  it("getSkillById returns undefined for unknown id", () => {
    expect(getSkillById("nonexistent")).toBeUndefined();
  });

  it("getSkillsByCategory returns only matching skills", () => {
    const intimate = getSkillsByCategory("intimate");
    expect(intimate.length).toBeGreaterThan(0);
    for (const s of intimate) {
      expect(s.category).toBe("intimate");
    }
  });

  it("TIER_LABELS has 9 entries for tiers 0-8", () => {
    expect(Object.keys(TIER_LABELS)).toHaveLength(9);
    expect(TIER_LABELS[0]).toBe("Untrained");
    expect(TIER_LABELS[8]).toBe("Legendary");
  });
});
