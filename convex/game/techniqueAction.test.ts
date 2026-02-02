import { describe, it, expect } from "vitest";
import { buildActivationSummary } from "./techniqueAction";

describe("buildActivationSummary", () => {
  it("formats activation for DM prompt", () => {
    const summary = buildActivationSummary({
      actorName: "Elara",
      techniqueName: "Suspension Rig",
      skillName: "Rope Arts",
      actorTier: 4,
      targetName: "Kira",
      potency: "full",
      effectsApplied: { intensityChange: 20, comfortImpact: -10 },
      context: "scene",
    });
    expect(summary).toContain("Elara");
    expect(summary).toContain("Suspension Rig");
    expect(summary).toContain("full");
    expect(summary).toContain("Kira");
  });

  it("handles no target", () => {
    const summary = buildActivationSummary({
      actorName: "Elara",
      techniqueName: "Fire Bolt",
      skillName: "Fire Magic",
      actorTier: 2,
      potency: "standard",
      effectsApplied: { damage: 4 },
      context: "combat",
    });
    expect(summary).toContain("none");
    expect(summary).not.toContain("undefined");
  });

  it("handles empty effects", () => {
    const summary = buildActivationSummary({
      actorName: "Elara",
      techniqueName: "Shadow Step",
      skillName: "Stealth",
      actorTier: 3,
      potency: "overwhelming",
      effectsApplied: {},
      context: "exploration",
    });
    expect(summary).toContain("none");
    expect(summary).toContain("overwhelming");
  });

  it("includes markdown header", () => {
    const summary = buildActivationSummary({
      actorName: "Ren",
      techniqueName: "Swift Strike",
      skillName: "Martial Arts",
      actorTier: 1,
      potency: "standard",
      effectsApplied: { damage: 3 },
      context: "combat",
    });
    expect(summary).toContain("## Technique Activated");
  });

  it("includes all effect key-value pairs", () => {
    const summary = buildActivationSummary({
      actorName: "Ren",
      techniqueName: "Parry Riposte",
      skillName: "Blade Mastery",
      actorTier: 2,
      targetName: "Goblin",
      potency: "full",
      effectsApplied: { acBonus: 2, damage: 3 },
      context: "combat",
    });
    expect(summary).toContain("acBonus: 2");
    expect(summary).toContain("damage: 3");
  });

  it("includes the narration instruction", () => {
    const summary = buildActivationSummary({
      actorName: "Ren",
      techniqueName: "Charm Person",
      skillName: "Enchantment",
      actorTier: 1,
      targetName: "Guard",
      potency: "standard",
      effectsApplied: { persuasionBonus: 3 },
      context: "social",
    });
    expect(summary).toContain("Narrate the outcome");
    expect(summary).toContain("Do NOT contradict the mechanical effects");
  });
});
