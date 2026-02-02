# Unified Skill & Technique System — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the flat skills system with a unified framework where characters and NPCs have skill tiers (0-8), learnable techniques with deterministic resolution, practice-based progression, and NPC-gated ceilings.

**Architecture:** Shared skill/technique catalogs in `convex/data/`, per-entity state in new Convex tables, a deterministic resolution engine in `convex/lib/techniqueResolution.ts`, XP awarded by code (not AI), and AI DM relegated to narrator for technique activations. Freeform actions still go through the DM for rolls.

**Tech Stack:** Convex (schema, queries, mutations, actions), TypeScript, Vitest, React (UI components)

**Design doc:** `docs/plans/2026-02-02-unified-skill-technique-system-design.md`

---

## Task 1: Skill & Technique Catalog Data Files

**Files:**
- Create: `convex/data/skillCatalog.ts`
- Create: `convex/data/techniqueCatalog.ts`
- Test: `convex/data/skillCatalog.test.ts`

**Step 1: Write the failing test for skill catalog**

```typescript
// convex/data/skillCatalog.test.ts
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
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run convex/data/skillCatalog.test.ts`
Expected: FAIL — module not found

**Step 3: Write the skill catalog**

```typescript
// convex/data/skillCatalog.ts

export const SKILL_CATEGORIES = [
  "combat", "magic", "social", "intimate", "utility",
] as const;
export type SkillCategory = (typeof SKILL_CATEGORIES)[number];

export const TIER_LABELS: Record<number, string> = {
  0: "Untrained",
  1: "Novice",
  2: "Apprentice",
  3: "Journeyman",
  4: "Adept",
  5: "Expert",
  6: "Master",
  7: "Grandmaster",
  8: "Legendary",
};

export const XP_THRESHOLDS: Record<number, number> = {
  0: 50,     // 0 -> 1
  1: 120,    // 1 -> 2
  2: 220,    // 2 -> 3
  3: 360,    // 3 -> 4
  4: 550,    // 4 -> 5
  5: 800,    // 5 -> 6
  6: 1100,   // 6 -> 7
  7: 1500,   // 7 -> 8
};

export type Ability = "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";

export interface SkillDefinition {
  id: string;
  name: string;
  category: SkillCategory;
  baseAbility: Ability;
  counterAbility: Ability;
  description: string;
}

export const ALL_SKILLS: SkillDefinition[] = [
  // === COMBAT ===
  { id: "martial_arts", name: "Martial Arts", category: "combat", baseAbility: "dexterity", counterAbility: "dexterity", description: "Unarmed fighting techniques — strikes, grapples, and defensive forms." },
  { id: "blade_mastery", name: "Blade Mastery", category: "combat", baseAbility: "dexterity", counterAbility: "dexterity", description: "Sword and dagger techniques — cuts, thrusts, and parries." },
  { id: "heavy_weapons", name: "Heavy Weapons", category: "combat", baseAbility: "strength", counterAbility: "constitution", description: "Axes, hammers, and greatweapons — powerful strikes and cleaves." },
  { id: "archery", name: "Archery", category: "combat", baseAbility: "dexterity", counterAbility: "dexterity", description: "Bow and crossbow techniques — precision and trick shots." },
  { id: "shield_craft", name: "Shield Craft", category: "combat", baseAbility: "strength", counterAbility: "strength", description: "Defensive techniques — blocks, bashes, and formations." },
  { id: "dirty_fighting", name: "Dirty Fighting", category: "combat", baseAbility: "dexterity", counterAbility: "wisdom", description: "Underhanded tactics — feints, low blows, and environmental exploits." },

  // === MAGIC ===
  { id: "fire_magic", name: "Fire Magic", category: "magic", baseAbility: "intelligence", counterAbility: "constitution", description: "Pyromancy — conjuring and controlling flames." },
  { id: "ice_magic", name: "Ice Magic", category: "magic", baseAbility: "intelligence", counterAbility: "constitution", description: "Cryomancy — freezing, chilling, and ice constructs." },
  { id: "healing_magic", name: "Healing Magic", category: "magic", baseAbility: "wisdom", counterAbility: "wisdom", description: "Restoration — mending wounds, curing ailments, and bolstering vitality." },
  { id: "enchantment", name: "Enchantment", category: "magic", baseAbility: "charisma", counterAbility: "wisdom", description: "Mind-affecting magic — charm, suggestion, and compulsion." },
  { id: "shadow_magic", name: "Shadow Magic", category: "magic", baseAbility: "intelligence", counterAbility: "wisdom", description: "Darkness and illusion — concealment, fear, and manipulation." },
  { id: "divine_magic", name: "Divine Magic", category: "magic", baseAbility: "wisdom", counterAbility: "charisma", description: "Holy power — smiting, warding, and divine favor." },

  // === SOCIAL ===
  { id: "persuasion", name: "Persuasion", category: "social", baseAbility: "charisma", counterAbility: "wisdom", description: "Convincing others through reason, charm, and appeal." },
  { id: "intimidation", name: "Intimidation", category: "social", baseAbility: "charisma", counterAbility: "wisdom", description: "Coercing through threats, presence, and displays of power." },
  { id: "deception", name: "Deception", category: "social", baseAbility: "charisma", counterAbility: "wisdom", description: "Lying, misdirection, and maintaining false pretenses." },
  { id: "seduction", name: "Seduction", category: "social", baseAbility: "charisma", counterAbility: "wisdom", description: "Attraction, flirtation, and romantic manipulation." },

  // === INTIMATE ===
  { id: "rope_arts", name: "Rope Arts", category: "intimate", baseAbility: "dexterity", counterAbility: "strength", description: "The art of binding — knots, restraints, and suspension." },
  { id: "impact_technique", name: "Impact Technique", category: "intimate", baseAbility: "dexterity", counterAbility: "constitution", description: "Striking for pleasure — spanking, flogging, and precision impact." },
  { id: "sensation_craft", name: "Sensation Craft", category: "intimate", baseAbility: "wisdom", counterAbility: "constitution", description: "Sensation play — temperature, texture, and nerve stimulation." },
  { id: "domination", name: "Domination", category: "intimate", baseAbility: "charisma", counterAbility: "wisdom", description: "Power exchange from the top — commands, control, and presence." },
  { id: "submission_arts", name: "Submission Arts", category: "intimate", baseAbility: "wisdom", counterAbility: "charisma", description: "Power exchange from the bottom — grace, endurance, and surrender." },
  { id: "aftercare", name: "Aftercare", category: "intimate", baseAbility: "wisdom", counterAbility: "wisdom", description: "Post-scene care — emotional support, physical comfort, and recovery." },
  { id: "edge_play", name: "Edge Play", category: "intimate", baseAbility: "wisdom", counterAbility: "constitution", description: "Pushing limits — controlled risk, intensity management, and reading boundaries." },

  // === UTILITY ===
  { id: "stealth", name: "Stealth", category: "utility", baseAbility: "dexterity", counterAbility: "wisdom", description: "Moving unseen — sneaking, hiding, and shadow movement." },
  { id: "lockpicking", name: "Lockpicking", category: "utility", baseAbility: "dexterity", counterAbility: "dexterity", description: "Opening locks and disabling mechanisms." },
  { id: "perception", name: "Perception", category: "utility", baseAbility: "wisdom", counterAbility: "dexterity", description: "Noticing details — traps, hidden objects, and subtle cues." },
  { id: "herbalism", name: "Herbalism", category: "utility", baseAbility: "intelligence", counterAbility: "intelligence", description: "Plant lore — potions, poisons, and natural remedies." },
  { id: "negotiation", name: "Negotiation", category: "utility", baseAbility: "charisma", counterAbility: "charisma", description: "Deal-making — consent negotiation, trade, and contracts." },
];

export function getSkillById(id: string): SkillDefinition | undefined {
  return ALL_SKILLS.find((s) => s.id === id);
}

export function getSkillsByCategory(category: SkillCategory): SkillDefinition[] {
  return ALL_SKILLS.filter((s) => s.category === category);
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run convex/data/skillCatalog.test.ts`
Expected: PASS

**Step 5: Write the failing test for technique catalog**

Create `convex/data/techniqueCatalog.test.ts`:

```typescript
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
      // Every technique references a valid skill
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
```

**Step 6: Run test to verify it fails**

Run: `npx vitest run convex/data/techniqueCatalog.test.ts`
Expected: FAIL — module not found

**Step 7: Write the technique catalog**

