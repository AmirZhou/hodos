"use client";

import { getRarityColor, getRarityLabel, getSlotLabel, formatStatName, formatStatValue, RARITY_BG_COLORS, RARITY_BORDER_COLORS } from "@/lib/equipment";
import type { EquipmentSlot, Rarity } from "../../../../convex/data/equipmentItems";

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
      <div className="font-bold mb-2" style={{ color: rarityColor }}>
        {item.name}
      </div>

      {/* Slot & Rarity */}
      <div className="flex justify-between text-xs mb-2" style={{ color: "var(--foreground-secondary)" }}>
        <span>{getSlotLabel(item.type as EquipmentSlot)}</span>
        <span style={{ color: rarityColor }}>{getRarityLabel(item.rarity as Rarity)}</span>
      </div>

      {/* Binding Status */}
      {item.boundTo ? (
        <div className="text-[10px] mb-2 px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 inline-block font-medium">
          Soulbound
        </div>
      ) : item.bindingRule === "boe" ? (
        <div className="text-[10px] mb-2 px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-400 inline-block font-medium">
          Bind on Equip
        </div>
      ) : null}

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
