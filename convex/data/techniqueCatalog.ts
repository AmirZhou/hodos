/**
 * Technique Catalog — campaign-agnostic technique definitions.
 *
 * Each technique belongs to a skill and becomes available at a certain tier.
 * Techniques have context-specific effects (combat, scene, social, exploration).
 */

export type TechniqueContext = "combat" | "scene" | "social" | "exploration";

export interface TechniqueEffects {
  combat?: {
    damage?: number;
    condition?: string;
    acBonus?: number;
    tempHp?: number;
    healing?: number;
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
  prerequisites: string[];
  effects: TechniqueEffects;
  rollBonus: number;
  cooldown: number;
  teachable: boolean;
}

// ---------------------------------------------------------------------------
// Technique definitions
// ---------------------------------------------------------------------------

export const ALL_TECHNIQUES: TechniqueDefinition[] = [
  // ── ROPE ARTS (5 techniques) ────────────────────────────────────────────
  {
    id: "basic_binding",
    name: "Basic Binding",
    skillId: "rope_arts",
    tierRequired: 0,
    description: "Simple wrist and ankle ties using basic knots.",
    contexts: ["scene"],
    prerequisites: [],
    effects: {
      scene: { intensityChange: 1, comfortImpact: 0, moodShift: "restrained" },
    },
    rollBonus: 0,
    cooldown: 0,
    teachable: true,
  },
  {
    id: "decorative_harness",
    name: "Decorative Harness",
    skillId: "rope_arts",
    tierRequired: 2,
    description: "Elaborate chest and body harnesses that are beautiful to look at.",
    contexts: ["scene", "social"],
    prerequisites: ["basic_binding"],
    effects: {
      scene: { intensityChange: 2, comfortImpact: 1, moodShift: "adorned" },
      social: { persuasionBonus: 1 },
    },
    rollBonus: 1,
    cooldown: 0,
    teachable: true,
  },
  {
    id: "suspension_rig",
    name: "Suspension Rig",
    skillId: "rope_arts",
    tierRequired: 4,
    description: "Partial or full suspension using advanced rigging techniques.",
    contexts: ["scene"],
    prerequisites: ["decorative_harness"],
    effects: {
      scene: { intensityChange: 4, comfortImpact: -1, moodShift: "floating" },
    },
    rollBonus: 2,
    cooldown: 1,
    teachable: true,
  },
  {
    id: "quick_release",
    name: "Quick Release",
    skillId: "rope_arts",
    tierRequired: 1,
    description: "Emergency release knots that can be undone in seconds.",
    contexts: ["scene", "combat"],
    prerequisites: ["basic_binding"],
    effects: {
      scene: { comfortImpact: 2 },
      combat: { condition: "freed" },
    },
    rollBonus: 1,
    cooldown: 0,
    teachable: true,
  },
  {
    id: "predicament_bondage",
    name: "Predicament Bondage",
    skillId: "rope_arts",
    tierRequired: 5,
    description: "Ties that force the bound person to choose between two uncomfortable positions.",
    contexts: ["scene"],
    prerequisites: ["suspension_rig"],
    effects: {
      scene: { intensityChange: 5, comfortImpact: -2, moodShift: "strained" },
    },
    rollBonus: 3,
    cooldown: 2,
    teachable: false,
  },

  // ── IMPACT TECHNIQUE (3 techniques) ─────────────────────────────────────
  {
    id: "open_hand_strike",
    name: "Open Hand Strike",
    skillId: "impact_technique",
    tierRequired: 0,
    description: "Basic spanking and slapping with controlled force.",
    contexts: ["scene", "combat"],
    prerequisites: [],
    effects: {
      scene: { intensityChange: 1, comfortImpact: 0, moodShift: "stinging" },
      combat: { damage: 2 },
    },
    rollBonus: 0,
    cooldown: 0,
    teachable: true,
  },
  {
    id: "flogging_rhythm",
    name: "Flogging Rhythm",
    skillId: "impact_technique",
    tierRequired: 2,
    description: "Rhythmic flogging that builds sensation gradually.",
    contexts: ["scene"],
    prerequisites: ["open_hand_strike"],
    effects: {
      scene: { intensityChange: 3, comfortImpact: 1, moodShift: "rhythmic" },
    },
    rollBonus: 1,
    cooldown: 0,
    teachable: true,
  },
  {
    id: "precision_caning",
    name: "Precision Caning",
    skillId: "impact_technique",
    tierRequired: 4,
    description: "Precise cane strikes to specific areas with controlled intensity.",
    contexts: ["scene"],
    prerequisites: ["flogging_rhythm"],
    effects: {
      scene: { intensityChange: 5, comfortImpact: -1, moodShift: "sharp" },
    },
    rollBonus: 2,
    cooldown: 1,
    teachable: false,
  },

  // ── SENSATION CRAFT (3 techniques) ──────────────────────────────────────
  {
    id: "temperature_play",
    name: "Temperature Play",
    skillId: "sensation_craft",
    tierRequired: 1,
    description: "Using ice and warm wax to create contrasting sensations.",
    contexts: ["scene"],
    prerequisites: [],
    effects: {
      scene: { intensityChange: 2, comfortImpact: 0, moodShift: "tingling" },
    },
    rollBonus: 0,
    cooldown: 0,
    teachable: true,
  },
  {
    id: "sensory_deprivation",
    name: "Sensory Deprivation",
    skillId: "sensation_craft",
    tierRequired: 3,
    description: "Blindfolds, earplugs, and hoods to heighten remaining senses.",
    contexts: ["scene"],
    prerequisites: ["temperature_play"],
    effects: {
      scene: { intensityChange: 3, comfortImpact: -1, moodShift: "heightened" },
    },
    rollBonus: 1,
    cooldown: 0,
    teachable: true,
  },
  {
    id: "nerve_mapping",
    name: "Nerve Mapping",
    skillId: "sensation_craft",
    tierRequired: 5,
    description: "Advanced knowledge of nerve clusters for precise stimulation.",
    contexts: ["scene", "combat"],
    prerequisites: ["sensory_deprivation"],
    effects: {
      scene: { intensityChange: 4, comfortImpact: 1, moodShift: "electric" },
      combat: { condition: "stunned" },
    },
    rollBonus: 2,
    cooldown: 1,
    teachable: false,
  },

  // ── DOMINATION (3 techniques) ───────────────────────────────────────────
  {
    id: "commanding_presence",
    name: "Commanding Presence",
    skillId: "domination",
    tierRequired: 0,
    description: "Project authority through voice, posture, and eye contact.",
    contexts: ["scene", "social", "combat"],
    prerequisites: [],
    effects: {
      scene: { intensityChange: 1, moodShift: "awed" },
      social: { intimidationBonus: 2 },
      combat: { condition: "shaken" },
    },
    rollBonus: 0,
    cooldown: 0,
    teachable: true,
  },
  {
    id: "protocol_training",
    name: "Protocol Training",
    skillId: "domination",
    tierRequired: 2,
    description: "Establish and enforce behavioral rules and rituals.",
    contexts: ["scene", "social"],
    prerequisites: ["commanding_presence"],
    effects: {
      scene: { intensityChange: 2, comfortImpact: 1, moodShift: "structured" },
      social: { persuasionBonus: 1, intimidationBonus: 1 },
    },
    rollBonus: 1,
    cooldown: 0,
    teachable: true,
  },
  {
    id: "mental_subjugation",
    name: "Mental Subjugation",
    skillId: "domination",
    tierRequired: 5,
    description: "Deep psychological domination through conditioning and control.",
    contexts: ["scene"],
    prerequisites: ["protocol_training"],
    effects: {
      scene: { intensityChange: 5, comfortImpact: -2, moodShift: "enthralled" },
    },
    rollBonus: 3,
    cooldown: 2,
    teachable: false,
  },

  // ── SUBMISSION ARTS (3 techniques) ──────────────────────────────────────
  {
    id: "graceful_surrender",
    name: "Graceful Surrender",
    skillId: "submission_arts",
    tierRequired: 0,
    description: "The art of yielding with poise and intention.",
    contexts: ["scene", "social"],
    prerequisites: [],
    effects: {
      scene: { intensityChange: 1, comfortImpact: 1, moodShift: "yielding" },
      social: { persuasionBonus: 1 },
    },
    rollBonus: 0,
    cooldown: 0,
    teachable: true,
  },
  {
    id: "service_devotion",
    name: "Service Devotion",
    skillId: "submission_arts",
    tierRequired: 2,
    description: "Attentive, anticipatory service that deepens connection.",
    contexts: ["scene", "social"],
    prerequisites: ["graceful_surrender"],
    effects: {
      scene: { intensityChange: 2, comfortImpact: 2, moodShift: "devoted" },
      social: { persuasionBonus: 2 },
    },
    rollBonus: 1,
    cooldown: 0,
    teachable: true,
  },
  {
    id: "subspace_channeling",
    name: "Subspace Channeling",
    skillId: "submission_arts",
    tierRequired: 5,
    description: "Controlled entry into deep subspace for transcendent experiences.",
    contexts: ["scene"],
    prerequisites: ["service_devotion"],
    effects: {
      scene: { intensityChange: 5, comfortImpact: 0, moodShift: "transcendent" },
    },
    rollBonus: 3,
    cooldown: 2,
    teachable: false,
  },

  // ── AFTERCARE (2 techniques) ────────────────────────────────────────────
  {
    id: "comfort_touch",
    name: "Comfort Touch",
    skillId: "aftercare",
    tierRequired: 0,
    description: "Gentle physical comfort — holding, stroking, warming.",
    contexts: ["scene", "social"],
    prerequisites: [],
    effects: {
      scene: { intensityChange: -2, comfortImpact: 3, moodShift: "soothed" },
      social: { persuasionBonus: 1 },
    },
    rollBonus: 0,
    cooldown: 0,
    teachable: true,
  },
  {
    id: "emotional_grounding",
    name: "Emotional Grounding",
    skillId: "aftercare",
    tierRequired: 3,
    description: "Guided breathing and verbal reassurance to restore emotional equilibrium.",
    contexts: ["scene", "social"],
    prerequisites: ["comfort_touch"],
    effects: {
      scene: { intensityChange: -3, comfortImpact: 5, moodShift: "grounded" },
      social: { insightReveal: true },
    },
    rollBonus: 2,
    cooldown: 0,
    teachable: true,
  },

  // ── EDGE PLAY (2 techniques) ────────────────────────────────────────────
  {
    id: "breath_control",
    name: "Breath Control",
    skillId: "edge_play",
    tierRequired: 4,
    description: "Controlled restriction of breathing for heightened sensation.",
    contexts: ["scene"],
    prerequisites: [],
    effects: {
      scene: { intensityChange: 5, comfortImpact: -2, moodShift: "lightheaded" },
    },
    rollBonus: 2,
    cooldown: 2,
    teachable: false,
  },
  {
    id: "knife_trace",
    name: "Knife Trace",
    skillId: "edge_play",
    tierRequired: 4,
    description: "Drawing a blade lightly across skin for psychological intensity.",
    contexts: ["scene", "combat"],
    prerequisites: [],
    effects: {
      scene: { intensityChange: 4, comfortImpact: -1, moodShift: "adrenaline" },
      combat: { damage: 1, condition: "frightened" },
    },
    rollBonus: 2,
    cooldown: 1,
    teachable: false,
  },

  // ── MARTIAL ARTS (4 techniques) ─────────────────────────────────────────
  {
    id: "swift_strike",
    name: "Swift Strike",
    skillId: "martial_arts",
    tierRequired: 0,
    description: "A quick, precise unarmed strike.",
    contexts: ["combat"],
    prerequisites: [],
    effects: {
      combat: { damage: 3 },
    },
    rollBonus: 0,
    cooldown: 0,
    teachable: true,
  },
  {
    id: "grapple_hold",
    name: "Grapple Hold",
    skillId: "martial_arts",
    tierRequired: 1,
    description: "Seize and restrain an opponent in close quarters.",
    contexts: ["combat", "scene"],
    prerequisites: ["swift_strike"],
    effects: {
      combat: { condition: "grappled" },
      scene: { intensityChange: 1, moodShift: "restrained" },
    },
    rollBonus: 1,
    cooldown: 0,
    teachable: true,
  },
  {
    id: "pressure_point",
    name: "Pressure Point",
    skillId: "martial_arts",
    tierRequired: 3,
    description: "Target nerve clusters to cause pain or numbness.",
    contexts: ["combat"],
    prerequisites: ["grapple_hold"],
    effects: {
      combat: { damage: 5, condition: "weakened" },
    },
    rollBonus: 2,
    cooldown: 1,
    teachable: true,
  },
  {
    id: "iron_fist",
    name: "Iron Fist",
    skillId: "martial_arts",
    tierRequired: 5,
    description: "A devastating focused strike that can shatter armour.",
    contexts: ["combat"],
    prerequisites: ["pressure_point"],
    effects: {
      combat: { damage: 10 },
    },
    rollBonus: 3,
    cooldown: 2,
    teachable: false,
  },

  // ── BLADE MASTERY (3 techniques) ────────────────────────────────────────
  {
    id: "quick_draw",
    name: "Quick Draw",
    skillId: "blade_mastery",
    tierRequired: 0,
    description: "Draw and strike in a single fluid motion.",
    contexts: ["combat"],
    prerequisites: [],
    effects: {
      combat: { damage: 4 },
    },
    rollBonus: 1,
    cooldown: 0,
    teachable: true,
  },
  {
    id: "parry_riposte",
    name: "Parry Riposte",
    skillId: "blade_mastery",
    tierRequired: 2,
    description: "Deflect an incoming attack and counter-strike immediately.",
    contexts: ["combat"],
    prerequisites: ["quick_draw"],
    effects: {
      combat: { acBonus: 2, damage: 3 },
    },
    rollBonus: 1,
    cooldown: 1,
    teachable: true,
  },
  {
    id: "whirlwind_slash",
    name: "Whirlwind Slash",
    skillId: "blade_mastery",
    tierRequired: 4,
    description: "A spinning attack that strikes all adjacent foes.",
    contexts: ["combat"],
    prerequisites: ["parry_riposte"],
    effects: {
      combat: { damage: 7 },
    },
    rollBonus: 2,
    cooldown: 2,
    teachable: false,
  },

  // ── FIRE MAGIC (4 techniques) ───────────────────────────────────────────
  {
    id: "fire_bolt",
    name: "Fire Bolt",
    skillId: "fire_magic",
    tierRequired: 0,
    description: "Hurl a small bolt of fire at a target.",
    contexts: ["combat"],
    prerequisites: [],
    effects: {
      combat: { damage: 4 },
    },
    rollBonus: 0,
    cooldown: 0,
    teachable: true,
  },
  {
    id: "flame_shield",
    name: "Flame Shield",
    skillId: "fire_magic",
    tierRequired: 2,
    description: "Surround yourself with protective flames that damage attackers.",
    contexts: ["combat"],
    prerequisites: ["fire_bolt"],
    effects: {
      combat: { acBonus: 2, damage: 2 },
    },
    rollBonus: 1,
    cooldown: 1,
    teachable: true,
  },
  {
    id: "fireball",
    name: "Fireball",
    skillId: "fire_magic",
    tierRequired: 4,
    description: "Launch an explosive ball of fire that damages an area.",
    contexts: ["combat"],
    prerequisites: ["flame_shield"],
    effects: {
      combat: { damage: 12 },
    },
    rollBonus: 2,
    cooldown: 2,
    teachable: true,
  },
  {
    id: "inferno",
    name: "Inferno",
    skillId: "fire_magic",
    tierRequired: 7,
    description: "Unleash a devastating firestorm across the battlefield.",
    contexts: ["combat"],
    prerequisites: ["fireball"],
    effects: {
      combat: { damage: 20, condition: "burning" },
    },
    rollBonus: 4,
    cooldown: 3,
    teachable: false,
  },

  // ── HEALING MAGIC (2 techniques) ────────────────────────────────────────
  {
    id: "mend_wounds",
    name: "Mend Wounds",
    skillId: "healing_magic",
    tierRequired: 0,
    description: "Close minor cuts and bruises with healing energy.",
    contexts: ["combat", "scene"],
    prerequisites: [],
    effects: {
      combat: { healing: 5 },
      scene: { comfortImpact: 3, moodShift: "relieved" },
    },
    rollBonus: 0,
    cooldown: 0,
    teachable: true,
  },
  {
    id: "restoration",
    name: "Restoration",
    skillId: "healing_magic",
    tierRequired: 3,
    description: "Powerful healing that cures conditions and restores vitality.",
    contexts: ["combat", "scene"],
    prerequisites: ["mend_wounds"],
    effects: {
      combat: { healing: 15, tempHp: 5 },
      scene: { comfortImpact: 5, moodShift: "restored" },
    },
    rollBonus: 2,
    cooldown: 2,
    teachable: true,
  },

  // ── ENCHANTMENT (2 techniques) ──────────────────────────────────────────
  {
    id: "charm_person",
    name: "Charm Person",
    skillId: "enchantment",
    tierRequired: 1,
    description: "Magically influence a person to regard you as a friend.",
    contexts: ["social", "combat"],
    prerequisites: [],
    effects: {
      social: { persuasionBonus: 3 },
      combat: { condition: "charmed" },
    },
    rollBonus: 1,
    cooldown: 1,
    teachable: true,
  },
  {
    id: "mass_suggestion",
    name: "Mass Suggestion",
    skillId: "enchantment",
    tierRequired: 5,
    description: "Plant a suggestion in the minds of multiple targets.",
    contexts: ["social", "combat"],
    prerequisites: ["charm_person"],
    effects: {
      social: { persuasionBonus: 5 },
      combat: { condition: "confused" },
    },
    rollBonus: 3,
    cooldown: 3,
    teachable: false,
  },

  // ── SEDUCTION (2 techniques) ────────────────────────────────────────────
  {
    id: "alluring_glance",
    name: "Alluring Glance",
    skillId: "seduction",
    tierRequired: 0,
    description: "A captivating look that draws attention and interest.",
    contexts: ["social", "scene"],
    prerequisites: [],
    effects: {
      social: { persuasionBonus: 1 },
      scene: { intensityChange: 1, moodShift: "intrigued" },
    },
    rollBonus: 0,
    cooldown: 0,
    teachable: true,
  },
  {
    id: "irresistible_charm",
    name: "Irresistible Charm",
    skillId: "seduction",
    tierRequired: 3,
    description: "An overwhelming aura of desirability that weakens resistance.",
    contexts: ["social", "scene"],
    prerequisites: ["alluring_glance"],
    effects: {
      social: { persuasionBonus: 3 },
      scene: { intensityChange: 3, moodShift: "captivated" },
    },
    rollBonus: 2,
    cooldown: 1,
    teachable: true,
  },

  // ── STEALTH (1 technique) ──────────────────────────────────────────────
  {
    id: "shadow_step",
    name: "Shadow Step",
    skillId: "stealth",
    tierRequired: 2,
    description: "Move silently from shadow to shadow, nearly invisible.",
    contexts: ["exploration", "combat"],
    prerequisites: [],
    effects: {
      exploration: { stealthBonus: 3 },
      combat: { acBonus: 1 },
    },
    rollBonus: 1,
    cooldown: 0,
    teachable: true,
  },

  // ── PERCEPTION (1 technique) ────────────────────────────────────────────
  {
    id: "keen_eye",
    name: "Keen Eye",
    skillId: "perception",
    tierRequired: 1,
    description: "Spot hidden details, traps, and concealed passages.",
    contexts: ["exploration"],
    prerequisites: [],
    effects: {
      exploration: { perceptionBonus: 3, trapDisable: true },
    },
    rollBonus: 1,
    cooldown: 0,
    teachable: true,
  },

  // ── PERSUASION (2 techniques) ───────────────────────────────────────────
  {
    id: "silver_tongue",
    name: "Silver Tongue",
    skillId: "persuasion",
    tierRequired: 1,
    description: "Smooth, convincing speech that sways opinions.",
    contexts: ["social"],
    prerequisites: [],
    effects: {
      social: { persuasionBonus: 2 },
    },
    rollBonus: 1,
    cooldown: 0,
    teachable: true,
  },
  {
    id: "impassioned_plea",
    name: "Impassioned Plea",
    skillId: "persuasion",
    tierRequired: 4,
    description: "An emotional appeal so moving it can change minds on the spot.",
    contexts: ["social"],
    prerequisites: ["silver_tongue"],
    effects: {
      social: { persuasionBonus: 5, insightReveal: true },
    },
    rollBonus: 3,
    cooldown: 2,
    teachable: true,
  },

  // ── INTIMIDATION (1 technique) ──────────────────────────────────────────
  {
    id: "menacing_glare",
    name: "Menacing Glare",
    skillId: "intimidation",
    tierRequired: 1,
    description: "A withering stare that makes lesser foes quail.",
    contexts: ["social", "combat"],
    prerequisites: [],
    effects: {
      social: { intimidationBonus: 3 },
      combat: { condition: "frightened" },
    },
    rollBonus: 1,
    cooldown: 0,
    teachable: true,
  },
];

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

const techniqueIndex = new Map<string, TechniqueDefinition>(
  ALL_TECHNIQUES.map((t) => [t.id, t]),
);

export function getTechniqueById(id: string): TechniqueDefinition | undefined {
  return techniqueIndex.get(id);
}

export function getTechniquesForSkill(skillId: string): TechniqueDefinition[] {
  return ALL_TECHNIQUES.filter((t) => t.skillId === skillId);
}

export function getTechniquesAtTier(
  skillId: string,
  tier: number,
): TechniqueDefinition[] {
  return ALL_TECHNIQUES.filter(
    (t) => t.skillId === skillId && t.tierRequired <= tier,
  );
}