```typescript
// convex/data/techniqueCatalog.ts

export type TechniqueContext = "combat" | "scene" | "social" | "exploration";

export interface TechniqueEffects {
  combat?: {
    damage?: string;         // dice notation e.g. "2d6"
    damageType?: string;     // fire, cold, bludgeoning, etc.
    condition?: string;      // restrained, stunned, etc.
    conditionDuration?: number; // rounds
    acBonus?: number;
    tempHp?: number;
    healing?: string;        // dice notation
  };
  scene?: {
    intensityChange?: number;
    comfortImpact?: number;
    moodShift?: string;
  };
  social?: {
    persuasionBonus?: number;
    intimidationBonus?: number;
    insightReveal?: boolean;
  };
  exploration?: {
    stealthBonus?: number;
    perceptionBonus?: number;
    trapDisable?: boolean;
  };
}

export interface TechniqueDefinition {
  id: string;
  name: string;
  skillId: string;
  tierRequired: number;
  description: string;
  contexts: TechniqueContext[];
  prerequisites: string[];       // technique IDs
  effects: TechniqueEffects;
  rollBonus: number;
  cooldown: number;              // actions/rounds before reuse, 0 = no cooldown
  teachable: boolean;
}

export const ALL_TECHNIQUES: TechniqueDefinition[] = [
  // ======== ROPE ARTS (intimate) ========
  { id: "basic_binding", name: "Basic Binding", skillId: "rope_arts", tierRequired: 1, description: "Simple wrist and ankle restraints using basic knots.", contexts: ["scene"], prerequisites: [], effects: { scene: { intensityChange: 5, comfortImpact: -3 } }, rollBonus: 1, cooldown: 0, teachable: true },
  { id: "double_column_tie", name: "Double Column Tie", skillId: "rope_arts", tierRequired: 2, description: "Secure two-point restraint that distributes pressure safely.", contexts: ["scene"], prerequisites: ["basic_binding"], effects: { scene: { intensityChange: 8, comfortImpact: -2 } }, rollBonus: 2, cooldown: 0, teachable: true },
  { id: "chest_harness", name: "Chest Harness", skillId: "rope_arts", tierRequired: 3, description: "Decorative and functional upper body harness.", contexts: ["scene"], prerequisites: ["double_column_tie"], effects: { scene: { intensityChange: 12, comfortImpact: -4 } }, rollBonus: 3, cooldown: 0, teachable: true },
  { id: "suspension_rig", name: "Suspension Rig", skillId: "rope_arts", tierRequired: 5, description: "Full or partial suspension bondage requiring expert knowledge.", contexts: ["scene"], prerequisites: ["chest_harness"], effects: { scene: { intensityChange: 20, comfortImpact: -8 } }, rollBonus: 5, cooldown: 2, teachable: true },
  { id: "combat_binding", name: "Combat Binding", skillId: "rope_arts", tierRequired: 3, description: "Rapid restraint in combat — tangling limbs and restricting movement.", contexts: ["combat"], prerequisites: ["basic_binding"], effects: { combat: { condition: "restrained", conditionDuration: 2 } }, rollBonus: 3, cooldown: 3, teachable: true },

  // ======== IMPACT TECHNIQUE (intimate) ========
  { id: "open_hand_strike", name: "Open Hand Strike", skillId: "impact_technique", tierRequired: 1, description: "Basic spanking with controlled force.", contexts: ["scene"], prerequisites: [], effects: { scene: { intensityChange: 6, comfortImpact: -2 } }, rollBonus: 1, cooldown: 0, teachable: true },
  { id: "rhythmic_flogging", name: "Rhythmic Flogging", skillId: "impact_technique", tierRequired: 3, description: "Steady rhythmic strikes building sensation over time.", contexts: ["scene"], prerequisites: ["open_hand_strike"], effects: { scene: { intensityChange: 10, comfortImpact: -5 } }, rollBonus: 3, cooldown: 1, teachable: true },
  { id: "precision_strike", name: "Precision Strike", skillId: "impact_technique", tierRequired: 5, description: "Pinpoint accuracy targeting specific nerve clusters for maximum effect.", contexts: ["scene"], prerequisites: ["rhythmic_flogging"], effects: { scene: { intensityChange: 15, comfortImpact: -3 } }, rollBonus: 5, cooldown: 1, teachable: true },

  // ======== SENSATION CRAFT (intimate) ========
  { id: "temperature_play", name: "Temperature Play", skillId: "sensation_craft", tierRequired: 1, description: "Using ice and warmth to stimulate nerve endings.", contexts: ["scene"], prerequisites: [], effects: { scene: { intensityChange: 5, comfortImpact: -1 } }, rollBonus: 1, cooldown: 0, teachable: true },
  { id: "feather_touch", name: "Feather Touch", skillId: "sensation_craft", tierRequired: 2, description: "Barely-there contact that heightens anticipation.", contexts: ["scene"], prerequisites: ["temperature_play"], effects: { scene: { intensityChange: 4, comfortImpact: 2 } }, rollBonus: 2, cooldown: 0, teachable: true },
  { id: "nerve_mapping", name: "Nerve Mapping", skillId: "sensation_craft", tierRequired: 4, description: "Precise stimulation of erogenous zones based on partner's responses.", contexts: ["scene"], prerequisites: ["feather_touch"], effects: { scene: { intensityChange: 12, comfortImpact: 3 } }, rollBonus: 4, cooldown: 1, teachable: true },

  // ======== DOMINATION (intimate) ========
  { id: "commanding_presence", name: "Commanding Presence", skillId: "domination", tierRequired: 1, description: "Projecting authority through posture, tone, and eye contact.", contexts: ["scene", "social"], prerequisites: [], effects: { scene: { intensityChange: 4, comfortImpact: 0 }, social: { intimidationBonus: 2 } }, rollBonus: 1, cooldown: 0, teachable: true },
  { id: "verbal_control", name: "Verbal Control", skillId: "domination", tierRequired: 2, description: "Using specific language patterns to guide and direct.", contexts: ["scene"], prerequisites: ["commanding_presence"], effects: { scene: { intensityChange: 6, comfortImpact: -1 } }, rollBonus: 2, cooldown: 0, teachable: true },
  { id: "scene_orchestration", name: "Scene Orchestration", skillId: "domination", tierRequired: 5, description: "Complete control of a scene's arc — pacing, intensity, and emotional journey.", contexts: ["scene"], prerequisites: ["verbal_control"], effects: { scene: { intensityChange: 8, comfortImpact: 5 } }, rollBonus: 5, cooldown: 3, teachable: true },

  // ======== SUBMISSION ARTS (intimate) ========
  { id: "graceful_surrender", name: "Graceful Surrender", skillId: "submission_arts", tierRequired: 1, description: "Yielding control with poise and intention.", contexts: ["scene"], prerequisites: [], effects: { scene: { intensityChange: 3, comfortImpact: 2 } }, rollBonus: 1, cooldown: 0, teachable: true },
  { id: "endurance_stance", name: "Endurance Stance", skillId: "submission_arts", tierRequired: 3, description: "Maintaining position under duress — physical and mental resilience.", contexts: ["scene"], prerequisites: ["graceful_surrender"], effects: { scene: { intensityChange: 0, comfortImpact: 8 } }, rollBonus: 3, cooldown: 2, teachable: true },
  { id: "deep_surrender", name: "Deep Surrender", skillId: "submission_arts", tierRequired: 6, description: "Complete mental release into subspace — profound trust and vulnerability.", contexts: ["scene"], prerequisites: ["endurance_stance"], effects: { scene: { intensityChange: 15, comfortImpact: 10 } }, rollBonus: 6, cooldown: 5, teachable: true },

  // ======== AFTERCARE (intimate) ========
  { id: "gentle_touch", name: "Gentle Touch", skillId: "aftercare", tierRequired: 1, description: "Soft physical contact — stroking, holding, and warming.", contexts: ["scene"], prerequisites: [], effects: { scene: { intensityChange: -10, comfortImpact: 10 } }, rollBonus: 1, cooldown: 0, teachable: true },
  { id: "emotional_grounding", name: "Emotional Grounding", skillId: "aftercare", tierRequired: 3, description: "Guiding someone back from subspace or intense emotional states.", contexts: ["scene"], prerequisites: ["gentle_touch"], effects: { scene: { intensityChange: -20, comfortImpact: 20 } }, rollBonus: 3, cooldown: 2, teachable: true },

  // ======== EDGE PLAY (intimate) ========
  { id: "limit_reading", name: "Limit Reading", skillId: "edge_play", tierRequired: 2, description: "Sensing a partner's true boundaries through body language and micro-expressions.", contexts: ["scene"], prerequisites: [], effects: { scene: { intensityChange: 0, comfortImpact: 5 } }, rollBonus: 2, cooldown: 1, teachable: true },
  { id: "controlled_escalation", name: "Controlled Escalation", skillId: "edge_play", tierRequired: 4, description: "Pushing intensity right to the edge without crossing — maximum thrill, minimum risk.", contexts: ["scene"], prerequisites: ["limit_reading"], effects: { scene: { intensityChange: 18, comfortImpact: -2 } }, rollBonus: 4, cooldown: 2, teachable: true },

  // ======== MARTIAL ARTS (combat) ========
  { id: "basic_strike", name: "Basic Strike", skillId: "martial_arts", tierRequired: 1, description: "Fundamental punches and kicks.", contexts: ["combat"], prerequisites: [], effects: { combat: { damage: "1d6", damageType: "bludgeoning" } }, rollBonus: 1, cooldown: 0, teachable: true },
  { id: "flurry_of_blows", name: "Flurry of Blows", skillId: "martial_arts", tierRequired: 3, description: "A rapid sequence of unarmed strikes.", contexts: ["combat"], prerequisites: ["basic_strike"], effects: { combat: { damage: "3d6", damageType: "bludgeoning" } }, rollBonus: 3, cooldown: 2, teachable: true },
  { id: "stunning_fist", name: "Stunning Fist", skillId: "martial_arts", tierRequired: 5, description: "A precise strike to a pressure point that stuns the target.", contexts: ["combat"], prerequisites: ["flurry_of_blows"], effects: { combat: { damage: "2d8", damageType: "bludgeoning", condition: "stunned", conditionDuration: 1 } }, rollBonus: 5, cooldown: 3, teachable: true },
  { id: "iron_body", name: "Iron Body", skillId: "martial_arts", tierRequired: 7, description: "Channel internal energy to harden the body against harm.", contexts: ["combat"], prerequisites: ["stunning_fist"], effects: { combat: { tempHp: 20, acBonus: 3 } }, rollBonus: 7, cooldown: 5, teachable: true },

  // ======== BLADE MASTERY (combat) ========
  { id: "quick_slash", name: "Quick Slash", skillId: "blade_mastery", tierRequired: 1, description: "A fast, shallow cut.", contexts: ["combat"], prerequisites: [], effects: { combat: { damage: "1d8", damageType: "slashing" } }, rollBonus: 1, cooldown: 0, teachable: true },
  { id: "parry_riposte", name: "Parry & Riposte", skillId: "blade_mastery", tierRequired: 3, description: "Deflect an incoming attack and counter in one motion.", contexts: ["combat"], prerequisites: ["quick_slash"], effects: { combat: { damage: "2d8", damageType: "slashing", acBonus: 2 } }, rollBonus: 3, cooldown: 2, teachable: true },
  { id: "whirlwind_strike", name: "Whirlwind Strike", skillId: "blade_mastery", tierRequired: 6, description: "A spinning attack hitting all adjacent enemies.", contexts: ["combat"], prerequisites: ["parry_riposte"], effects: { combat: { damage: "4d8", damageType: "slashing" } }, rollBonus: 6, cooldown: 4, teachable: true },

  // ======== FIRE MAGIC (magic) ========
  { id: "spark", name: "Spark", skillId: "fire_magic", tierRequired: 0, description: "A tiny flame conjured at the fingertips.", contexts: ["combat", "exploration"], prerequisites: [], effects: { combat: { damage: "1d4", damageType: "fire" } }, rollBonus: 0, cooldown: 0, teachable: true },
  { id: "firebolt", name: "Firebolt", skillId: "fire_magic", tierRequired: 2, description: "A focused bolt of fire hurled at a target.", contexts: ["combat"], prerequisites: ["spark"], effects: { combat: { damage: "2d6", damageType: "fire" } }, rollBonus: 2, cooldown: 1, teachable: true },
  { id: "fireball", name: "Fireball", skillId: "fire_magic", tierRequired: 5, description: "An explosive sphere of flame.", contexts: ["combat"], prerequisites: ["firebolt"], effects: { combat: { damage: "6d6", damageType: "fire" } }, rollBonus: 5, cooldown: 3, teachable: true },
  { id: "inferno", name: "Inferno", skillId: "fire_magic", tierRequired: 8, description: "A devastating conflagration consuming everything in its path.", contexts: ["combat"], prerequisites: ["fireball"], effects: { combat: { damage: "10d6", damageType: "fire" } }, rollBonus: 8, cooldown: 6, teachable: true },

  // ======== HEALING MAGIC (magic) ========
  { id: "mend_wounds", name: "Mend Wounds", skillId: "healing_magic", tierRequired: 1, description: "Close minor wounds with a touch.", contexts: ["combat", "exploration"], prerequisites: [], effects: { combat: { healing: "1d8" } }, rollBonus: 1, cooldown: 1, teachable: true },
  { id: "restoration", name: "Restoration", skillId: "healing_magic", tierRequired: 4, description: "Purge ailments and restore vitality.", contexts: ["combat", "exploration"], prerequisites: ["mend_wounds"], effects: { combat: { healing: "3d8" } }, rollBonus: 4, cooldown: 3, teachable: true },

  // ======== ENCHANTMENT (magic) ========
  { id: "charm_gaze", name: "Charm Gaze", skillId: "enchantment", tierRequired: 1, description: "Lock eyes and plant a subtle suggestion.", contexts: ["social"], prerequisites: [], effects: { social: { persuasionBonus: 3 } }, rollBonus: 1, cooldown: 2, teachable: true },
  { id: "mesmerize", name: "Mesmerize", skillId: "enchantment", tierRequired: 4, description: "Hold a target's attention completely for a short duration.", contexts: ["social", "combat"], prerequisites: ["charm_gaze"], effects: { social: { persuasionBonus: 6 }, combat: { condition: "charmed", conditionDuration: 2 } }, rollBonus: 4, cooldown: 4, teachable: true },

  // ======== SEDUCTION (social) ========
  { id: "flirtatious_banter", name: "Flirtatious Banter", skillId: "seduction", tierRequired: 1, description: "Playful conversation that raises interest.", contexts: ["social"], prerequisites: [], effects: { social: { persuasionBonus: 2 } }, rollBonus: 1, cooldown: 0, teachable: true },
  { id: "silver_tongue", name: "Silver Tongue", skillId: "seduction", tierRequired: 3, description: "Words that disarm defenses and create desire.", contexts: ["social", "scene"], prerequisites: ["flirtatious_banter"], effects: { social: { persuasionBonus: 5 }, scene: { intensityChange: 3, comfortImpact: 3 } }, rollBonus: 3, cooldown: 1, teachable: true },

  // ======== STEALTH (utility) ========
  { id: "shadow_step", name: "Shadow Step", skillId: "stealth", tierRequired: 2, description: "Move through shadows without making a sound.", contexts: ["exploration", "combat"], prerequisites: [], effects: { exploration: { stealthBonus: 4 }, combat: { damage: "1d6", damageType: "piercing" } }, rollBonus: 2, cooldown: 2, teachable: true },

  // ======== PERCEPTION (utility) ========
  { id: "keen_senses", name: "Keen Senses", skillId: "perception", tierRequired: 1, description: "Heightened awareness of surroundings.", contexts: ["exploration"], prerequisites: [], effects: { exploration: { perceptionBonus: 3 } }, rollBonus: 1, cooldown: 0, teachable: true },

  // ======== PERSUASION (social) ========
  { id: "reasoned_argument", name: "Reasoned Argument", skillId: "persuasion", tierRequired: 1, description: "Logical appeal to change someone's mind.", contexts: ["social"], prerequisites: [], effects: { social: { persuasionBonus: 2 } }, rollBonus: 1, cooldown: 0, teachable: true },
  { id: "emotional_appeal", name: "Emotional Appeal", skillId: "persuasion", tierRequired: 3, description: "Speaking to the heart rather than the head.", contexts: ["social"], prerequisites: ["reasoned_argument"], effects: { social: { persuasionBonus: 5 } }, rollBonus: 3, cooldown: 1, teachable: true },

  // ======== INTIMIDATION (social) ========
  { id: "menacing_glare", name: "Menacing Glare", skillId: "intimidation", tierRequired: 1, description: "A look that makes lesser wills falter.", contexts: ["social", "combat"], prerequisites: [], effects: { social: { intimidationBonus: 3 }, combat: { condition: "frightened", conditionDuration: 1 } }, rollBonus: 1, cooldown: 2, teachable: true },
];

export function getTechniqueById(id: string): TechniqueDefinition | undefined {
  return ALL_TECHNIQUES.find((t) => t.id === id);
}

export function getTechniquesForSkill(skillId: string): TechniqueDefinition[] {
  return ALL_TECHNIQUES.filter((t) => t.skillId === skillId);
}

export function getTechniquesAtTier(skillId: string, maxTier: number): TechniqueDefinition[] {
  return ALL_TECHNIQUES.filter((t) => t.skillId === skillId && t.tierRequired <= maxTier);
}
```

