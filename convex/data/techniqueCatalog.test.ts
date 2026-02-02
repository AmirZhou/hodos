import { describe, it, expect } from "vitest";
import { ALL_TECHNIQUES, getTechniqueById, getTechniquesForSkill, getTechniquesAtTier } from "./techniqueCatalog";
import { getSkillById } from "./skillCatalog";

describe("techniqueCatalog", () => {
  it("exports all technique definitions", () => {
    expect(ALL_TECHNIQUES.length).toBeGreaterThan(0);
    for (const tech of ALL_TECHNIQUES) {
      expect(tech.id).toBeTruthy();
      expect(tech.name).toBeTruthy();
      expect(tech.skillId).toBeTruthy();
      expect(tech.tierRequired).toBeGreaterThanOrEqual(0);
      expect(tech.tierRequired).toBeLessThanOrEqual(8);
      expect(tech.contexts.length).toBeGreaterThan(0);
      expect(getSkillById(tech.skillId)).toBeDefined();
    }
  });

  it("getTechniqueById returns correct technique", () => {
    const tech = getTechniqueById("basic_binding");
    expect(tech).toBeDefined();
    expect(tech!.name).toBe("Basic Binding");
    expect(tech!.skillId).toBe("rope_arts");
  });

  it("getTechniquesForSkill returns only matching techniques", () => {
    const techs = getTechniquesForSkill("rope_arts");
    expect(techs.length).toBeGreaterThan(0);
    for (const t of techs) {
      expect(t.skillId).toBe("rope_arts");
    }
  });

  it("getTechniquesAtTier returns techniques at or below tier", () => {
    const techs = getTechniquesAtTier("rope_arts", 2);
    for (const t of techs) {
      expect(t.tierRequired).toBeLessThanOrEqual(2);
    }
  });

  it("prerequisites reference valid technique ids", () => {
    for (const tech of ALL_TECHNIQUES) {
      for (const prereq of tech.prerequisites) {
        expect(getTechniqueById(prereq)).toBeDefined();
      }
    }
  });
});
