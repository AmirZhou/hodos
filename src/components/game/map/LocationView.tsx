"use client";

import { Id } from "../../../../convex/_generated/dataModel";

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

interface LocationViewProps {
  currentLocation: {
    name: string;
    description: string;
    properties?: Record<string, any>;
    npcs?: Array<{ id: string; name: string; portrait?: string }>;
  } | null | undefined;
  sessionId?: Id<"gameSessions">;
}

export function LocationView({ currentLocation }: LocationViewProps) {
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
    </div>
  );
}