**Step 8: Run tests to verify both pass**

Run: `npx vitest run convex/data/skillCatalog.test.ts convex/data/techniqueCatalog.test.ts`
Expected: PASS

**Step 9: Commit**

```bash
git add convex/data/skillCatalog.ts convex/data/skillCatalog.test.ts convex/data/techniqueCatalog.ts convex/data/techniqueCatalog.test.ts
git commit -m "feat: add skill and technique catalog data files"
```

---

## Task 2: Resolution Engine

**Files:**
- Create: `convex/lib/techniqueResolution.ts`
- Test: `convex/lib/techniqueResolution.test.ts`

**Step 1: Write the failing test**

```typescript
// convex/lib/techniqueResolution.test.ts
import { describe, it, expect } from "vitest";
import {
  calculateActorPower,
  calculateTargetResistance,
  determinePotency,
  calculateEffects,
  calculateXpAward,
  type Potency,
} from "./techniqueResolution";

describe("calculateActorPower", () => {
  it("combines tier, ability mod, and roll bonus", () => {
    // tier 4 = 12, DEX 16 = +3 mod, rollBonus 2 = 17
    expect(calculateActorPower(4, 16, 2)).toBe(17);
  });

  it("handles tier 0", () => {
    // tier 0 = 0, DEX 10 = +0, rollBonus 0 = 0
    expect(calculateActorPower(0, 10, 0)).toBe(0);
  });
});

describe("calculateTargetResistance", () => {
  it("combines counter tier and counter ability mod", () => {
    // tier 3 = 9, STR 14 = +2 = 11
    expect(calculateTargetResistance(3, 14)).toBe(11);
  });

  it("handles no counter skill (tier 0)", () => {
    // tier 0 = 0, STR 10 = +0 = 0
    expect(calculateTargetResistance(0, 10)).toBe(0);
  });
});

describe("determinePotency", () => {
  it("returns overwhelming for gap >= 10", () => {
    expect(determinePotency(20, 10)).toBe("overwhelming");
  });

  it("returns full for gap >= 5", () => {
    expect(determinePotency(15, 10)).toBe("full");
  });

  it("returns standard for gap >= 0", () => {
    expect(determinePotency(12, 12)).toBe("standard");
  });

  it("returns reduced for gap >= -5", () => {
    expect(determinePotency(8, 12)).toBe("reduced");
  });

  it("returns negated for gap < -5", () => {
    expect(determinePotency(5, 12)).toBe("negated");
  });

  it("returns critical for power > 2x resistance", () => {
    expect(determinePotency(25, 10)).toBe("critical");
  });

  it("returns resisted for resistance > 2x power", () => {
    expect(determinePotency(5, 15)).toBe("resisted");
  });
});

describe("calculateEffects", () => {
  it("applies 150% for overwhelming", () => {
    const effects = { scene: { intensityChange: 20, comfortImpact: -10 } };
    const result = calculateEffects(effects, "scene", "overwhelming");
    expect(result.intensityChange).toBe(30);
    expect(result.comfortImpact).toBe(-15);
  });

  it("applies 100% for full", () => {
    const effects = { scene: { intensityChange: 20, comfortImpact: -10 } };
    const result = calculateEffects(effects, "scene", "full");
    expect(result.intensityChange).toBe(20);
    expect(result.comfortImpact).toBe(-10);
  });

  it("applies 80% for standard", () => {
    const effects = { scene: { intensityChange: 20, comfortImpact: -10 } };
    const result = calculateEffects(effects, "scene", "standard");
    expect(result.intensityChange).toBe(16);
    expect(result.comfortImpact).toBe(-8);
  });

  it("applies 50% for reduced", () => {
    const effects = { scene: { intensityChange: 20, comfortImpact: -10 } };
    const result = calculateEffects(effects, "scene", "reduced");
    expect(result.intensityChange).toBe(10);
    expect(result.comfortImpact).toBe(-5);
  });

  it("returns zeroed effects for negated", () => {
    const effects = { scene: { intensityChange: 20, comfortImpact: -10 } };
    const result = calculateEffects(effects, "scene", "negated");
    expect(result.intensityChange).toBe(0);
    expect(result.comfortImpact).toBe(0);
  });

  it("applies 200% for critical", () => {
    const effects = { scene: { intensityChange: 20, comfortImpact: -10 } };
    const result = calculateEffects(effects, "scene", "critical");
    expect(result.intensityChange).toBe(40);
    expect(result.comfortImpact).toBe(-20);
  });

  it("returns zeroed effects for resisted", () => {
    const effects = { scene: { intensityChange: 20, comfortImpact: -10 } };
    const result = calculateEffects(effects, "scene", "resisted");
    expect(result.intensityChange).toBe(0);
    expect(result.comfortImpact).toBe(0);
  });
});

describe("calculateXpAward", () => {
  it("returns base XP for normal use", () => {
    expect(calculateXpAward({ isFirstUse: false, targetTierHigher: false, potency: "standard", usesToday: 1, techniqueTier: 3, actorTier: 3 })).toBe(10);
  });

  it("adds first-use bonus", () => {
    expect(calculateXpAward({ isFirstUse: true, targetTierHigher: false, potency: "standard", usesToday: 1, techniqueTier: 3, actorTier: 3 })).toBe(30);
  });

  it("adds higher-tier opponent bonus", () => {
    expect(calculateXpAward({ isFirstUse: false, targetTierHigher: true, potency: "standard", usesToday: 1, techniqueTier: 3, actorTier: 3 })).toBe(15);
  });

  it("adds overwhelming bonus", () => {
    expect(calculateXpAward({ isFirstUse: false, targetTierHigher: false, potency: "overwhelming", usesToday: 1, techniqueTier: 3, actorTier: 3 })).toBe(15);
  });

  it("gives negated XP (learn from failure)", () => {
    expect(calculateXpAward({ isFirstUse: false, targetTierHigher: false, potency: "negated", usesToday: 1, techniqueTier: 3, actorTier: 3 })).toBe(3);
  });

  it("returns 0 when daily cap hit (3+ uses)", () => {
    expect(calculateXpAward({ isFirstUse: false, targetTierHigher: false, potency: "standard", usesToday: 3, techniqueTier: 3, actorTier: 3 })).toBe(0);
  });

  it("halves XP for techniques far below actor tier", () => {
    // technique tier 1, actor tier 4 (diff > 2) → half of 10 = 5
    expect(calculateXpAward({ isFirstUse: false, targetTierHigher: false, potency: "standard", usesToday: 1, techniqueTier: 1, actorTier: 4 })).toBe(5);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run convex/lib/techniqueResolution.test.ts`
