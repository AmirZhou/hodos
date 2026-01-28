/**
 * Kink Taxonomy
 *
 * Central definition of kink categories and individual kinks for the game.
 * Used by both character creation (frontend) and NPC generation (backend).
 *
 * Preference levels:
 * -2 = Hard Limit (never, absolutely not)
 * -1 = Soft Limit (generally no, but negotiable)
 *  0 = Neutral (no particular interest)
 *  1 = Curious (interested in exploring)
 *  2 = Enjoys (actively enjoys)
 *  3 = Expert/Loves (highly experienced, seeks out)
 */

export type KinkPreferenceLevel = -2 | -1 | 0 | 1 | 2 | 3;

export const PREFERENCE_LABELS: Record<KinkPreferenceLevel, string> = {
  [-2]: "Hard Limit",
  [-1]: "Soft Limit",
  [0]: "Neutral",
  [1]: "Curious",
  [2]: "Enjoys",
  [3]: "Expert",
};

export interface KinkDefinition {
  id: string;
  name: string;
  description: string;
  defaultLevel?: KinkPreferenceLevel;
  requiresTrust?: number; // Minimum trust level to suggest (0-100)
  intensity?: 1 | 2 | 3; // Low/Medium/High intensity
}

export interface KinkCategory {
  id: string;
  name: string;
  description: string;
  kinks: KinkDefinition[];
}

