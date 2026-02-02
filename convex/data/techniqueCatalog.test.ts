import { describe, it, expect } from "vitest";
import { ALL_TECHNIQUES, getTechniqueById, getTechniquesForSkill, getTechniquesAtTier } from "./techniqueCatalog";
import { getSkillById } from "./skillCatalog";
import { RIVERMOOT_NPC_SKILLS } from "./rivermootNpcSkills";

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

describe("rivermoot NPC skill assignments", () => {
  it("all NPC technique IDs exist in the technique catalog", () => {
    for (const [npcId, skills] of Object.entries(RIVERMOOT_NPC_SKILLS)) {
      for (const assignment of skills) {
        for (const techId of assignment.techniques) {
          const tech = getTechniqueById(techId);
          expect(tech, `NPC ${npcId}: technique "${techId}" not found in catalog`).toBeDefined();
        }
      }
    }
  });

  it("NPC techniques belong to the assigned skill", () => {
    for (const [npcId, skills] of Object.entries(RIVERMOOT_NPC_SKILLS)) {
      for (const assignment of skills) {
        for (const techId of assignment.techniques) {
          const tech = getTechniqueById(techId);
          if (tech) {
            expect(tech.skillId, `NPC ${npcId}: technique "${techId}" belongs to "${tech.skillId}" not "${assignment.skillId}"`).toBe(assignment.skillId);
          }
        }
      }
    }
  });

  it("NPC skill tiers are within valid range 0-8", () => {
    for (const [npcId, skills] of Object.entries(RIVERMOOT_NPC_SKILLS)) {
      for (const assignment of skills) {
        expect(assignment.tier, `NPC ${npcId}: skill "${assignment.skillId}" tier ${assignment.tier} out of range`).toBeGreaterThanOrEqual(0);
        expect(assignment.tier, `NPC ${npcId}: skill "${assignment.skillId}" tier ${assignment.tier} out of range`).toBeLessThanOrEqual(8);
      }
    }
  });

  it("NPC technique tier requirements don't exceed NPC skill tier", () => {
    for (const [npcId, skills] of Object.entries(RIVERMOOT_NPC_SKILLS)) {
      for (const assignment of skills) {
        for (const techId of assignment.techniques) {
          const tech = getTechniqueById(techId);
          if (tech) {
            expect(tech.tierRequired, `NPC ${npcId}: technique "${techId}" requires tier ${tech.tierRequired} but NPC skill tier is ${assignment.tier}`).toBeLessThanOrEqual(assignment.tier);
          }
        }
      }
    }
  });
});