Expected: FAIL — module not found

**Step 3: Write the resolution engine**

```typescript
// convex/lib/techniqueResolution.ts
import { abilityModifier } from "./stats";
import type { TechniqueEffects, TechniqueContext } from "../data/techniqueCatalog";

export type Potency = "critical" | "overwhelming" | "full" | "standard" | "reduced" | "negated" | "resisted";

const POTENCY_MULTIPLIERS: Record<Potency, number> = {
  critical: 2.0,
  overwhelming: 1.5,
  full: 1.0,
  standard: 0.8,
  reduced: 0.5,
  negated: 0,
  resisted: 0,
};

/**
 * Actor power = (tier × 3) + ability modifier + technique roll bonus
 */
export function calculateActorPower(
  currentTier: number,
  abilityScore: number,
  rollBonus: number,
): number {
  return currentTier * 3 + abilityModifier(abilityScore) + rollBonus;
}

/**
 * Target resistance = (counter tier × 3) + counter ability modifier
 */
export function calculateTargetResistance(
  counterTier: number,
  counterAbilityScore: number,
): number {
  return counterTier * 3 + abilityModifier(counterAbilityScore);
}

/**
 * Determine potency from the power–resistance gap.
 * Critical/resisted thresholds checked first (2× multiplier).
 */
export function determinePotency(
  actorPower: number,
  targetResistance: number,
): Potency {
  // Critical thresholds (stat-driven)
  if (targetResistance > 0 && actorPower > targetResistance * 2) return "critical";
  if (actorPower > 0 && targetResistance > actorPower * 2) return "resisted";

  const gap = actorPower - targetResistance;
  if (gap >= 10) return "overwhelming";
  if (gap >= 5) return "full";
  if (gap >= 0) return "standard";
  if (gap >= -5) return "reduced";
  return "negated";
}

/**
 * Scale numeric effects by potency multiplier for a given context.
 */
export function calculateEffects(
  effects: TechniqueEffects,
  context: TechniqueContext,
  potency: Potency,
): Record<string, number | string | boolean> {
  const multiplier = POTENCY_MULTIPLIERS[potency];
  const contextEffects = effects[context];
  if (!contextEffects) return {};

  const scaled: Record<string, number | string | boolean> = {};
  for (const [key, value] of Object.entries(contextEffects)) {
    if (typeof value === "number") {
      scaled[key] = Math.round(value * multiplier);
    } else {
      // strings and booleans pass through unless negated/resisted
      scaled[key] = potency === "negated" || potency === "resisted" ? (typeof value === "boolean" ? false : "") : value;
    }
  }
  return scaled;
}

interface XpAwardInput {
  isFirstUse: boolean;
  targetTierHigher: boolean;
  potency: Potency;
  usesToday: number;
  techniqueTier: number;
  actorTier: number;
}

/**
 * Deterministic XP award — no AI involvement.
 */
export function calculateXpAward(input: XpAwardInput): number {
  // Daily cap: 3+ uses of same technique today = 0 XP
  if (input.usesToday >= 3) return 0;

  // Negated gives small consolation XP
  if (input.potency === "negated" || input.potency === "resisted") return 3;

  let xp = 10; // base

  if (input.isFirstUse) xp += 20;
  if (input.targetTierHigher) xp += 5;
  if (input.potency === "overwhelming" || input.potency === "critical") xp += 5;

  // Diminishing returns: technique tier far below actor tier
  if (input.actorTier - input.techniqueTier > 2) {
    xp = Math.floor(xp / 2);
  }

  return xp;
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run convex/lib/techniqueResolution.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add convex/lib/techniqueResolution.ts convex/lib/techniqueResolution.test.ts
git commit -m "feat: add deterministic technique resolution engine"
```