export const KINK_TAXONOMY: KinkCategory[] = [
  {
    id: "bondage",
    name: "Bondage & Restraint",
    description: "Physical restraint and restriction of movement",
    kinks: [
      { id: "rope", name: "Rope", description: "Being tied with rope", intensity: 2 },
      { id: "cuffs", name: "Cuffs", description: "Handcuffs or ankle cuffs", intensity: 1 },
      { id: "spreaderBars", name: "Spreader Bars", description: "Bars that keep limbs apart", intensity: 2 },
      { id: "shibari", name: "Shibari", description: "Japanese rope bondage art", intensity: 3, requiresTrust: 60 },
      { id: "predicament", name: "Predicament Bondage", description: "Bondage that forces difficult choices", intensity: 3, requiresTrust: 70 },
      { id: "mummification", name: "Mummification", description: "Full body wrapping", intensity: 3, requiresTrust: 80 },
    ],
  },
  {
    id: "impact",
    name: "Impact Play",
    description: "Striking the body for sensation",
    kinks: [
      { id: "spanking", name: "Spanking", description: "Striking with open hand", intensity: 1 },
      { id: "bareHand", name: "Bare Hand", description: "Impact using only hands", intensity: 1 },
      { id: "paddling", name: "Paddling", description: "Using paddles", intensity: 2 },
      { id: "flogging", name: "Flogging", description: "Multi-tailed floggers", intensity: 2 },
      { id: "crops", name: "Crops", description: "Riding crops", intensity: 2 },
      { id: "caning", name: "Caning", description: "Thin rods or canes", intensity: 3, requiresTrust: 70 },
    ],
  },
  {
    id: "sensation",
    name: "Sensation Play",
    description: "Playing with different physical sensations",
    kinks: [
      { id: "tickling", name: "Tickling", description: "Tickle torture and play", intensity: 1 },
      { id: "scratching", name: "Scratching", description: "Nails or tools on skin", intensity: 1 },
      { id: "ice", name: "Ice", description: "Cold temperature play", intensity: 1 },
      { id: "wax", name: "Wax", description: "Hot wax dripping", intensity: 2 },
      { id: "pinwheels", name: "Pinwheels", description: "Wartenberg wheels", intensity: 2 },
      { id: "electricity", name: "Electricity", description: "E-stim devices", intensity: 3, requiresTrust: 60 },
    ],
  },
  {
    id: "powerExchange",
    name: "Power Exchange",
    description: "Dynamics of control and surrender",
    kinks: [
      { id: "protocols", name: "Protocols", description: "Formal rules and rituals", intensity: 1 },
      { id: "titles", name: "Titles", description: "Honorific titles (Sir, Miss, etc.)", intensity: 1 },
      { id: "rules", name: "Rules", description: "Behavioral rules and expectations", intensity: 2 },
      { id: "punishmentReward", name: "Punishment/Reward", description: "Consequences for behavior", intensity: 2 },
      { id: "orgasmControl", name: "Orgasm Control", description: "Controlling when/if one can climax", intensity: 2 },
      { id: "chastity", name: "Chastity", description: "Denial and chastity devices", intensity: 3, requiresTrust: 70 },
    ],
  },
  {
    id: "service",
    name: "Service",
    description: "Acts of devotion and care",
    kinks: [
      { id: "domesticService", name: "Domestic Service", description: "Household tasks as service", intensity: 1 },
      { id: "bodyWorship", name: "Body Worship", description: "Adoration of body parts", intensity: 1 },
      { id: "grooming", name: "Grooming", description: "Bathing, shaving, dressing", intensity: 2 },
      { id: "waiting", name: "Waiting/Attendance", description: "Being present and attentive", intensity: 2 },
      { id: "devotion", name: "Devotion", description: "Deep emotional service", intensity: 3, requiresTrust: 60 },
    ],
  },
  {
    id: "rolePlay",
    name: "Role Play",
    description: "Adopting different personas or scenarios",
    kinks: [
      { id: "authorityFigures", name: "Authority Figures", description: "Teacher, boss, officer, etc.", intensity: 1 },
      { id: "strangerScenarios", name: "Stranger Scenarios", description: "Pretending to be strangers", intensity: 2 },
      { id: "petPlay", name: "Pet Play", description: "Acting as an animal", intensity: 2 },
      { id: "preyPredator", name: "Prey/Predator", description: "Chase and capture dynamics", intensity: 2 },
    ],
  },
  {
    id: "humiliation",
    name: "Humiliation",
    description: "Embarrassment and degradation play",
    kinks: [
      { id: "verbal", name: "Verbal", description: "Degrading words and names", intensity: 2 },
      { id: "clothingControl", name: "Clothing Control", description: "Control over what one wears", intensity: 1 },
      { id: "tasks", name: "Tasks", description: "Embarrassing tasks or challenges", intensity: 2 },
      { id: "objectification", name: "Objectification", description: "Being treated as an object", intensity: 3, requiresTrust: 70 },
      { id: "public", name: "Public Humiliation", description: "Embarrassment in front of others", intensity: 3, requiresTrust: 80 },
    ],
  },
  {
    id: "exhibition",
    name: "Exhibition & Voyeurism",
    description: "Being watched or watching others",
    kinks: [
      { id: "beingWatched", name: "Being Watched", description: "Performing for an audience", intensity: 2 },
      { id: "watching", name: "Watching", description: "Observing others", intensity: 1 },
      { id: "publicPlay", name: "Public Play", description: "Activities in semi-public spaces", intensity: 2 },
      { id: "photography", name: "Photography", description: "Being photographed or filmed", intensity: 2 },
      { id: "sharing", name: "Sharing", description: "Partner sharing dynamics", intensity: 3, requiresTrust: 90 },
    ],
  },
  {
    id: "worship",
    name: "Worship",
    description: "Adoration of specific body parts",
    kinks: [
      { id: "feetWorship", name: "Feet", description: "Foot adoration", intensity: 1 },
      { id: "legWorship", name: "Legs", description: "Leg adoration", intensity: 1 },
      { id: "muscleWorship", name: "Muscle", description: "Physical strength adoration", intensity: 2 },
    ],
  },
  {
    id: "edgePlay",
    name: "Edge Play",
    description: "Higher risk activities (proceed with extreme caution)",
    kinks: [
      { id: "fearPlay", name: "Fear Play", description: "Inducing fear for arousal", intensity: 3, requiresTrust: 70 },
      { id: "breathPlay", name: "Breath Play", description: "Restricting breathing", defaultLevel: -2, intensity: 3, requiresTrust: 95 },
      { id: "knifePlay", name: "Knife Play", description: "Using blades for sensation", defaultLevel: -2, intensity: 3, requiresTrust: 95 },
      { id: "consensualNonConsent", name: "CNC", description: "Consensual non-consent scenarios", defaultLevel: -2, intensity: 3, requiresTrust: 95 },
    ],
  },
];

// Flatten for easy lookup
export const ALL_KINKS = KINK_TAXONOMY.flatMap((cat) => cat.kinks);

export const KINK_BY_ID = Object.fromEntries(
  ALL_KINKS.map((k) => [k.id, k])
) as Record<string, KinkDefinition>;

// Get default kink preferences (all neutral except edge play defaults)
export function getDefaultKinkPreferences(): Record<string, KinkPreferenceLevel> {
  const defaults: Record<string, KinkPreferenceLevel> = {};
  for (const kink of ALL_KINKS) {
    defaults[kink.id] = kink.defaultLevel ?? 0;
  }
  return defaults;
}

// Get category for a kink
export function getCategoryForKink(kinkId: string): KinkCategory | undefined {
  return KINK_TAXONOMY.find((cat) => cat.kinks.some((k) => k.id === kinkId));
}

// Get kinks that require certain trust level
export function getKinksRequiringTrust(trustLevel: number): KinkDefinition[] {
  return ALL_KINKS.filter((k) => (k.requiresTrust ?? 0) <= trustLevel);
}

// Helper for frontend: get simplified category map
export function getKinkCategoriesSimple(): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const cat of KINK_TAXONOMY) {
    result[cat.name] = cat.kinks.map((k) => k.id);
  }
  return result;
}
