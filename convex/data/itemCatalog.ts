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

export function getItemCatalogForPrompt(): string {
  const grouped: Record<string, string[]> = {};
  for (const item of ALL_ITEMS) {
    const slot = item.type;
    if (!grouped[slot]) grouped[slot] = [];
    grouped[slot].push(`${item.id} (${item.name})`);
  }

  return SLOT_ORDER
    .filter((slot) => grouped[slot])
    .map((slot) => `${SLOT_DISPLAY[slot]}: ${grouped[slot].join(", ")}`)
    .join("\n");
}