---

## Task 3: Schema — New Tables

**Files:**
- Modify: `convex/schema.ts` (add new tables after line ~399)
- No test file needed (schema validated by Convex)

**Step 1: Add entitySkills table to schema.ts**

Add after the `npcs` table (around line 399), before `relationships`:

```typescript
  // ============ ENTITY SKILLS ============
  entitySkills: defineTable({
    entityId: v.string(),
    entityType: v.union(v.literal("character"), v.literal("npc")),
    campaignId: v.id("campaigns"),
    skillId: v.string(),
    currentTier: v.number(),   // 0-8
    ceiling: v.number(),       // max tier reachable (raised by NPCs/discoveries)
    practiceXp: v.number(),    // progress toward next tier
    xpToNextTier: v.number(),  // threshold from XP_THRESHOLDS
  })
    .index("by_entity", ["entityId", "entityType"])
    .index("by_campaign_entity", ["campaignId", "entityId", "entityType"])
    .index("by_campaign_skill", ["campaignId", "skillId"]),

  // ============ ENTITY TECHNIQUES ============
  entityTechniques: defineTable({
    entityId: v.string(),
    entityType: v.union(v.literal("character"), v.literal("npc")),
    campaignId: v.id("campaigns"),
    techniqueId: v.string(),
    skillId: v.string(),       // denormalized for fast queries
    timesUsed: v.number(),
    lastUsedAt: v.number(),
    usesToday: v.number(),     // reset per in-game day, caps at 3 for XP
    lastDayReset: v.number(),  // tracks which in-game day the counter was reset
  })
    .index("by_entity", ["entityId", "entityType"])
    .index("by_campaign_entity", ["campaignId", "entityId", "entityType"])
    .index("by_entity_technique", ["entityId", "entityType", "techniqueId"]),

  // ============ TEACHING AVAILABILITY ============
  teachingAvailability: defineTable({
    npcId: v.id("npcs"),
    campaignId: v.id("campaigns"),
    techniqueId: v.string(),
    skillId: v.string(),
    trustRequired: v.number(),        // minimum relationship trust to learn
    ceilingGrant: v.number(),         // raises student's ceiling to this tier
    questPrerequisite: v.optional(v.string()),
  })
    .index("by_npc", ["npcId"])
    .index("by_campaign", ["campaignId"]),

  // ============ CEILING RAISES (audit log) ============
  ceilingRaises: defineTable({
    characterId: v.id("characters"),
    campaignId: v.id("campaigns"),
    skillId: v.string(),
    previousCeiling: v.number(),
    newCeiling: v.number(),
    source: v.union(v.literal("npc_training"), v.literal("discovery"), v.literal("milestone")),
    sourceId: v.string(),     // NPC ID, quest ID, etc.
    timestamp: v.number(),
  })
    .index("by_character", ["characterId"])
    .index("by_campaign", ["campaignId"]),

  // ============ TECHNIQUE ACTIVATIONS (resolution log) ============
  techniqueActivations: defineTable({
    campaignId: v.id("campaigns"),
    actorId: v.string(),
    actorType: v.union(v.literal("character"), v.literal("npc")),
    targetId: v.optional(v.string()),
    targetType: v.optional(v.union(v.literal("character"), v.literal("npc"))),
    techniqueId: v.string(),
    skillId: v.string(),
    context: v.union(v.literal("combat"), v.literal("scene"), v.literal("social"), v.literal("exploration")),
    actorPower: v.number(),
    targetResistance: v.number(),
    potency: v.string(),
    effectsApplied: v.any(),
    xpAwarded: v.number(),
    bonusXp: v.number(),
    timestamp: v.number(),
  })
    .index("by_campaign", ["campaignId"])
    .index("by_actor", ["actorId", "actorType"]),

  // ============ CAMPAIGN SKILL PACKS ============
  campaignSkillPacks: defineTable({
    campaignId: v.id("campaigns"),
    skillIds: v.array(v.string()),
    techniqueIds: v.array(v.string()),
  })
    .index("by_campaign", ["campaignId"]),
```

**Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS (zero errors)

**Step 3: Commit**

```bash
git add convex/schema.ts
git commit -m "feat: add skill system schema tables"
```

---

## Task 4: Skill System Queries & Mutations

**Files:**
- Create: `convex/skills.ts`
- Test: `convex/skills.test.ts`

**Step 1: Write the failing test**

```typescript
// convex/skills.test.ts
import { describe, it, expect } from "vitest";
import { canLearnTechnique, canTierUp } from "./skills";
import { XP_THRESHOLDS } from "./data/skillCatalog";

describe("canLearnTechnique", () => {
  it("returns true when tier meets requirement and prerequisites met", () => {
    expect(canLearnTechnique(
      3,                            // currentTier
      3,                            // technique tierRequired
      ["basic_binding"],            // prerequisites
      new Set(["basic_binding"]),   // learned techniques
    )).toBe(true);
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
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run convex/skills.test.ts`
Expected: FAIL

**Step 3: Write the skills module**

