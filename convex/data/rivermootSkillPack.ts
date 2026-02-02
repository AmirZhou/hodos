/**
 * Rivermoot Campaign Skill Pack — defines which skills and techniques
 * are available in the Rivermoot campaign. Future campaigns can define
 * their own packs with different selections.
 */
import { ALL_SKILLS } from "./skillCatalog";
import { ALL_TECHNIQUES } from "./techniqueCatalog";

// Rivermoot uses all currently defined skills and techniques
export const RIVERMOOT_SKILL_IDS = ALL_SKILLS.map((s) => s.id);
export const RIVERMOOT_TECHNIQUE_IDS = ALL_TECHNIQUES.map((t) => t.id);
