"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { Package, Skull, Box, Lock, Check } from "lucide-react";
import { RARITY_COLORS, RARITY_BORDER_COLORS } from "@/lib/equipment";
import type { Rarity } from "../../../../convex/data/equipmentItems";
import { LootPopup } from "../loot/LootPopup";

/**
 * Location-type gradients based on location properties.type
 * Used as placeholder until real images are available.
 */
const LOCATION_GRADIENTS: Record<string, string> = {
  plaza: "from-amber-900/80 via-amber-800/60 to-stone-900/90",
  temple: "from-indigo-900/80 via-purple-800/60 to-slate-900/90",
  garden: "from-emerald-900/80 via-green-800/60 to-stone-900/90",
  residential: "from-stone-800/80 via-slate-700/60 to-zinc-900/90",
  market: "from-orange-900/80 via-amber-700/60 to-stone-900/90",
  guild: "from-yellow-900/80 via-amber-800/60 to-stone-900/90",
  arena: "from-red-900/80 via-rose-800/60 to-stone-900/90",
  academic: "from-blue-900/80 via-indigo-800/60 to-slate-900/90",
  library: "from-amber-950/80 via-yellow-900/60 to-stone-900/90",
  tower: "from-slate-900/80 via-gray-800/60 to-zinc-950/90",
  gate: "from-stone-900/80 via-gray-700/60 to-zinc-900/90",
  warehouse: "from-stone-800/80 via-zinc-700/60 to-gray-900/90",
  underground: "from-gray-950/80 via-stone-900/60 to-zinc-950/90",
  dungeon: "from-gray-950/80 via-stone-900/60 to-zinc-950/90",
  outdoor: "from-green-900/80 via-emerald-800/60 to-stone-900/90",
  commercial: "from-teal-900/80 via-cyan-800/60 to-slate-900/90",
};

const DEFAULT_GRADIENT = "from-stone-900/80 via-gray-800/60 to-zinc-900/90";

const CONTAINER_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  chest: Package,
  corpse: Skull,
  container: Box,
};

interface LocationViewProps {
  currentLocation: {
    name: string;
    description: string;
    properties?: Record<string, any>;
    npcs?: Array<{ id: string; name: string; portrait?: string }>;
  } | null | undefined;
  sessionId?: Id<"gameSessions">;
  characterId?: Id<"characters">;
}