```typescript
// convex/skills.ts
import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { XP_THRESHOLDS } from "./data/skillCatalog";
import { getTechniqueById } from "./data/techniqueCatalog";

/**
 * Check if a character can learn a technique (pure function, exported for testing).
 */
export function canLearnTechnique(
  currentTier: number,
  tierRequired: number,
  prerequisites: string[],
  learnedTechniques: Set<string>,
): boolean {
  if (currentTier < tierRequired) return false;
  for (const prereq of prerequisites) {
    if (!learnedTechniques.has(prereq)) return false;
  }
  return true;
}

/**
 * Check if an entity can tier up (pure function, exported for testing).
 */
export function canTierUp(
  practiceXp: number,
  currentTier: number,
  ceiling: number,
): boolean {
  if (currentTier >= 8) return false;
  if (currentTier >= ceiling) return false;
  const threshold = XP_THRESHOLDS[currentTier];
  if (threshold === undefined) return false;
  return practiceXp >= threshold;
}

// ── Queries ──

/** Get all skills for an entity */
export const getEntitySkills = query({
  args: {
    entityId: v.string(),
    entityType: v.union(v.literal("character"), v.literal("npc")),
    campaignId: v.id("campaigns"),
  },
  handler: async (ctx, args) => {
    return ctx.db
      .query("entitySkills")
      .withIndex("by_campaign_entity", (q) =>
        q.eq("campaignId", args.campaignId)
         .eq("entityId", args.entityId)
         .eq("entityType", args.entityType)
      )
      .collect();
  },
});

/** Get all techniques for an entity */
export const getEntityTechniques = query({
  args: {
    entityId: v.string(),
    entityType: v.union(v.literal("character"), v.literal("npc")),
    campaignId: v.id("campaigns"),
  },
  handler: async (ctx, args) => {
    return ctx.db
      .query("entityTechniques")
      .withIndex("by_campaign_entity", (q) =>
        q.eq("campaignId", args.campaignId)
         .eq("entityId", args.entityId)
         .eq("entityType", args.entityType)
      )
      .collect();
  },
});

/** Get teaching options available from an NPC */
export const getTeachingOptions = query({
  args: {
    npcId: v.id("npcs"),
  },
  handler: async (ctx, args) => {
    return ctx.db
      .query("teachingAvailability")
      .withIndex("by_npc", (q) => q.eq("npcId", args.npcId))
      .collect();
  },
});

// ── Mutations ──

/** Initialize a skill for an entity (set tier and ceiling) */
export const initializeSkill = mutation({
  args: {
    entityId: v.string(),
    entityType: v.union(v.literal("character"), v.literal("npc")),
    campaignId: v.id("campaigns"),
    skillId: v.string(),
    currentTier: v.number(),
    ceiling: v.number(),
  },
  handler: async (ctx, args) => {
    const xpToNext = XP_THRESHOLDS[args.currentTier] ?? 0;
    return ctx.db.insert("entitySkills", {
      entityId: args.entityId,
      entityType: args.entityType,
      campaignId: args.campaignId,
      skillId: args.skillId,
      currentTier: args.currentTier,
      ceiling: args.ceiling,
      practiceXp: 0,
      xpToNextTier: xpToNext,
    });
  },
});

/** Learn a technique */
export const learnTechnique = mutation({
  args: {
    entityId: v.string(),
    entityType: v.union(v.literal("character"), v.literal("npc")),
    campaignId: v.id("campaigns"),
    techniqueId: v.string(),
  },
  handler: async (ctx, args) => {
    const technique = getTechniqueById(args.techniqueId);
    if (!technique) throw new Error(`Unknown technique: ${args.techniqueId}`);

    // Check if already learned
    const existing = await ctx.db
      .query("entityTechniques")
      .withIndex("by_entity_technique", (q) =>
        q.eq("entityId", args.entityId)
         .eq("entityType", args.entityType)
         .eq("techniqueId", args.techniqueId)
      )
      .first();
    if (existing) throw new Error("Technique already learned");

    // Check tier requirement
    const skill = await ctx.db
      .query("entitySkills")
      .withIndex("by_campaign_entity", (q) =>
        q.eq("campaignId", args.campaignId)
         .eq("entityId", args.entityId)
         .eq("entityType", args.entityType)
      )
      .collect();
    const entitySkill = skill.find((s) => s.skillId === technique.skillId);
    if (!entitySkill || entitySkill.currentTier < technique.tierRequired) {
      throw new Error(`Requires ${technique.skillId} tier ${technique.tierRequired}`);
    }

    // Check prerequisites
    const learnedTechs = await ctx.db
      .query("entityTechniques")
      .withIndex("by_campaign_entity", (q) =>
        q.eq("campaignId", args.campaignId)
         .eq("entityId", args.entityId)
         .eq("entityType", args.entityType)
      )
      .collect();
    const learnedIds = new Set(learnedTechs.map((t) => t.techniqueId));
    for (const prereq of technique.prerequisites) {
      if (!learnedIds.has(prereq)) {
        throw new Error(`Missing prerequisite: ${prereq}`);
      }
    }

    return ctx.db.insert("entityTechniques", {
      entityId: args.entityId,
      entityType: args.entityType,
      campaignId: args.campaignId,
      techniqueId: args.techniqueId,
      skillId: technique.skillId,
      timesUsed: 0,
      lastUsedAt: 0,
      usesToday: 0,
      lastDayReset: 0,
    });
  },
});

/** Award XP to a skill and auto tier-up if threshold met */
export const awardSkillXp = mutation({
  args: {
    entityId: v.string(),
    entityType: v.union(v.literal("character"), v.literal("npc")),
    campaignId: v.id("campaigns"),
    skillId: v.string(),
    xp: v.number(),
  },
  handler: async (ctx, args) => {
    const skills = await ctx.db
      .query("entitySkills")
      .withIndex("by_campaign_entity", (q) =>
        q.eq("campaignId", args.campaignId)
         .eq("entityId", args.entityId)
         .eq("entityType", args.entityType)
      )
      .collect();
    const skill = skills.find((s) => s.skillId === args.skillId);
    if (!skill) throw new Error(`Entity has no skill: ${args.skillId}`);

    let newXp = skill.practiceXp + args.xp;
    let newTier = skill.currentTier;

    // Auto tier-up loop (could jump multiple tiers with large XP)
    while (canTierUp(newXp, newTier, skill.ceiling)) {
      const threshold = XP_THRESHOLDS[newTier]!;
      newXp -= threshold;
      newTier++;
    }

    const newXpToNext = XP_THRESHOLDS[newTier] ?? 0;

    await ctx.db.patch(skill._id, {
      currentTier: newTier,
      practiceXp: newXp,
      xpToNextTier: newXpToNext,
    });

    return { newTier, tieredUp: newTier > skill.currentTier };
  },
});

/** Raise a character's skill ceiling (from NPC training or discovery) */
export const raiseCeiling = mutation({
  args: {
    characterId: v.id("characters"),
    campaignId: v.id("campaigns"),
    skillId: v.string(),
    newCeiling: v.number(),
    source: v.union(v.literal("npc_training"), v.literal("discovery"), v.literal("milestone")),
    sourceId: v.string(),
  },
  handler: async (ctx, args) => {
    const skills = await ctx.db
      .query("entitySkills")
      .withIndex("by_campaign_entity", (q) =>
        q.eq("campaignId", args.campaignId)
         .eq("entityId", args.characterId)
         .eq("entityType", "character")
      )
      .collect();
    const skill = skills.find((s) => s.skillId === args.skillId);
    if (!skill) throw new Error(`Character has no skill: ${args.skillId}`);

    if (args.newCeiling <= skill.ceiling) return; // no downgrade

    const previousCeiling = skill.ceiling;
    await ctx.db.patch(skill._id, { ceiling: args.newCeiling });

    // Audit log
    await ctx.db.insert("ceilingRaises", {
      characterId: args.characterId,
      campaignId: args.campaignId,
      skillId: args.skillId,
      previousCeiling,
      newCeiling: args.newCeiling,
      source: args.source,
      sourceId: args.sourceId,
      timestamp: Date.now(),
    });
  },
});

/** Record technique usage (update counters for XP cap tracking) */
export const recordTechniqueUse = mutation({
  args: {
    entityId: v.string(),
    entityType: v.union(v.literal("character"), v.literal("npc")),
    techniqueId: v.string(),
    currentDay: v.number(),  // in-game day number
  },
  handler: async (ctx, args) => {
    const record = await ctx.db
      .query("entityTechniques")
      .withIndex("by_entity_technique", (q) =>
        q.eq("entityId", args.entityId)
         .eq("entityType", args.entityType)
         .eq("techniqueId", args.techniqueId)
      )
      .first();
    if (!record) throw new Error("Technique not learned");

    // Reset daily counter if new day
    const usesToday = record.lastDayReset === args.currentDay
      ? record.usesToday + 1
      : 1;

    await ctx.db.patch(record._id, {
      timesUsed: record.timesUsed + 1,
      lastUsedAt: Date.now(),
      usesToday,
      lastDayReset: args.currentDay,
    });

    return { usesToday };
  },
});
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run convex/skills.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add convex/skills.ts convex/skills.test.ts
git commit -m "feat: add skill system queries, mutations, and helpers"
```

---

## Task 5: NPC Skill Seeding for Rivermoot

**Files:**
- Create: `convex/data/rivermootNpcSkills.ts`
- Modify: `convex/game/ensureRivermootNpcs.ts` (add skill initialization after NPC creation)

**Step 1: Create NPC skill/technique assignments**

```typescript
// convex/data/rivermootNpcSkills.ts
// Maps Rivermoot NPC template IDs to their skills and techniques.

export interface NpcSkillAssignment {
  skillId: string;
  tier: number;         // both currentTier and ceiling
  techniques: string[]; // technique IDs they know
}

export const RIVERMOOT_NPC_SKILLS: Record<string, NpcSkillAssignment[]> = {
  captain_varn: [
    { skillId: "blade_mastery", tier: 5, techniques: ["quick_slash", "parry_riposte"] },
    { skillId: "shield_craft", tier: 4, techniques: [] },
    { skillId: "intimidation", tier: 4, techniques: ["menacing_glare"] },
    { skillId: "domination", tier: 4, techniques: ["commanding_presence", "verbal_control"] },
    { skillId: "rope_arts", tier: 3, techniques: ["basic_binding", "double_column_tie", "combat_binding"] },
  ],
  pip: [
    { skillId: "stealth", tier: 4, techniques: ["shadow_step"] },
    { skillId: "dirty_fighting", tier: 3, techniques: [] },
    { skillId: "lockpicking", tier: 3, techniques: [] },
    { skillId: "perception", tier: 2, techniques: ["keen_senses"] },
  ],
  brother_aldric: [
    { skillId: "healing_magic", tier: 4, techniques: ["mend_wounds", "restoration"] },
    { skillId: "divine_magic", tier: 3, techniques: [] },
    { skillId: "aftercare", tier: 5, techniques: ["gentle_touch", "emotional_grounding"] },
    { skillId: "submission_arts", tier: 3, techniques: ["graceful_surrender", "endurance_stance"] },
  ],
  kira_bloodthorn: [
    { skillId: "martial_arts", tier: 6, techniques: ["basic_strike", "flurry_of_blows", "stunning_fist"] },
    { skillId: "impact_technique", tier: 6, techniques: ["open_hand_strike", "rhythmic_flogging", "precision_strike"] },
    { skillId: "domination", tier: 4, techniques: ["commanding_presence", "verbal_control"] },
    { skillId: "edge_play", tier: 3, techniques: ["limit_reading"] },
  ],
  faelen: [
    { skillId: "enchantment", tier: 6, techniques: ["charm_gaze", "mesmerize"] },
    { skillId: "sensation_craft", tier: 5, techniques: ["temperature_play", "feather_touch", "nerve_mapping"] },
    { skillId: "seduction", tier: 5, techniques: ["flirtatious_banter", "silver_tongue"] },
    { skillId: "edge_play", tier: 5, techniques: ["limit_reading", "controlled_escalation"] },
  ],
  // Add more NPCs as needed — any NPC not listed here gets no skills (auto-created NPCs)
};
```

**Step 2: Modify `ensureRivermootNpcs.ts` to seed skills after NPC creation**

Read `convex/game/ensureRivermootNpcs.ts` first to find the exact insertion point. After each NPC is inserted/found, add skill and technique initialization by calling the mutations from `convex/skills.ts`.

The seeding function should:
1. Look up `RIVERMOOT_NPC_SKILLS[templateId]`
2. For each skill assignment, call `initializeSkill` with tier = ceiling = assignment.tier
3. For each technique in the assignment, insert into `entityTechniques`

