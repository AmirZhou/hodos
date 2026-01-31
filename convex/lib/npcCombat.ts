import { Doc } from "../_generated/dataModel";
import { abilityModifier } from "./stats";

/**
 * Calculate an NPC's attack bonus based on their abilities.
 * Uses the higher of STR or DEX modifier + a flat proficiency estimate.
 */
export function getNpcAttackBonus(npc: Pick<Doc<"npcs">, "abilities" | "level">): number {
  const strMod = abilityModifier(npc.abilities.strength);
  const dexMod = abilityModifier(npc.abilities.dexterity);
  const proficiency = Math.ceil(npc.level / 4) + 1;
  return proficiency + Math.max(strMod, dexMod);
}

/**
 * Get NPC damage dice string based on level.
 * Simple heuristic: scales with level.
 */
export function getNpcDamageDice(npc: Pick<Doc<"npcs">, "abilities" | "level">): string {
  const strMod = abilityModifier(npc.abilities.strength);
  const dexMod = abilityModifier(npc.abilities.dexterity);
  const damageMod = Math.max(strMod, dexMod);

  if (npc.level >= 11) {
    return damageMod >= 0 ? `2d8+${damageMod}` : `2d8${damageMod}`;
  } else if (npc.level >= 5) {
    return damageMod >= 0 ? `1d10+${damageMod}` : `1d10${damageMod}`;
  } else {
    return damageMod >= 0 ? `1d8+${damageMod}` : `1d8${damageMod}`;
  }
}

/**
 * Get NPC's effective AC (base AC from abilities).
 * NPCs use the ac field directly from their document.
 */
export function getNpcEffectiveAc(npc: Pick<Doc<"npcs">, "ac">): number {
  return npc.ac;
}
