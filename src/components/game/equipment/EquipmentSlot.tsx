"use client";

import { useState } from "react";
import { getRarityColor, RARITY_BORDER_COLORS, getSlotLabel } from "@/lib/equipment";
import { ItemTooltip } from "./ItemTooltip";
import type { EquipmentSlot as SlotType, EquipedSlot, Rarity } from "../../../../convex/data/equipmentItems";
import {
  Crown, Shield, Hand, Footprints, Scroll, CircleDot,
  Gem, Sword, BookOpen, Shirt,
} from "lucide-react";

const SLOT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  head: Crown,
  chest: Shirt,
  hands: Hand,
  boots: Footprints,
  cloak: Shield,
  ring1: CircleDot,
  ring2: CircleDot,
  ring: CircleDot,
  necklace: Gem,
  mainHand: Sword,
  offHand: Shield,
  book: BookOpen,
};

interface ItemData {
  id: string;
  name: string;
  nameFr: string;
  description: string;
  type: SlotType;
  rarity: Rarity;
  stats: Record<string, number | string | undefined>;
  specialAttributes?: Record<string, number | undefined>;
  passive?: string;
}

interface EquipmentSlotProps {
  slot: EquipedSlot;
  item?: ItemData | null;
  onClick?: () => void;
  size?: "sm" | "md";
}

export function EquipmentSlotComponent({ slot, item, onClick, size = "md" }: EquipmentSlotProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const Icon = SLOT_ICONS[slot] || Scroll;
  const sizeClass = size === "sm" ? "w-12 h-12" : "w-16 h-16";
  const iconSize = size === "sm" ? "h-4 w-4" : "h-5 w-5";

  const borderColor = item
    ? RARITY_BORDER_COLORS[item.rarity]
    : "rgba(255,255,255,0.1)";
  const nameColor = item ? getRarityColor(item.rarity) : undefined;

  return (
    <div
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <button
        onClick={onClick}
        className={`${sizeClass} rounded-lg border-2 flex flex-col items-center justify-center gap-1 transition-all hover:brightness-125 cursor-pointer`}
        style={{
          borderColor,
          backgroundColor: item
            ? `rgba(0,0,0,0.4)`
            : "rgba(255,255,255,0.03)",
        }}
        title={item ? item.name : getSlotLabel(slot)}
      >
        <div style={{ color: item ? nameColor : "var(--foreground-muted)" }}>
          <Icon className={iconSize} />
        </div>
        {size === "md" && (
          <span
            className="text-[9px] leading-tight text-center px-0.5 truncate w-full"
            style={{ color: item ? nameColor : "var(--foreground-muted)" }}
          >
            {item ? item.name : getSlotLabel(slot)}
          </span>
        )}
      </button>
      {showTooltip && item && (
        <div className="absolute left-full ml-2 top-0">
          <ItemTooltip item={item} />
        </div>
      )}
    </div>
  );
}
