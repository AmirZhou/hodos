"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useGame } from "@/components/game/engine";
import { CharacterPanel } from "./CharacterPanel";
import { EquipmentSlotPopover, SIDEBAR_SLOT_ICONS, type EquipSlotItem } from "./EquipmentSlotPopover";
import {
  Heart,
  ChevronDown,
  ChevronUp,
  Package,
  ShoppingBag,
  Scroll,
} from "lucide-react";
import {
  getRarityColor, RARITY_BORDER_COLORS, RARITY_BG_COLORS,
  getSlotLabel, formatStatValue,
} from "@/lib/equipment";

export function GameSidebar({
  campaignId,
  sessionId,
  onNpcClick,
  onOpenCharSheet,
  onOpenInventory,
  onOpenTradeBoard,
}: {
  campaignId: Id<"campaigns">;
  sessionId?: Id<"gameSessions">;
  onNpcClick?: (npcId: Id<"npcs">) => void;
  onOpenCharSheet?: () => void;
  onOpenInventory?: () => void;
  onOpenTradeBoard?: () => void;
}) {
  const { currentCharacter, gameState } = useGame();

  // Query current location to get NPCs that are already displayed in "Characters here:"
  const currentLocation = useQuery(
    api.game.travel.getCurrentLocation,
    sessionId ? { sessionId } : "skip"
  );
  const npcIdsAtLocation = new Set(currentLocation?.npcs?.map(n => n.id) ?? []);
  const [equipExpanded, setEquipExpanded] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const relationships = useQuery(
    api.relationships.getForCharacter,
    currentCharacter?._id ? { characterId: currentCharacter._id } : "skip"
  );

  const equipment = useQuery(
    api.equipment.getEquipment,
    currentCharacter?._id ? { characterId: currentCharacter._id } : "skip"
  );

  const character = currentCharacter;

  // Build equipped items list
  const equippedSlots: { slot: string; item: EquipSlotItem | null }[] = [];
  if (equipment) {
    const eq = equipment as Record<string, { name?: string; rarity?: string; type?: string; stats?: Record<string, unknown> } | null>;
    const slotOrder = ["head", "chest", "hands", "boots", "cloak", "mainHand", "offHand", "ring1", "ring2", "necklace", "book"];
    for (const slot of slotOrder) {
      const val = eq[slot];
      equippedSlots.push({
        slot,
        item: val && val.name ? { name: val.name, rarity: val.rarity ?? "common", type: val.type ?? slot, stats: (val.stats ?? {}) as Record<string, unknown> } : null,
      });
    }
  }

  return (
    <div className="p-4 space-y-4 h-full">
      {/* Character Card */}
      {character && (
        <CharacterPanel
          character={character}
          onOpenCharSheet={onOpenCharSheet}
        />
      )}

      {/* Equipment Section */}
      {character && equipment && (
        <div className="rounded-xl bg-[var(--card)] overflow-hidden">
          <button
            onClick={() => setEquipExpanded(!equipExpanded)}
            className="w-full flex items-center justify-between p-3 hover:bg-[var(--background-tertiary)] transition-colors"
          >
            <span className="text-sm font-medium">Equipment</span>
            {equipExpanded ? <ChevronUp className="h-4 w-4 text-[var(--foreground-muted)]" /> : <ChevronDown className="h-4 w-4 text-[var(--foreground-muted)]" />}
          </button>
          {equipExpanded && (
            <div className="px-3 pb-3">
              <div className="grid grid-cols-3 gap-2">
                {equippedSlots.map(({ slot, item }) => {
                  const Icon = SIDEBAR_SLOT_ICONS[slot] || Scroll;
                  if (!item) {
                    return (
                      <button
                        key={slot}
                        onClick={() => setSelectedSlot(slot)}
                        className="rounded-lg border border-[var(--border)] bg-[var(--background-tertiary)] p-2 flex flex-col items-center gap-1 opacity-40 hover:opacity-70 transition-opacity cursor-pointer"
                      >
                        <Icon className="h-5 w-5 text-[var(--foreground-muted)]" />
                        <span className="text-[9px] text-[var(--foreground-muted)] truncate w-full text-center">{getSlotLabel(slot as never)}</span>
                      </button>
                    );
                  }
                  const rarityColor = getRarityColor(item.rarity as never);
                  const borderColor = RARITY_BORDER_COLORS[item.rarity as keyof typeof RARITY_BORDER_COLORS];
                  const bgColor = RARITY_BG_COLORS[item.rarity as keyof typeof RARITY_BG_COLORS];
                  const keyStat = (() => {
                    const s = item.stats;
                    if ((item.type === "mainHand" || item.type === "offHand") && s.damage) return `${s.damage} dmg`;
                    if (s.ac) return `+${s.ac} AC`;
                    const first = Object.entries(s).find(([, v]) => v !== undefined);
                    if (first) return formatStatValue(first[0], first[1] as number);
                    return null;
                  })();
                  return (
                    <button
                      key={slot}
                      onClick={() => setSelectedSlot(slot)}
                      className="rounded-lg border p-2 flex flex-col items-center gap-1 transition-all hover:brightness-110 cursor-pointer text-left"
                      style={{ borderColor, backgroundColor: "rgba(0,0,0,0.3)" }}
                    >
                      <div
                        className="w-8 h-8 rounded flex items-center justify-center"
                        style={{ background: `linear-gradient(135deg, ${bgColor}, transparent)` }}
                      >
                        <div style={{ color: rarityColor }}><Icon className="h-4 w-4" /></div>
                      </div>
                      <span className="text-[9px] truncate w-full text-center font-medium" style={{ color: rarityColor }}>{item.name}</span>
                      {keyStat && <span className="text-[8px] text-[var(--foreground-muted)]">{keyStat}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <button
            onClick={onOpenInventory}
            className="w-full py-2.5 border-t border-[var(--border)] flex items-center justify-center gap-2 text-sm hover:bg-[var(--background-tertiary)] transition-colors text-[var(--foreground-secondary)]"
          >
            <Package className="h-4 w-4" /> View Full Inventory
          </button>
          <button
            onClick={onOpenTradeBoard}
            className="w-full py-2.5 border-t border-[var(--border)] flex items-center justify-center gap-2 text-sm hover:bg-[var(--background-tertiary)] transition-colors text-[var(--foreground-secondary)]"
          >
            <ShoppingBag className="h-4 w-4" /> Trade Board
          </button>
        </div>
      )}

      {/* Equipment Slot Popover */}
      {selectedSlot && character && (
        <EquipmentSlotPopover
          slot={selectedSlot}
          item={equippedSlots.find(s => s.slot === selectedSlot)?.item ?? null}
          characterId={character._id as Id<"characters">}
          onClose={() => setSelectedSlot(null)}
        />
      )}

      {/* Relationships */}
      {relationships && relationships.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Heart className="h-4 w-4 text-[var(--foreground-muted)]" />
            <span className="text-sm font-medium">Relationships</span>
          </div>
          <div className="rounded-xl bg-[var(--card)] p-3 space-y-3">
            {relationships.map((rel) => (
              <RelationshipEntry
                key={rel._id}
                name={rel.npc?.name ?? "Unknown"}
                affinity={rel.affinity}
                trust={rel.trust}
                attraction={rel.attraction}
                onClick={onNpcClick ? () => onNpcClick(rel.npcId) : undefined}
              />
            ))}
          </div>
        </div>
      )}

      {/* Game Mode Indicator */}
      <div className="rounded-xl bg-[var(--background-tertiary)] p-3 text-center">
        <span className="text-xs text-[var(--foreground-muted)]">Mode: </span>
        <span className="text-xs font-medium capitalize">{gameState.currentMode}</span>
      </div>
    </div>
  );
}

function RelationshipEntry({
  name,
  affinity,
  trust,
  attraction,
  onClick,
}: {
  name: string;
  affinity: number;
  trust: number;
  attraction: number;
  onClick?: () => void;
}) {
  return (
    <div className={onClick ? "cursor-pointer hover:bg-[var(--background-tertiary)] rounded-lg p-1 -m-1 transition-colors" : ""} onClick={onClick}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">{name}</span>
      </div>
      <div className="space-y-1 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-16 text-[var(--foreground-secondary)]">Affinity</span>
          <div className="flex-1 h-1.5 rounded-full bg-[var(--background-tertiary)]">
            <div
              className="h-full rounded-full bg-[var(--accent-gold)]"
              style={{ width: `${Math.max(0, 50 + affinity / 2)}%` }}
            />
          </div>
          <span className="w-8 text-right">{affinity}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-16 text-[var(--foreground-secondary)]">Trust</span>
          <div className="flex-1 h-1.5 rounded-full bg-[var(--background-tertiary)]">
            <div
              className="h-full rounded-full bg-[var(--accent-blue)]"
              style={{ width: `${trust}%` }}
            />
          </div>
          <span className="w-8 text-right">{trust}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-16 text-[var(--foreground-secondary)]">Attraction</span>
          <div className="flex-1 h-1.5 rounded-full bg-[var(--background-tertiary)]">
            <div
              className="h-full rounded-full bg-[var(--accent-red)]"
              style={{ width: `${attraction}%` }}
            />
          </div>
          <span className="w-8 text-right">{attraction}</span>
        </div>
      </div>
    </div>
  );
}
