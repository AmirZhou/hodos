"use client";

import { getRarityColor, getRarityLabel, getSlotLabel, formatStatName, formatStatValue, RARITY_BG_COLORS, RARITY_BORDER_COLORS } from "@/lib/equipment";
import type { EquipmentSlot, Rarity } from "../../../../convex/data/equipmentItems";

interface ItemData {
  id: string;
  name: string;
  description: string;
  type: EquipmentSlot;
  rarity: Rarity;
  stats: Record<string, number | string | undefined>;
  specialAttributes?: Record<string, number | undefined>;
  passive?: string;
}

export function ItemTooltip({ item }: { item: ItemData }) {
  const rarityColor = getRarityColor(item.rarity);
  const bgColor = RARITY_BG_COLORS[item.rarity];
  const borderColor = RARITY_BORDER_COLORS[item.rarity];

  const statEntries = Object.entries(item.stats).filter(
    ([, v]) => v !== undefined && v !== 0
  );
  const specialEntries = item.specialAttributes
    ? Object.entries(item.specialAttributes).filter(
        ([, v]) => v !== undefined && v !== 0
      )
    : [];

  return (
    <div
      className="absolute z-50 w-64 rounded-lg border p-3 shadow-xl text-sm pointer-events-none"
      style={{
        backgroundColor: "var(--card)",
        borderColor,
        boxShadow: `0 0 12px ${bgColor}`,
      }}
    >
      {/* Name */}
      <div className="font-bold mb-1" style={{ color: rarityColor }}>
        {item.name}
      </div>

      {/* French name */}
      <div className="text-xs italic mb-2" style={{ color: "var(--foreground-muted)" }}>
        {item.nameFr}
      </div>

      {/* Slot & Rarity */}
      <div className="flex justify-between text-xs mb-2" style={{ color: "var(--foreground-secondary)" }}>
        <span>{getSlotLabel(item.type)}</span>
        <span style={{ color: rarityColor }}>{getRarityLabel(item.rarity)}</span>
      </div>

      {/* Divider */}
      {statEntries.length > 0 && (
        <>
          <div className="border-t mb-2" style={{ borderColor: "var(--border)" }} />
          <div className="space-y-0.5 mb-2">
            {statEntries.map(([key, value]) => (
              <div key={key} className="flex justify-between text-xs">
                <span style={{ color: "var(--foreground-secondary)" }}>
                  {formatStatName(key)}
                </span>
                <span className="text-green-400">
                  {formatStatValue(key, value!)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Special Attributes */}
      {specialEntries.length > 0 && (
        <>
          <div className="border-t mb-2" style={{ borderColor: "var(--border)" }} />
          <div className="space-y-0.5 mb-2">
            {specialEntries.map(([key, value]) => (
              <div key={key} className="flex justify-between text-xs">
                <span style={{ color: "#a78bfa" }}>
                  {formatStatName(key)}
                </span>
                <span style={{ color: "#c084fc" }}>
                  {formatStatValue(key, value!)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Passive */}
      {item.passive && (
        <>
          <div className="border-t mb-2" style={{ borderColor: "var(--border)" }} />
          <div className="text-xs" style={{ color: "#ff8000" }}>
            <span className="font-semibold">Passive: </span>
            {item.passive}
          </div>
        </>
      )}

      {/* Description */}
      {item.description && !item.passive && (
        <>
          <div className="border-t mb-2" style={{ borderColor: "var(--border)" }} />
          <div className="text-xs italic" style={{ color: "var(--foreground-muted)" }}>
            {item.description}
          </div>
        </>
      )}
    </div>
  );
}
