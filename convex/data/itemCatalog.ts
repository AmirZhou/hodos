import { ALL_ITEMS } from "./equipmentItems";
import type { EquipmentSlot } from "./equipmentItems";

const SLOT_ORDER: EquipmentSlot[] = [
  "head", "chest", "hands", "boots", "cloak",
  "ring", "necklace", "mainHand", "offHand", "book",
];

const SLOT_DISPLAY: Record<EquipmentSlot, string> = {
  head: "HEAD",
  chest: "CHEST",
  hands: "HANDS",
  boots: "BOOTS",
  cloak: "CLOAK",
  ring: "RING",
  necklace: "NECKLACE",
  mainHand: "MAIN HAND",
  offHand: "OFF HAND",
  book: "BOOK",
};

/**
 * Compact catalog: only IDs grouped by slot + rarity tier prefix.
 * Keeps prompt tokens low (~170 IDs without names).
 * Pattern: {slot}_{rarity}_{nn} e.g. boots_gray_01 = mundane boots #1
 * Rarity prefixes: gray=mundane, white=common, green=uncommon, blue=rare, epic=epic, legendary=legendary
 */
export function getItemCatalogForPrompt(): string {
  const grouped: Record<string, string[]> = {};
  for (const item of ALL_ITEMS) {
    const slot = item.type;
    if (!grouped[slot]) grouped[slot] = [];
    grouped[slot].push(item.id);
  }

  return SLOT_ORDER
    .filter((slot) => grouped[slot])
    .map((slot) => `${SLOT_DISPLAY[slot]}: ${grouped[slot].join(", ")}`)
    .join("\n");
}
