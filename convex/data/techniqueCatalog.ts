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
    damageReduction?: number;
    magicResist?: number;
    stunChance?: number;
    undeadBonus?: number;
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
    trapResist?: number;
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
  comboFrom?: string[];
  comboBonusDamage?: number;
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

  // ── HEAVY WEAPONS (2 techniques) ─────────────────────────────────────
  {
    id: "crushing_blow",
    name: "Crushing Blow",
    skillId: "heavy_weapons",
    tierRequired: 0,
    description: "A powerful overhead strike that exploits the weight of a heavy weapon.",
    contexts: ["combat"],
    prerequisites: [],
    effects: {
      combat: { damage: 5 },
    },
    rollBonus: 0,
    cooldown: 0,
    teachable: true,
  },
  {
    id: "sundering_strike",
    name: "Sundering Strike",
    skillId: "heavy_weapons",
    tierRequired: 2,
    description: "A targeted blow aimed at breaking armor and shields.",
    contexts: ["combat"],
    prerequisites: ["crushing_blow"],
    effects: {
      combat: { damage: 4, condition: "armor_broken" },
    },
    rollBonus: 1,
    cooldown: 1,
    teachable: false,
  },

  // ── ARCHERY (2 techniques) ───────────────────────────────────────────
  {
    id: "aimed_shot",
    name: "Aimed Shot",
    skillId: "archery",
    tierRequired: 0,
    description: "Take a moment to steady your aim for a precise ranged attack.",
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
    id: "pinning_arrow",
    name: "Pinning Arrow",
    skillId: "archery",
    tierRequired: 2,
    description: "Pin a target's clothing or limb to a surface, restricting movement.",
    contexts: ["combat"],
    prerequisites: ["aimed_shot"],
    effects: {
      combat: { damage: 2, condition: "pinned" },
    },
    rollBonus: 1,
    cooldown: 1,
    teachable: false,
  },

  // ── ICE MAGIC (2 techniques) ─────────────────────────────────────────
  {
    id: "frost_bolt",
    name: "Frost Bolt",
    skillId: "ice_magic",
    tierRequired: 0,
    description: "Launch a shard of magical ice at a target.",
    contexts: ["combat"],
    prerequisites: [],
    effects: {
      combat: { damage: 4, condition: "chilled" },
    },
    rollBonus: 0,
    cooldown: 0,
    teachable: true,
  },
  {
    id: "frozen_ground",
    name: "Frozen Ground",
    skillId: "ice_magic",
    tierRequired: 2,
    description: "Coat the ground in treacherous ice, slowing all who cross it.",
    contexts: ["combat", "exploration"],
    prerequisites: ["frost_bolt"],
    effects: {
      combat: { condition: "slowed" },
      exploration: { stealthBonus: 1 },
    },
    rollBonus: 1,
    cooldown: 1,
    teachable: false,
  },

  // ── SHADOW MAGIC (2 techniques) ──────────────────────────────────────
  {
    id: "shadow_cloak",
    name: "Shadow Cloak",
    skillId: "shadow_magic",
    tierRequired: 1,
    description: "Wrap yourself in living shadow, blending into darkness.",
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
  {
    id: "umbral_bolt",
    name: "Umbral Bolt",
    skillId: "shadow_magic",
    tierRequired: 2,
    description: "Hurl a bolt of condensed darkness that saps the target's strength.",
    contexts: ["combat"],
    prerequisites: ["shadow_cloak"],
    effects: {
      combat: { damage: 5, condition: "weakened" },
    },
    rollBonus: 1,
    cooldown: 1,
    teachable: false,
  },

  // ── DECEPTION (2 techniques) ─────────────────────────────────────────
  {
    id: "convincing_lie",
    name: "Convincing Lie",
    skillId: "deception",
    tierRequired: 0,
    description: "Deliver a falsehood with such confidence that it sounds like truth.",
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
    id: "misdirection",
    name: "Misdirection",
    skillId: "deception",
    tierRequired: 2,
    description: "Create a distraction that draws attention away from your true intent.",
    contexts: ["social", "combat"],
    prerequisites: ["convincing_lie"],
    effects: {
      social: { insightReveal: true },
      combat: { condition: "distracted" },
    },
    rollBonus: 1,
    cooldown: 1,
    teachable: false,
  },

  // ── HERBALISM (2 techniques) ─────────────────────────────────────────
  {
    id: "healing_poultice",
    name: "Healing Poultice",
    skillId: "herbalism",
    tierRequired: 0,
    description: "Prepare a soothing herbal poultice to treat minor injuries.",
    contexts: ["exploration"],
    prerequisites: [],
    effects: {
      exploration: { perceptionBonus: 1 },
    },
    rollBonus: 0,
    cooldown: 0,
    teachable: true,
  },
  {
    id: "poison_extraction",
    name: "Poison Extraction",
    skillId: "herbalism",
    tierRequired: 2,
    description: "Identify and extract toxins from wounds or tainted food.",
    contexts: ["exploration", "combat"],
    prerequisites: ["healing_poultice"],
    effects: {
      exploration: { perceptionBonus: 2 },
      combat: { healing: 3 },
    },
    rollBonus: 1,
    cooldown: 1,
    teachable: false,
  },

  // ── NEGOTIATION (2 techniques) ───────────────────────────────────────
  {
    id: "opening_offer",
    name: "Opening Offer",
    skillId: "negotiation",
    tierRequired: 0,
    description: "Frame the terms of a deal to your advantage from the start.",
    contexts: ["social"],
    prerequisites: [],
    effects: {
      social: { persuasionBonus: 2 },
    },
    rollBonus: 0,
    cooldown: 0,
    teachable: true,
  },
  {
    id: "hard_bargain",
    name: "Hard Bargain",
    skillId: "negotiation",
    tierRequired: 2,
    description: "Press aggressively for concessions, leveraging every advantage.",
    contexts: ["social"],
    prerequisites: ["opening_offer"],
    effects: {
      social: { persuasionBonus: 3, intimidationBonus: 1 },
    },
    rollBonus: 1,
    cooldown: 1,
    teachable: false,
  },

  // ── LOCKPICKING (2 techniques) ───────────────────────────────────────
  {
    id: "pick_lock",
    name: "Pick Lock",
    skillId: "lockpicking",
    tierRequired: 0,
    description: "Manipulate tumblers and pins to open a standard lock.",
    contexts: ["exploration"],
    prerequisites: [],
    effects: {
      exploration: { trapDisable: true },
    },
    rollBonus: 0,
    cooldown: 0,
    teachable: true,
  },
  {
    id: "disarm_trap",
    name: "Disarm Trap",
    skillId: "lockpicking",
    tierRequired: 2,
    description: "Safely neutralize mechanical traps and pressure plates.",
    contexts: ["exploration"],
    prerequisites: ["pick_lock"],
    effects: {
      exploration: { trapDisable: true, perceptionBonus: 2 },
    },
    rollBonus: 1,
    cooldown: 0,
    teachable: false,
  },

  // ── DIRTY FIGHTING (2 techniques) ────────────────────────────────────
  {
    id: "low_blow",
    name: "Low Blow",
    skillId: "dirty_fighting",
    tierRequired: 0,
    description: "A cheap shot aimed at vulnerable areas to stagger an opponent.",
    contexts: ["combat"],
    prerequisites: [],
    effects: {
      combat: { damage: 3, condition: "staggered" },
    },
    rollBonus: 0,
    cooldown: 0,
    teachable: true,
  },
  {
    id: "pocket_sand",
    name: "Pocket Sand",
    skillId: "dirty_fighting",
    tierRequired: 1,
    description: "Throw a handful of grit into an enemy's eyes to blind them briefly.",
    contexts: ["combat"],
    prerequisites: ["low_blow"],
    effects: {
      combat: { condition: "blinded" },
    },
    rollBonus: 1,
    cooldown: 1,
    teachable: false,
  },

  // ── BLADE MASTERY — TIER 6 CAPSTONE (1 technique) ────────────────────
  {
    id: "thousand_cuts",
    name: "Thousand Cuts",
    skillId: "blade_mastery",
    tierRequired: 6,
    description: "A blinding flurry of slashes so fast the eye cannot follow, leaving foes riddled with wounds.",
    contexts: ["combat"],
    prerequisites: ["whirlwind_slash"],
    effects: {
      combat: { damage: 14, condition: "bleeding" },
    },
    rollBonus: 3,
    cooldown: 2,
    teachable: false,
  },

  // ── FIRE MAGIC — TIER 6 CAPSTONE (1 technique) ──────────────────────
  {
    id: "phoenix_flame",
    name: "Phoenix Flame",
    skillId: "fire_magic",
    tierRequired: 6,
    description: "Channel the mythic phoenix to immolate foes and heal allies in the same blaze.",
    contexts: ["combat"],
    prerequisites: ["fireball"],
    effects: {
      combat: { damage: 16, healing: 8, condition: "burning" },
    },
    rollBonus: 3,
    cooldown: 2,
    teachable: false,
  },

  // ── DOMINATION — TIER 6 CAPSTONE (1 technique) ──────────────────────
  {
    id: "absolute_authority",
    name: "Absolute Authority",
    skillId: "domination",
    tierRequired: 6,
    description: "Your command becomes law — even the strong-willed find it nearly impossible to resist.",
    contexts: ["scene", "social", "combat"],
    prerequisites: ["mental_subjugation"],
    effects: {
      scene: { intensityChange: 6, comfortImpact: -1, moodShift: "dominated" },
      social: { intimidationBonus: 5 },
      combat: { condition: "paralyzed" },
    },
    rollBonus: 4,
    cooldown: 2,
    teachable: false,
  },

  // ── MARTIAL ARTS — TIER 8 CAPSTONE (1 technique) ────────────────────
  {
    id: "quivering_palm",
    name: "Quivering Palm",
    skillId: "martial_arts",
    tierRequired: 8,
    description: "A legendary strike that sets up lethal vibrations within the target's body.",
    contexts: ["combat"],
    prerequisites: ["iron_fist"],
    effects: {
      combat: { damage: 25, condition: "doomed" },
    },
    rollBonus: 5,
    cooldown: 3,
    teachable: false,
  },

  // ── ENCHANTMENT — TIER 8 CAPSTONE (1 technique) ─────────────────────
  {
    id: "dominate_will",
    name: "Dominate Will",
    skillId: "enchantment",
    tierRequired: 8,
    description: "Seize total control of a target's mind, bending them to your will completely.",
    contexts: ["social", "combat"],
    prerequisites: ["mass_suggestion"],
    effects: {
      social: { persuasionBonus: 8 },
      combat: { condition: "dominated" },
    },
    rollBonus: 5,
    cooldown: 3,
    teachable: false,
  },

  // ── ROPE ARTS — TIER 8 CAPSTONE (1 technique) ──────────────────────
  {
    id: "living_web",
    name: "Living Web",
    skillId: "rope_arts",
    tierRequired: 8,
    description: "An impossibly intricate full-body rig that responds to the slightest movement, a masterwork of the art.",
    contexts: ["scene"],
    prerequisites: ["predicament_bondage"],
    effects: {
      scene: { intensityChange: 7, comfortImpact: 0, moodShift: "transcendent" },
    },
    rollBonus: 5,
    cooldown: 3,
    teachable: false,
  },

  // ── HERBALISM — EXPLORATION ADDITION (1 technique) ───────────────────
  {
    id: "forage_remedy",
    name: "Forage Remedy",
    skillId: "herbalism",
    tierRequired: 1,
    description: "Scour the surroundings for wild herbs to prepare a field remedy.",
    contexts: ["exploration"],
    prerequisites: ["healing_poultice"],
    effects: {
      exploration: { perceptionBonus: 3 },
    },
    rollBonus: 1,
    cooldown: 1,
    teachable: true,
  },

  // ── LOCKPICKING — EXPLORATION ADDITION (1 technique) ─────────────────
  {
    id: "bypass_mechanism",
    name: "Bypass Mechanism",
    skillId: "lockpicking",
    tierRequired: 3,
    description: "Analyze and bypass complex mechanical puzzles and sealed doors.",
    contexts: ["exploration"],
    prerequisites: ["disarm_trap"],
    effects: {
      exploration: { trapDisable: true, perceptionBonus: 3 },
    },
    rollBonus: 2,
    cooldown: 1,
    teachable: true,
  },

  // ── PERCEPTION — EXPLORATION ADDITION (1 technique) ──────────────────
  {
    id: "danger_sense",
    name: "Danger Sense",
    skillId: "perception",
    tierRequired: 3,
    description: "A heightened awareness that warns you of hidden threats before they strike.",
    contexts: ["exploration", "combat"],
    prerequisites: ["keen_eye"],
    effects: {
      exploration: { perceptionBonus: 4, trapDisable: true },
      combat: { acBonus: 1 },
    },
    rollBonus: 2,
    cooldown: 0,
    teachable: true,
  },

  // ── STEALTH — EXPLORATION ADDITION (1 technique) ─────────────────────
  {
    id: "vanish",
    name: "Vanish",
    skillId: "stealth",
    tierRequired: 4,
    description: "Disappear from sight even in the middle of a confrontation.",
    contexts: ["exploration", "combat"],
    prerequisites: ["shadow_step"],
    effects: {
      exploration: { stealthBonus: 5 },
      combat: { acBonus: 2 },
    },
    rollBonus: 2,
    cooldown: 1,
    teachable: true,
  },

  // ── SHIELD CRAFT (2 techniques) ─────────────────────────────────────────
  {
    id: "shield_bash",
    name: "Shield Bash",
    skillId: "shield_craft",
    tierRequired: 0,
    description: "Strike with shield to stun an opponent.",
    contexts: ["combat"],
    prerequisites: [],
    effects: {
      combat: { damage: 4, condition: "stunned" },
    },
    rollBonus: 0,
    cooldown: 0,
    teachable: true,
  },
  {
    id: "shield_wall",
    name: "Shield Wall",
    skillId: "shield_craft",
    tierRequired: 2,
    description: "Defensive stance reducing incoming damage and improving armor.",
    contexts: ["combat"],
    prerequisites: ["shield_bash"],
    effects: {
      combat: { damageReduction: 8, acBonus: 3 },
    },
    rollBonus: 1,
    cooldown: 0,
    teachable: true,
  },

  // ── DIVINE MAGIC (2 techniques) ──────────────────────────────────────────
  {
    id: "holy_light",
    name: "Holy Light",
    skillId: "divine_magic",
    tierRequired: 0,
    description: "Radiant burst that damages undead and illuminates the area.",
    contexts: ["combat", "scene"],
    prerequisites: [],
    effects: {
      combat: { damage: 6, undeadBonus: 4 },
      scene: { intensityChange: 5 },
    },
    rollBonus: 0,
    cooldown: 0,
    teachable: true,
  },
  {
    id: "divine_ward",
    name: "Divine Ward",
    skillId: "divine_magic",
    tierRequired: 2,
    description: "Protective blessing that shields against dark magic and traps.",
    contexts: ["combat", "exploration"],
    prerequisites: ["holy_light"],
    effects: {
      combat: { damageReduction: 6, magicResist: 4 },
      exploration: { trapResist: 5 },
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
