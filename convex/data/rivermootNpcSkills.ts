/**
 * NPC Skill Assignments for Rivermoot campaign NPCs.
 *
 * Maps NPC template IDs (from rivermootNpcs.ts) to their skill tiers and
 * known techniques. Technique IDs must match entries in techniqueCatalog.ts.
 */

export interface NpcSkillAssignment {
  skillId: string;
  tier: number; // both currentTier and ceiling
  techniques: string[]; // technique IDs they know
}

export const RIVERMOOT_NPC_SKILLS: Record<string, NpcSkillAssignment[]> = {
  "rivermoot-npc-captain-varn": [
    { skillId: "blade_mastery", tier: 5, techniques: ["quick_draw", "parry_riposte"] },
    { skillId: "shield_craft", tier: 4, techniques: ["shield_bash", "shield_wall"] },
    { skillId: "intimidation", tier: 4, techniques: ["menacing_glare"] },
    { skillId: "domination", tier: 4, techniques: ["commanding_presence", "protocol_training"] },
    { skillId: "rope_arts", tier: 3, techniques: ["basic_binding", "quick_release", "decorative_harness"] },
  ],
  "rivermoot-npc-pip": [
    { skillId: "stealth", tier: 4, techniques: ["shadow_step"] },
    { skillId: "dirty_fighting", tier: 3, techniques: [] },
    { skillId: "lockpicking", tier: 3, techniques: [] },
    { skillId: "perception", tier: 2, techniques: ["keen_eye"] },
  ],
  "rivermoot-npc-brother-aldric": [
    { skillId: "healing_magic", tier: 4, techniques: ["mend_wounds", "restoration"] },
    { skillId: "divine_magic", tier: 3, techniques: [] },
    { skillId: "aftercare", tier: 5, techniques: ["comfort_touch", "emotional_grounding"] },
    { skillId: "submission_arts", tier: 3, techniques: ["graceful_surrender", "service_devotion"] },
  ],
  "rivermoot-npc-kira-bloodthorn": [
    { skillId: "martial_arts", tier: 6, techniques: ["swift_strike", "grapple_hold", "pressure_point"] },
    { skillId: "impact_technique", tier: 6, techniques: ["open_hand_strike", "flogging_rhythm", "precision_caning"] },
    { skillId: "domination", tier: 4, techniques: ["commanding_presence", "protocol_training"] },
    { skillId: "edge_play", tier: 5, techniques: ["breath_control", "knife_trace"] },
  ],
  "rivermoot-npc-faelen": [
    { skillId: "enchantment", tier: 6, techniques: ["charm_person", "mass_suggestion"] },
    { skillId: "sensation_craft", tier: 5, techniques: ["temperature_play", "sensory_deprivation", "nerve_mapping"] },
    { skillId: "seduction", tier: 5, techniques: ["alluring_glance", "irresistible_charm"] },
    { skillId: "edge_play", tier: 5, techniques: ["breath_control", "knife_trace"] },
  ],
};