export function LocationView({ currentLocation, sessionId, characterId }: LocationViewProps) {
  const [openContainerId, setOpenContainerId] = useState<Id<"lootContainers"> | null>(null);

  const containers = useQuery(
    api.game.loot.getContainersAtLocation,
    sessionId ? { sessionId } : "skip"
  );

  const takeItem = useMutation(api.game.loot.takeItem);
  const takeAllItems = useMutation(api.game.loot.takeAllItems);
  const openContainer = useMutation(api.game.loot.openContainer);

  if (!currentLocation) {
    return (
      <div className="p-4">
        <p className="text-[var(--foreground-muted)]">No location set.</p>
      </div>
    );
  }

  const locationType = currentLocation.properties?.type as string | undefined;
  const imageUrl = currentLocation.properties?.image as string | undefined;
  const gradient = LOCATION_GRADIENTS[locationType ?? ""] ?? DEFAULT_GRADIENT;

  // Split containers into ground items and actual containers
  const groundContainers = (containers ?? []).filter((c) => c.containerType === "ground" && !c.isLooted);
  const nonGroundContainers = (containers ?? []).filter((c) => c.containerType !== "ground");

  // Flatten ground items for display
  const groundItems = groundContainers.flatMap((c) =>
    c.items.map((item, idx) => ({ ...item, containerId: c._id, itemIndex: idx }))
  );

  const handleTakeGroundItem = async (containerId: Id<"lootContainers">, itemIndex: number) => {
    if (!characterId) return;
    await takeItem({ containerId, characterId, itemIndex });
  };

  const handleTakeAllGround = async () => {
    if (!characterId) return;
    for (const gc of groundContainers) {
      if (gc.items.length > 0) {
        await takeAllItems({ containerId: gc._id, characterId });
      }
    }
  };

  const handleContainerClick = async (container: (typeof nonGroundContainers)[0]) => {
    if (container.isLooted) return;
    if (container.lock?.isLocked) return; // locked - can't open yet
    if (!container.isOpened) {
      await openContainer({ containerId: container._id });
    }
    setOpenContainerId(container._id);
  };

  const openedContainer = nonGroundContainers.find((c) => c._id === openContainerId);

  return (
    <div className="space-y-0">
      {/* Mood image / gradient */}
      <div className="relative w-full h-48 overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={currentLocation.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />
        )}
        {/* Gradient scrim + location name overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="font-bold text-lg text-white drop-shadow-lg">
            {currentLocation.name}
          </h3>
          {locationType && (
            <span className="text-xs text-white/60 capitalize">
              {locationType}
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      <div className="p-4">
        <p className="text-sm text-[var(--foreground-secondary)] leading-relaxed">
          {currentLocation.description}
        </p>
      </div>

      {/* NPCs at location */}
      {currentLocation.npcs && currentLocation.npcs.length > 0 && (
        <div className="px-4 pb-4">
          <h4 className="text-sm font-medium mb-2">Characters here:</h4>
          <div className="space-y-1">
            {currentLocation.npcs.map((npc) => (
              <div
                key={npc.id}
                className="flex items-center gap-2 text-sm p-2 rounded bg-[var(--background-tertiary)]"
              >
                <div className="w-6 h-6 rounded-full bg-[var(--accent-red)] flex items-center justify-center text-white text-xs font-bold">
                  {npc.name[0]}
                </div>
                <span>{npc.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ground Items */}
      {groundItems.length > 0 && (
        <div className="px-4 pb-4">
          <h4 className="text-sm font-medium mb-2">Items on the ground:</h4>
          <div className="space-y-1">
            {groundItems.map((item, i) => {
              const rarityColor = RARITY_COLORS[item.rarity as Rarity] ?? "#fff";
              return (
                <div
                  key={`${item.containerId}-${item.itemIndex}-${i}`}
                  className="flex items-center gap-2 text-sm p-2 rounded bg-[var(--background-tertiary)]"
                >
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: rarityColor }}
                  />
                  <span className="flex-1 truncate" style={{ color: rarityColor }}>
                    {item.name}
                  </span>
                  {characterId && (
                    <button
                      onClick={() => handleTakeGroundItem(item.containerId, item.itemIndex)}
                      className="text-xs px-2 py-0.5 rounded bg-[var(--accent-gold)]/20 text-[var(--accent-gold)] hover:bg-[var(--accent-gold)]/30 transition-colors shrink-0"
                    >
                      Take
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          {characterId && groundItems.length > 1 && (
            <button
              onClick={handleTakeAllGround}
              className="mt-2 w-full py-1.5 rounded-lg text-xs font-medium bg-[var(--accent-gold)]/10 text-[var(--accent-gold)] hover:bg-[var(--accent-gold)]/20 transition-colors"
            >
              Take All
            </button>
          )}
        </div>
      )}

      {/* Containers */}
      {nonGroundContainers.length > 0 && (
        <div className="px-4 pb-4">
          <h4 className="text-sm font-medium mb-2">Containers:</h4>
          <div className="space-y-1.5">
            {nonGroundContainers.map((container) => {
              const Icon = CONTAINER_ICONS[container.containerType] ?? Box;
              const isLocked = container.lock?.isLocked ?? false;

              let statusLabel: string;
              let statusColor: string;
              if (container.isLooted) {
                statusLabel = "Looted";
                statusColor = "var(--foreground-muted)";
              } else if (isLocked) {
                statusLabel = "Locked";
                statusColor = "var(--accent-red)";
              } else {
                statusLabel = `${container.itemCount} item${container.itemCount !== 1 ? "s" : ""}`;
                statusColor = "var(--accent-gold)";
              }

              return (
                <button
                  key={container._id}
                  onClick={() => handleContainerClick(container)}
                  disabled={container.isLooted || isLocked}
                  className="w-full flex items-center gap-3 text-sm p-2.5 rounded-lg bg-[var(--background-tertiary)] hover:bg-[var(--background-tertiary)]/80 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="w-8 h-8 rounded-lg bg-[var(--card)] flex items-center justify-center shrink-0">
                    {isLocked ? (
                      <Lock className="h-4 w-4 text-[var(--accent-red)]" />
                    ) : container.isLooted ? (
                      <Check className="h-4 w-4 text-[var(--foreground-muted)]" />
                    ) : (
                      <Icon className="h-4 w-4 text-[var(--accent-gold)]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-medium block truncate">{container.name}</span>
                    {container.description && (
                      <span className="text-xs text-[var(--foreground-muted)] block truncate">
                        {container.description}
                      </span>
                    )}
                  </div>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full shrink-0"
                    style={{
                      color: statusColor,
                      backgroundColor: isLocked
                        ? "rgba(239, 68, 68, 0.1)"
                        : container.isLooted
                          ? "rgba(128, 128, 128, 0.1)"
                          : "rgba(255, 200, 50, 0.1)",
                    }}
                  >
                    {statusLabel}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Loot Popup for opened container */}
      {openContainerId && openedContainer && characterId && (
        <LootPopup
          containerId={openContainerId}
          containerName={openedContainer.name}
          containerDescription={openedContainer.description}
          items={openedContainer.items}
          isLooted={openedContainer.isLooted}
          isLocked={openedContainer.lock?.isLocked ?? false}
          characterId={characterId}
          onClose={() => setOpenContainerId(null)}
        />
      )}
    </div>
  );
}