Also seed `teachingAvailability` records so NPCs can teach their techniques.

**Step 3: Run type check and existing tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: PASS

**Step 4: Commit**

```bash
git add convex/data/rivermootNpcSkills.ts convex/game/ensureRivermootNpcs.ts
git commit -m "feat: seed Rivermoot NPCs with skills and techniques"
```

---

## Task 6: Technique Activation Action

**Files:**
- Create: `convex/game/techniqueAction.ts`
- Test: `convex/game/techniqueAction.test.ts` (unit tests for helper functions)

This is the core gameplay action — player clicks a technique, system resolves it deterministically, logs the activation, awards XP, then calls the AI DM to narrate.

**Step 1: Write failing test for helper functions**

```typescript
// convex/game/techniqueAction.test.ts
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
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run convex/game/techniqueAction.test.ts`
Expected: FAIL

**Step 3: Write the technique activation action**

```typescript
// convex/game/techniqueAction.ts
import { v } from "convex/values";
import { action } from "../_generated/server";
import { api } from "../_generated/api";
import { getTechniqueById } from "../data/techniqueCatalog";
import { getSkillById } from "../data/skillCatalog";
import {
  calculateActorPower,
  calculateTargetResistance,
  determinePotency,
  calculateEffects,
  calculateXpAward,
} from "../lib/techniqueResolution";

interface ActivationSummaryInput {
  actorName: string;
  techniqueName: string;
  skillName: string;
  actorTier: number;
  targetName?: string;
  potency: string;
  effectsApplied: Record<string, any>;
  context: string;
}

/** Build a human-readable summary for the DM prompt. */
export function buildActivationSummary(input: ActivationSummaryInput): string {
  const effects = Object.entries(input.effectsApplied)
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");
  return `## Technique Activated
- Actor: ${input.actorName} used "${input.techniqueName}" (${input.skillName}, Tier ${input.actorTier})
${input.targetName ? `- Target: ${input.targetName}` : "- Target: none"}
- Potency: ${input.potency}
- Effects applied: ${effects || "none"}
- Context: ${input.context}

Narrate the outcome. Do NOT contradict the mechanical effects.`;
}

/**
 * Player activates a technique — deterministic resolution, then AI narrates.
 */
export const activateTechnique = action({
  args: {
    campaignId: v.id("campaigns"),
    characterId: v.id("characters"),
    techniqueId: v.string(),
    targetId: v.optional(v.string()),
    targetType: v.optional(v.union(v.literal("character"), v.literal("npc"))),
    context: v.union(v.literal("combat"), v.literal("scene"), v.literal("social"), v.literal("exploration")),
  },
  handler: async (ctx, args) => {
    const technique = getTechniqueById(args.techniqueId);
    if (!technique) throw new Error(`Unknown technique: ${args.techniqueId}`);

    const skill = getSkillById(technique.skillId);
    if (!skill) throw new Error(`Unknown skill: ${technique.skillId}`);

    // Validate context
    if (!technique.contexts.includes(args.context)) {
      throw new Error(`Technique "${technique.name}" cannot be used in ${args.context}`);
    }

    // Get actor data
    const character: any = await ctx.runQuery(api.characters.get, { characterId: args.characterId });
    if (!character) throw new Error("Character not found");

    const actorSkills: any[] = await ctx.runQuery(api.skills.getEntitySkills, {
      entityId: args.characterId,
      entityType: "character",
      campaignId: args.campaignId,
    });
    const actorSkill = actorSkills.find((s: any) => s.skillId === technique.skillId);
    if (!actorSkill) throw new Error(`Character has no skill: ${technique.skillId}`);

    // Check technique is learned
    const actorTechniques: any[] = await ctx.runQuery(api.skills.getEntityTechniques, {
      entityId: args.characterId,
      entityType: "character",
      campaignId: args.campaignId,
    });
    const learned = actorTechniques.find((t: any) => t.techniqueId === args.techniqueId);
    if (!learned) throw new Error("Technique not learned");

    // TODO: Check cooldown against learned.lastUsedAt and technique.cooldown

    // Calculate actor power
    const abilityScore = character.abilities[skill.baseAbility] || 10;
    const actorPower = calculateActorPower(actorSkill.currentTier, abilityScore, technique.rollBonus);

    // Calculate target resistance (if target exists)
    let targetResistance = 0;
    let targetName: string | undefined;
    if (args.targetId && args.targetType) {
      let targetEntity: any;
      let targetSkills: any[];

      if (args.targetType === "npc") {
        targetEntity = await ctx.runQuery(api.npcs.get, { npcId: args.targetId as any });
        targetName = targetEntity?.name;
      } else {
        targetEntity = await ctx.runQuery(api.characters.get, { characterId: args.targetId as any });
        targetName = targetEntity?.name;
      }

      if (targetEntity) {
        targetSkills = await ctx.runQuery(api.skills.getEntitySkills, {
          entityId: args.targetId,
          entityType: args.targetType,
          campaignId: args.campaignId,
        });
        const counterSkill = targetSkills.find((s: any) => s.skillId === technique.skillId);
        const counterTier = counterSkill?.currentTier ?? 0;
        const counterAbilityScore = targetEntity.abilities[skill.counterAbility] || 10;
        targetResistance = calculateTargetResistance(counterTier, counterAbilityScore);
      }
    }

    // Resolve
    const potency = determinePotency(actorPower, targetResistance);
    const effectsApplied = calculateEffects(technique.effects, args.context, potency);

    // Get session for game day tracking
    const session: any = await ctx.runQuery(api.game.session.getCurrent, { campaignId: args.campaignId });
    const currentDay = session?.worldState?.currentTime?.day ?? 0;

    // Record technique use and get daily count
    const { usesToday } = await ctx.runMutation(api.skills.recordTechniqueUse, {
      entityId: args.characterId,
      entityType: "character",
      techniqueId: args.techniqueId,
      currentDay,
    });

    // Calculate and award XP
    const targetSkillsForComparison: any[] = args.targetId && args.targetType
      ? await ctx.runQuery(api.skills.getEntitySkills, {
          entityId: args.targetId,
          entityType: args.targetType,
          campaignId: args.campaignId,
        })
      : [];
    const targetCounterSkill = targetSkillsForComparison.find((s: any) => s.skillId === technique.skillId);

    const xp = calculateXpAward({
      isFirstUse: learned.timesUsed === 0,
      targetTierHigher: (targetCounterSkill?.currentTier ?? 0) > actorSkill.currentTier,
      potency,
      usesToday,
      techniqueTier: technique.tierRequired,
      actorTier: actorSkill.currentTier,
    });

    if (xp > 0) {
      await ctx.runMutation(api.skills.awardSkillXp, {
        entityId: args.characterId,
        entityType: "character",
        campaignId: args.campaignId,
        skillId: technique.skillId,
        xp,
      });
    }

    // Log activation
    await ctx.runMutation(api.game.log.add, {
      campaignId: args.campaignId,
      type: "action",
      content: `${character.name} uses ${technique.name}${targetName ? ` on ${targetName}` : ""} — ${potency}`,
      actorType: "character",
      actorId: args.characterId,
      actorName: character.name,
    });

    // Store activation record
    // (This would be a mutation to insert into techniqueActivations — implement as needed)

    // Build summary for AI DM narration
    const summary = buildActivationSummary({
      actorName: character.name,
      techniqueName: technique.name,
      skillName: skill.name,
      actorTier: actorSkill.currentTier,
      targetName,
      potency,
      effectsApplied,
      context: args.context,
    });

    // Call AI DM to narrate (reuse existing DM narration action or create a new lightweight one)
    // For now, log the summary as narration
    // TODO: Wire into dm.ts with a new narrateTechniqueOutcome action

    return {
      potency,
      effectsApplied,
      xpAwarded: xp,
      summary,
    };
  },
});
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run convex/game/techniqueAction.test.ts`
Expected: PASS

**Step 5: Run full type check and test suite**

Run: `npx tsc --noEmit && npx vitest run`
Expected: PASS

**Step 6: Commit**

```bash
git add convex/game/techniqueAction.ts convex/game/techniqueAction.test.ts
git commit -m "feat: add technique activation action with deterministic resolution"
```

---

## Task 7: DM Integration — Technique Narration

**Files:**
- Modify: `convex/ai/dm.ts` (add narrateTechniqueOutcome action, update system prompt, update context builder)
- Modify: `convex/game/actions.ts` (add technique context to DM prompt, add freeform→technique suggestion)

**Step 1: Add `narrateTechniqueOutcome` action to `convex/ai/dm.ts`**

Add after `narrateRollOutcome` (~line 536):

