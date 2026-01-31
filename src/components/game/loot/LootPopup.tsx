"use client";

import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { X, Lock } from "lucide-react";
import { RARITY_COLORS, RARITY_BORDER_COLORS } from "@/lib/equipment";
import type { Rarity } from "../../../../convex/data/equipmentItems";

interface LootItem {
  _id: string;
  name: string;
  description: string;
  type: string;
  rarity: string;
  stats: Record<string, unknown>;
  passive?: string;
  bindingRule?: string;
  boundTo?: string;
}

interface LootPopupProps {
  containerId: Id<"lootContainers">;
  containerName: string;
  containerDescription?: string;
  items: LootItem[];
  isLooted: boolean;
  isLocked: boolean;
  characterId: Id<"characters">;
  onClose: () => void;
}

export function LootPopup({
  containerId,
  containerName,
  containerDescription,
  items,
  isLooted,
  isLocked,
  characterId,
  onClose,
}: LootPopupProps) {
  const takeItem = useMutation(api.game.loot.takeItem);
  const takeAllItems = useMutation(api.game.loot.takeAllItems);

  const handleTake = async (itemIndex: number) => {
    await takeItem({ containerId, characterId, itemIndex });
  };

  const handleTakeAll = async () => {
    await takeAllItems({ containerId, characterId });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-md bg-[var(--background)] border border-[var(--border)] rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)] bg-[var(--background-secondary)]">
          <div className="min-w-0 flex-1">
            <h2 className="font-bold text-lg truncate">{containerName}</h2>
            {containerDescription && (
              <p className="text-xs text-[var(--foreground-secondary)] truncate">
                {containerDescription}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="ml-2 p-1 rounded hover:bg-[var(--background-tertiary)] transition-colors shrink-0"
          >
            <X className="h-5 w-5 text-[var(--foreground-muted)]" />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto">
          {isLocked ? (
            <div className="p-6 text-center">
              <Lock className="h-8 w-8 mx-auto mb-2 text-[var(--accent-red)]" />
              <p className="text-sm text-[var(--foreground-secondary)]">
                This container is locked.
              </p>
            </div>
          ) : isLooted || items.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-sm text-[var(--foreground-muted)]">
                This container has been looted.
              </p>
            </div>
          ) : (
            <div className="p-2">
              {items.map((item, idx) => {
                const rarityColor = RARITY_COLORS[item.rarity as Rarity] ?? "#fff";
                const borderColor = RARITY_BORDER_COLORS[item.rarity as Rarity] ?? "rgba(255,255,255,0.2)";

                // Build a short stat summary
                const statEntries = Object.entries(item.stats).filter(
                  ([, v]) => v !== undefined && v !== null
                );
                const statSummary = statEntries
                  .slice(0, 3)
                  .map(([k, v]) => {
                    if (typeof v === "string") return v;
                    return `+${v} ${k}`;
                  })
                  .join(", ");

                return (
                  <div
                    key={`${item.id}-${idx}`}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-[var(--background-tertiary)] transition-colors"
                    style={{ borderLeft: `3px solid ${borderColor}` }}
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: rarityColor }}
                    />
                    <div className="flex-1 min-w-0">
                      <span
                        className="text-sm font-medium block truncate"
                        style={{ color: rarityColor }}
                      >
                        {item.name}
                      </span>
                      <span className="text-xs text-[var(--foreground-muted)] capitalize">
                        {item.rarity}
                      </span>
                      {statSummary && (
                        <span className="text-xs text-[var(--foreground-secondary)] ml-2">
                          {statSummary}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleTake(idx)}
                      className="text-xs px-3 py-1 rounded-lg bg-[var(--accent-gold)]/20 text-[var(--accent-gold)] hover:bg-[var(--accent-gold)]/30 transition-colors font-medium shrink-0"
                    >
                      Take
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer — Take All */}
        {!isLocked && !isLooted && items.length > 0 && (
          <div className="p-3 border-t border-[var(--border)]">
            <button
              onClick={handleTakeAll}
              className="w-full py-2 rounded-lg text-sm font-medium bg-[var(--accent-gold)]/10 text-[var(--accent-gold)] hover:bg-[var(--accent-gold)]/20 transition-colors"
            >
              Take All
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
