"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import {
  X, Search, Package, Crown, Shirt, Hand, Footprints,
  Shield, CircleDot, Gem, Sword, BookOpen, Scroll,
} from "lucide-react";
import {
  getRarityColor, RARITY_BORDER_COLORS, RARITY_BG_COLORS,
  getSlotLabel, formatStatName, formatStatValue,
} from "@/lib/equipment";
import type { EquipmentSlot, Rarity } from "../../../../convex/data/equipmentItems";

const SLOT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  head: Crown, chest: Shirt, hands: Hand, boots: Footprints,
  cloak: Shield, ring: CircleDot, necklace: Gem,
  mainHand: Sword, offHand: Shield, book: BookOpen,
};

type FilterTab = "all" | "weapons" | "armor" | "accessories" | "books";

const FILTER_SLOTS: Record<FilterTab, EquipmentSlot[] | null> = {
  all: null,
  weapons: ["mainHand", "offHand"],
  armor: ["head", "chest", "hands", "boots", "cloak"],
  accessories: ["ring", "necklace"],
  books: ["book"],
};

interface InventoryModalProps {
  characterId: Id<"characters">;
  onClose: () => void;
}

export function InventoryModal({ characterId, onClose }: InventoryModalProps) {
  const inventory = useQuery(api.equipment.getInventory, { characterId });
  const equipment = useQuery(api.equipment.getEquipment, { characterId });
  const equipItem = useMutation(api.equipment.equipItem);
  const unequipItem = useMutation(api.equipment.unequipItem);

  const [filter, setFilter] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");

  // Build set of equipped item IDs
  const equippedIds = new Set<string>();
  if (equipment) {
    const eq = equipment as Record<string, { id?: string } | null>;
    for (const val of Object.values(eq)) {
      if (val && typeof val === "object" && "id" in val && val.id) {
        equippedIds.add(val.id);
      }
    }
  }

  const filteredItems = (inventory ?? []).filter((item) => {
    if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false;
    const slots = FILTER_SLOTS[filter];
    if (slots && !slots.includes(item.type)) return false;
    return true;
  });

  const handleEquip = (itemId: string) => {
    equipItem({ characterId, itemId });
  };

  const handleUnequip = (itemId: string) => {
    if (!equipment) return;
    const eq = equipment as Record<string, { id?: string } | null>;
    for (const [slot, val] of Object.entries(eq)) {
      if (val && typeof val === "object" && "id" in val && val.id === itemId) {
        unequipItem({ characterId, slot: slot as never });
        return;
      }
    }
  };

  const getKeyStat = (item: { type: EquipmentSlot; stats: Record<string, number | string | undefined> }) => {
    if (item.type === "mainHand" || item.type === "offHand") {
      if (item.stats.damage) return `${item.stats.damage} dmg`;
    }
    if (item.stats.ac) return `+${item.stats.ac} AC`;
    const first = Object.entries(item.stats).find(([, v]) => v !== undefined);
    if (first) return formatStatValue(first[0], first[1] as number);
    return null;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-3xl max-h-[85vh] rounded-2xl bg-[var(--background-secondary)] border border-[var(--border)] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-[var(--accent-gold)]" />
            <h2 className="text-lg font-bold">Inventory</h2>
            <span className="text-sm text-[var(--foreground-muted)]">({inventory?.length ?? 0} items)</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--background-tertiary)] transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Filter tabs + search */}
        <div className="p-4 pb-2 space-y-3">
          <div className="flex gap-1">
            {(["all", "weapons", "armor", "accessories", "books"] as FilterTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${
                  filter === tab
                    ? "bg-[var(--accent-gold)] text-black"
                    : "bg-[var(--background-tertiary)] text-[var(--foreground-secondary)] hover:text-[var(--foreground)]"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--foreground-muted)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search items..."
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-[var(--background-tertiary)] border border-[var(--border)] text-sm placeholder:text-[var(--foreground-muted)] focus:outline-none focus:border-[var(--accent-gold)]"
            />
          </div>
        </div>

        {/* Item grid */}
        <div className="flex-1 overflow-y-auto p-4 pt-2">
          {filteredItems.length === 0 ? (
            <div className="text-center py-12 text-[var(--foreground-muted)]">No items found</div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {filteredItems.map((item, i) => {
                const Icon = SLOT_ICONS[item.type] || Scroll;
                const rarityColor = getRarityColor(item.rarity);
                const borderColor = RARITY_BORDER_COLORS[item.rarity];
                const bgColor = RARITY_BG_COLORS[item.rarity];
                const isEquipped = equippedIds.has(item.id);
                const keyStat = getKeyStat(item);

                return (
                  <button
                    key={`${item.id}-${i}`}
                    onClick={() => isEquipped ? handleUnequip(item.id) : handleEquip(item.id)}
                    className="relative rounded-xl p-3 flex flex-col items-center gap-2 transition-all hover:brightness-125 cursor-pointer text-left border"
                    style={{ borderColor, backgroundColor: "rgba(0,0,0,0.3)" }}
                  >
                    {isEquipped && (
                      <span className="absolute top-1.5 right-1.5 text-[8px] px-1.5 py-0.5 rounded bg-[var(--accent-gold)] text-black font-bold">
                        EQ
                      </span>
                    )}
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ background: `linear-gradient(135deg, ${bgColor}, transparent)` }}
                    >
                      <div style={{ color: rarityColor }}><Icon className="h-5 w-5" /></div>
                    </div>
                    <span className="text-xs text-center truncate w-full font-medium" style={{ color: rarityColor }}>
                      {item.name}
                    </span>
                    {keyStat && (
                      <span className="text-[10px] text-[var(--foreground-muted)]">{keyStat}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
