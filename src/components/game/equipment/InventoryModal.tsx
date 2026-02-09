"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import {
  X, Search, Package, Crown, Shirt, Hand, Footprints,
  Shield, CircleDot, Gem, Sword, BookOpen, Scroll, Lock, ShoppingBag, Map,
} from "lucide-react";
import {
  getRarityColor, RARITY_BORDER_COLORS, RARITY_BG_COLORS,
  getSlotLabel, formatStatName, formatStatValue,
} from "@/lib/equipment";
import type { EquipmentSlot } from "../../../../convex/data/equipmentItems";

const SLOT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  head: Crown, chest: Shirt, hands: Hand, boots: Footprints,
  cloak: Shield, ring: CircleDot, necklace: Gem,
  mainHand: Sword, offHand: Shield, book: BookOpen,
};

type FilterTab = "all" | "weapons" | "armor" | "accessories" | "books" | "quest";

const FILTER_SLOTS: Record<FilterTab, EquipmentSlot[] | null | "quest"> = {
  all: null,
  weapons: ["mainHand", "offHand"],
  armor: ["head", "chest", "hands", "boots", "cloak"],
  accessories: ["ring", "necklace"],
  books: ["book"],
  quest: "quest", // Special value for story items
};

interface InventoryModalProps {
  characterId: Id<"characters">;
  onClose: () => void;
}

export function InventoryModal({ characterId, onClose }: InventoryModalProps) {
  const inventory = useQuery(api.equipment.getInventory, { characterId });
  const equipment = useQuery(api.equipment.getEquipment, { characterId });
  const storyItems = useQuery(api.characters.getStoryItems, { characterId });
  const equipItem = useMutation(api.equipment.equipItem);
  const unequipItem = useMutation(api.equipment.unequipItem);
  const listItemMut = useMutation(api.game.trade.listItem);

  const [filter, setFilter] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");
  const [tradingItemId, setTradingItemId] = useState<string | null>(null);
  const [tradeAskingPrice, setTradeAskingPrice] = useState("");
  const [isListing, setIsListing] = useState(false);

  // Build set of equipped item _ids
  const equippedIds = new Set<string>();
  if (equipment) {
    const eq = equipment as Record<string, { _id?: string } | null>;
    for (const val of Object.values(eq)) {
      if (val && typeof val === "object" && "_id" in val && val._id) {
        equippedIds.add(val._id);
      }
    }
  }

  // Filter equipment items (skip if viewing quest tab)
  const filteredItems = filter === "quest" ? [] : (inventory ?? []).filter((item: any) => {
    if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false;
    const slots = FILTER_SLOTS[filter];
    if (slots && slots !== "quest" && !slots.includes(item.type)) return false;
    return true;
  });

  // Filter story/quest items
  const filteredStoryItems = (storyItems ?? []).filter((item) => {
    if (filter !== "all" && filter !== "quest") return false;
    if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleEquip = (itemId: string) => {
    equipItem({ characterId, itemId: itemId as any });
  };

  const handleUnequip = (itemId: string) => {
    if (!equipment) return;
    const eq = equipment as Record<string, { _id?: string } | null>;
    for (const [slot, val] of Object.entries(eq)) {
      if (val && typeof val === "object" && "_id" in val && val._id === itemId) {
        unequipItem({ characterId, slot: slot as never });
        return;
      }
    }
  };

  const handleListForTrade = async (itemId: string) => {
    setIsListing(true);
    try {
      await listItemMut({
        characterId,
        itemId: itemId as Id<"items">,
        askingPrice: tradeAskingPrice || undefined,
      });
      setTradingItemId(null);
      setTradeAskingPrice("");
    } catch (e: unknown) {
      console.error("List failed:", e);
    } finally {
      setIsListing(false);
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
            <span className="text-sm text-[var(--foreground-muted)]">
              ({(inventory?.length ?? 0) + (storyItems?.length ?? 0)} items)
            </span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--background-tertiary)] transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Filter tabs + search */}
        <div className="p-4 pb-2 space-y-3">
          <div className="flex gap-1">
            {(["all", "weapons", "armor", "accessories", "books", "quest"] as FilterTab[]).map((tab) => (
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
              {filteredItems.map((item: any, i: number) => {
                const Icon = SLOT_ICONS[item.type] || Scroll;
                const rarityColor = getRarityColor(item.rarity as never);
                const borderColor = RARITY_BORDER_COLORS[item.rarity as keyof typeof RARITY_BORDER_COLORS];
                const bgColor = RARITY_BG_COLORS[item.rarity as keyof typeof RARITY_BG_COLORS];
                const isEquipped = equippedIds.has(item._id);
                const isBound = item.boundTo !== undefined;
                const keyStat = getKeyStat(item);
                const isTrading = tradingItemId === item._id;

                return (
                  <div key={`${item._id}-${i}`} className="relative">
                    <button
                      onClick={() => isEquipped ? handleUnequip(item._id) : handleEquip(item._id)}
                      className="relative w-full rounded-xl p-3 flex flex-col items-center gap-2 transition-all hover:brightness-125 cursor-pointer text-left border"
                      style={{ borderColor, backgroundColor: "rgba(0,0,0,0.3)" }}
                    >
                      {isEquipped && (
                        <span className="absolute top-1.5 right-1.5 text-[8px] px-1.5 py-0.5 rounded bg-[var(--accent-gold)] text-black font-bold">
                          EQ
                        </span>
                      )}
                      {isBound && (
                        <span className="absolute bottom-1.5 left-1.5 text-[7px] px-1 py-0.5 rounded bg-purple-600 text-white font-bold flex items-center gap-0.5">
                          <Lock className="h-2 w-2" /> Bound
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
                    {/* Trade button — hidden for equipped or bound items */}
                    {!isEquipped && !isBound && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setTradingItemId(isTrading ? null : item._id);
                          setTradeAskingPrice("");
                        }}
                        className="absolute bottom-1.5 right-1.5 text-[7px] px-1.5 py-0.5 rounded bg-[var(--background-tertiary)] text-[var(--foreground-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--accent-gold)] hover:text-black transition-colors font-medium flex items-center gap-0.5"
                      >
                        <ShoppingBag className="h-2 w-2" /> Trade
                      </button>
                    )}
                    {/* Inline listing form */}
                    {isTrading && (
                      <div className="mt-1 p-2 rounded-lg bg-[var(--background-tertiary)] border border-[var(--border)]">
                        <input
                          type="text"
                          value={tradeAskingPrice}
                          onChange={(e) => setTradeAskingPrice(e.target.value)}
                          placeholder="Asking price (optional)"
                          className="w-full px-2 py-1 rounded bg-[var(--background-secondary)] border border-[var(--border)] text-[10px] placeholder:text-[var(--foreground-muted)] focus:outline-none focus:border-[var(--accent-gold)] mb-1"
                        />
                        <button
                          onClick={() => handleListForTrade(item._id)}
                          disabled={isListing}
                          className="w-full py-1 rounded text-[10px] font-medium bg-[var(--accent-gold)] text-black hover:brightness-110 disabled:opacity-40"
                        >
                          {isListing ? "..." : "List for Trade"}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
