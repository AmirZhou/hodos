"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import {
  Shield,
  BookOpen,
  Crown,
  Shirt,
  Hand,
  Footprints,
  CircleDot,
  Gem,
  Sword,
  Scroll,
} from "lucide-react";
import {
  getRarityColor,
  getSlotLabel,
  formatStatValue,
} from "@/lib/equipment";

export const SIDEBAR_SLOT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  head: Crown, chest: Shirt, hands: Hand, boots: Footprints,
  cloak: Shield, ring1: CircleDot, ring2: CircleDot, ring: CircleDot,
  necklace: Gem, mainHand: Sword, offHand: Shield, book: BookOpen,
};

export const SLOT_ITEM_TYPES: Record<string, string[]> = {
  head: ["head"], chest: ["chest"], hands: ["hands"], boots: ["boots"],
  cloak: ["cloak"], mainHand: ["mainHand"], offHand: ["offHand"],
  ring1: ["ring"], ring2: ["ring"], necklace: ["necklace"], book: ["book"],
};

export type EquipSlotItem = {
  name: string;
  rarity: string;
  type: string;
  stats: Record<string, unknown>;
  _id?: string;
  description?: string;
};

export function EquipmentSlotPopover({
  slot,
  item,
  characterId,
  onClose,
}: {
  slot: string;
  item: EquipSlotItem | null;
  characterId: Id<"characters">;
  onClose: () => void;
}) {
  const inventory = useQuery(api.equipment.getInventory, { characterId });
  const equipItem = useMutation(api.equipment.equipItem);
  const unequipItem = useMutation(api.equipment.unequipItem);

  const compatibleItems = (inventory ?? []).filter((inv: any) => {
    const types = SLOT_ITEM_TYPES[slot] || [];
    return types.includes(inv.type);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative z-10 w-72 rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
          <span className="text-sm font-medium">{getSlotLabel(slot as never)}</span>
          <button onClick={onClose} className="text-[var(--foreground-muted)] hover:text-[var(--foreground)] text-lg leading-none">&times;</button>
        </div>

        {/* Current item details */}
        {item ? (
          <div className="px-4 py-3 border-b border-[var(--border)]">
            <div className="flex items-center gap-2 mb-1">
              {(() => { const Icon = SIDEBAR_SLOT_ICONS[slot] || Scroll; return <div style={{ color: getRarityColor(item.rarity as never) }}><Icon className="h-5 w-5" /></div>; })()}
              <span className="font-medium text-sm" style={{ color: getRarityColor(item.rarity as never) }}>{item.name}</span>
            </div>
            <p className="text-[10px] text-[var(--foreground-muted)] capitalize mb-2">{item.rarity}</p>
            {/* Stats */}
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-[var(--foreground-secondary)]">
              {Object.entries(item.stats).filter(([,v]) => v !== undefined && v !== null).map(([k, v]) => (
                <span key={k}>{formatStatValue(k, v as number)}</span>
              ))}
            </div>
            <button
              onClick={async () => { await unequipItem({ characterId, slot }); onClose(); }}
              className="mt-3 w-full py-1.5 rounded-lg text-xs font-medium bg-[var(--accent-red)]/20 text-[var(--accent-red)] hover:bg-[var(--accent-red)]/30 transition-colors"
            >
              Unequip
            </button>
          </div>
        ) : (
          <div className="px-4 py-3 border-b border-[var(--border)]">
            <p className="text-xs text-[var(--foreground-muted)] italic">Empty slot</p>
          </div>
        )}

        {/* Equippable items from inventory */}
        {compatibleItems.length > 0 && (
          <div className="px-4 py-2">
            <p className="text-[10px] text-[var(--foreground-muted)] mb-2 uppercase tracking-wide">Equip from inventory</p>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {compatibleItems.map((inv: any) => {
                const rc = getRarityColor(inv.rarity);
                return (
                  <button
                    key={inv._id}
                    onClick={async () => { await equipItem({ characterId, itemId: inv._id, targetSlot: slot }); onClose(); }}
                    className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-[var(--background-tertiary)] transition-colors text-left"
                  >
                    {(() => { const I = SIDEBAR_SLOT_ICONS[inv.type] || Scroll; return <div className="shrink-0" style={{ color: rc }}><I className="h-4 w-4" /></div>; })()}
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-medium block truncate" style={{ color: rc }}>{inv.name}</span>
                      <span className="text-[10px] text-[var(--foreground-muted)] capitalize">{inv.rarity}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {compatibleItems.length === 0 && !item && (
          <div className="px-4 py-3">
            <p className="text-xs text-[var(--foreground-muted)]">No items available for this slot</p>
          </div>
        )}
      </div>
    </div>
  );
}
