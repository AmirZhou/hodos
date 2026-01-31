"use client";

import { useState } from "react";
import { getRarityColor, RARITY_BORDER_COLORS, getSlotLabel } from "@/lib/equipment";
import { ItemTooltip } from "./ItemTooltip";


interface ItemData {
  _id: string;
  name: string;
  description: string;
  type: string;
  rarity: string;
  stats: Record<string, number | string | undefined>;
  specialAttributes?: Record<string, number | undefined>;
  passive?: string;
  bindingRule?: string;
  boundTo?: string;
}

interface InventoryGridProps {
  items: ItemData[];
  onEquip: (itemId: string) => void;
}

export function InventoryGrid({ items, onEquip }: InventoryGridProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (items.length === 0) {
    return (
      <div className="text-center py-6 text-xs text-[var(--foreground-muted)]">
        Inventory is empty
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-1.5">
      {items.map((item, index) => {
        const borderColor = RARITY_BORDER_COLORS[item.rarity as keyof typeof RARITY_BORDER_COLORS];
        const nameColor = getRarityColor(item.rarity as never);

        return (
          <div
            key={`${item._id}-${index}`}
            className="relative"
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <button
              onClick={() => onEquip(item._id)}
              className="w-full aspect-square rounded border flex flex-col items-center justify-center p-1 transition-all hover:brightness-125 cursor-pointer"
              style={{
                borderColor,
                backgroundColor: "rgba(0,0,0,0.3)",
              }}
              title={`${item.name} (${getSlotLabel(item.type as never)}) - Click to equip`}
            >
              <span
                className="text-[8px] leading-tight text-center truncate w-full"
                style={{ color: nameColor }}
              >
                {item.name}
              </span>
            </button>
            {hoveredIndex === index && (
              <div className="absolute left-full ml-2 top-0 z-50">
                <ItemTooltip item={item} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