```typescript
export const narrateTechniqueOutcome = action({
  args: {
    techniqueSummary: v.string(),
    llmProvider: v.optional(v.union(v.literal("deepseek"), v.literal("openai"))),
  },
  handler: async (ctx, args) => {
    const messages: LLMMessage[] = [
      { role: "system", content: DM_SYSTEM_PROMPT },
      { role: "user", content: `${args.techniqueSummary}\n\nRespond with JSON:\n{\n  "narration": "Vivid description of what happens",\n  "suggestedActions": [{ "text": "Action description", "type": "dialogue|action|intimate" }]\n}` },
    ];

    const { content, usage, provider, model, latencyMs } = await callLLM(messages, {
      jsonMode: true,
      provider: args.llmProvider,
    });

    let parsedResponse;
    try {
      parsedResponse = JSON.parse(content);
    } catch {
      parsedResponse = { narration: content, suggestedActions: [] };
    }

    return { response: parsedResponse, usage, provider, model, latencyMs };
  },
});
```

**Step 2: Update DM system prompt to include skill system rules**

Add to `DM_SYSTEM_PROMPT` (after the Relationship section, ~line 173):

```
## Skill & Technique System
- When a technique activates, you NARRATE the outcome. You do not decide success or failure.
- Describe techniques vividly based on potency: "critical" = legendary, "overwhelming" = exceptional, "full" = competent, "standard" = adequate, "reduced" = struggling, "negated"/"resisted" = target shrugs it off.
- You may suggest mood and relationship changes, but cannot alter mechanical effects.
- For freeform actions: if the action matches a known technique, include "suggestTechnique": "technique_id" in your response. The system will prompt the player to use it instead of rolling.
```

**Step 3: Update context message in `processPlayerInput` handler**

In the context builder (~line 268), add the character's known techniques grouped by skill. Pass them alongside the existing nearbyNpcs context.

After `## Recent History` section, add:

```
## Character Techniques
${args.context.characterTechniques?.map((t) => `- ${t.name} (${t.skillName}, Tier ${t.tier})`).join("\n") || "(none)"}
```

This requires adding `characterTechniques` to the validator and passing it from `actions.ts`.

**Step 4: Update `convex/game/actions.ts` to pass technique context**

In `executeAction` (~line 108), after fetching NPC context, also fetch the character's techniques:

```typescript
// Get character's learned techniques for DM context
const entityTechniques = await ctx.runQuery(api.skills.getEntityTechniques, {
  entityId: characterId,
  entityType: "character",
  campaignId,
});
const techniqueContext = entityTechniques.map((et) => {
  const tech = getTechniqueById(et.techniqueId);
  const skill = getSkillById(tech?.skillId ?? "");
  return {
    name: tech?.name ?? et.techniqueId,
    skillName: skill?.name ?? "",
    tier: tech?.tierRequired ?? 0,
  };
});
```

Add `characterTechniques: techniqueContext` to the context object passed to `processPlayerInput`.

**Step 5: Update the validator in `dm.ts` `processPlayerInput`**

Add to the `context` validator:

```typescript
characterTechniques: v.optional(v.array(v.object({
  name: v.string(),
  skillName: v.string(),
  tier: v.number(),
}))),
```

**Step 6: Add `suggestTechnique` to DM response handling in `actions.ts`**

After receiving the DM response, check for `suggestTechnique`. If present, return it to the frontend so it can prompt the player.

**Step 7: Run type check and full test suite**

Run: `npx tsc --noEmit && npx vitest run`
Expected: PASS

**Step 8: Commit**

```bash
git add convex/ai/dm.ts convex/game/actions.ts
git commit -m "feat: integrate technique system with AI DM narration and context"
```

---

## Task 8: Scene System Integration

**Files:**
- Modify: `convex/game/scene.ts` (~lines 348-367, intensity/comfort calculation)

**Step 1: Update `performAction` to accept technique-driven effects**

In `performAction` mutation, add an optional `techniqueEffects` arg:

```typescript
techniqueEffects: v.optional(v.object({
  intensityChange: v.optional(v.number()),
  comfortImpact: v.optional(v.number()),
  moodShift: v.optional(v.string()),
})),
```

When `techniqueEffects` is provided, use those values instead of the default `intensityMap` lookup. This lets the technique resolution engine override the hardcoded scene action values.

**Step 2: Run tests**

Run: `npx vitest run`
Expected: PASS (existing scene tests should still pass since the new arg is optional)

**Step 3: Commit**

```bash
git add convex/game/scene.ts
git commit -m "feat: wire technique effects into scene system"
```

---

## Task 9: Combat System Integration

**Files:**
- Modify: `convex/game/combat.ts` (~lines 375-725, attack resolution)

**Step 1: Add `technique` action type**

Add `"technique"` to the `actionType` validator (~line 26).

**Step 2: Add technique resolution branch**

In `executeAction`, add a branch for `actionType === "technique"` that:
1. Calls the technique resolution engine
2. Applies damage/conditions from technique effects
3. Logs the activation
4. Awards XP

This parallels the existing `"attack"` and `"spell"` branches.

**Step 3: Run type check and tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: PASS

**Step 4: Commit**

```bash
git add convex/game/combat.ts
git commit -m "feat: add technique action type to combat system"
```

---

## Task 10: Campaign Skill Pack & Character Initialization

**Files:**
- Create: `convex/data/rivermootSkillPack.ts`
- Modify: `convex/characters.ts` (initialize entity skills on character creation)

**Step 1: Create the Rivermoot skill pack**

```typescript
// convex/data/rivermootSkillPack.ts
// Defines which skills and techniques are available in the Rivermoot campaign.

import { ALL_SKILLS } from "./skillCatalog";
import { ALL_TECHNIQUES } from "./techniqueCatalog";

// Rivermoot uses all currently defined skills and techniques
export const RIVERMOOT_SKILL_IDS = ALL_SKILLS.map((s) => s.id);
export const RIVERMOOT_TECHNIQUE_IDS = ALL_TECHNIQUES.map((t) => t.id);
```

**Step 2: Modify character creation to initialize entity skills**

In `convex/characters.ts` `create` mutation (~line 211), after inserting the character, initialize entity skills with tier 0 and ceiling 0 for all skills in the campaign's skill pack.

**Step 3: Run type check and tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: PASS

**Step 4: Commit**

```bash
git add convex/data/rivermootSkillPack.ts convex/characters.ts
git commit -m "feat: initialize character skills on creation from campaign skill pack"
```

---

## Task 11: Skill Panel UI Component

**Files:**
- Create: `src/components/game/skills/SkillPanel.tsx`
- Create: `src/components/game/skills/TechniqueCard.tsx`
- Create: `src/components/game/skills/TechniqueBar.tsx`

**Step 1: Build SkillPanel**

Character sheet tab showing skills grouped by category. Each skill card displays:
- Name, tier label, tier number / ceiling
- XP progress bar (practiceXp / xpToNextTier)
- Click to expand and show learned techniques

Uses `api.skills.getEntitySkills` query.

**Step 2: Build TechniqueCard**

Card for individual techniques showing:
- Name, tier requirement, description
- Learned/locked state (with reason: ceiling, tier, prerequisite)
- Times used count
- Click to activate in gameplay context

**Step 3: Build TechniqueBar**

Horizontal bar at bottom of game screen during combat/scene:
- Shows only techniques valid for current context
- Greyed out with cooldown timer
- Click to activate (calls `api.game.techniqueAction.activateTechnique`)
- Freeform text input alongside

**Step 4: Integrate into GameModeRouter**

Add TechniqueBar to the combat and scene views. Add SkillPanel as a tab in the character sheet.

**Step 5: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 6: Commit**

```bash
git add src/components/game/skills/
git commit -m "feat: add skill panel and technique bar UI components"
```

---

## Task 12: Training UI

**Files:**
- Create: `src/components/game/skills/TrainingDialog.tsx`

**Step 1: Build TrainingDialog**

Modal that appears when interacting with an NPC who can teach:
- Shows NPC's teachable techniques (from `teachingAvailability`)
- Shows trust requirement vs current trust
- Shows which techniques are available to learn now vs locked
- "Train" button calls `raiseCeiling` + `learnTechnique` mutations
- Shows ceiling raise animation and technique learned notification

**Step 2: Wire into NPC interaction flow**

When the player interacts with a teachable NPC and trust is sufficient, show a "Train with [NPC]" option in suggested actions.

**Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 4: Commit**

```bash
git add src/components/game/skills/TrainingDialog.tsx
git commit -m "feat: add NPC training dialog UI"
```

---

## Task 13: Final Verification

**Step 1: Run full type check**

Run: `npx tsc --noEmit`
Expected: zero errors

**Step 2: Run full test suite**

Run: `npx vitest run`
Expected: all tests pass

**Step 3: Manual verification checklist**

- [ ] Start a Rivermoot session → character has skills at tier 0, ceiling 0
- [ ] Meet Captain Varn → training option available → ceiling raises
- [ ] Use a technique in a scene → deterministic resolution, XP awarded
- [ ] Use same technique 3 times → daily XP cap hits (0 XP on 4th use)
- [ ] Accumulate enough XP → auto tier-up
- [ ] AI DM narrates technique outcomes without contradicting mechanics
- [ ] Freeform action matching a technique → DM suggests using it
- [ ] NPC uses techniques in combat with real mechanical effects
