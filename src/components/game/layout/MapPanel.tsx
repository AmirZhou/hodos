"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { LocationView, CityGrid, WorldGraph } from "@/components/game/map";
import { Globe, Building2, MapPin, ArrowLeft } from "lucide-react";

export function MapPanel({
  campaignId,
  sessionId,
  currentLocationId,
  currentCharacterId,
  currentCharacterName,
  navigationMode,
  currentMapId,
  onNpcClick,
}: {
  campaignId: Id<"campaigns">;
  sessionId?: Id<"gameSessions">;
  currentLocationId?: Id<"locations">;
  currentCharacterId?: Id<"characters">;
  currentCharacterName?: string;
  navigationMode?: "world" | "city" | "location";
  currentMapId?: Id<"maps">;
  onNpcClick?: (npcId: Id<"npcs">) => void;
}) {
  const [activeTab, setActiveTab] = useState<"world" | "city" | "location">(
    navigationMode === "location" ? "location" : navigationMode === "city" ? "city" : "world"
  );
  const exitToCity = useMutation(api.game.cityNavigation.exitToCity);
  const exitToWorld = useMutation(api.game.worldNavigation.exitToWorld);

  const currentLocation = useQuery(
    api.game.travel.getCurrentLocation,
    sessionId ? { sessionId } : "skip"
  );

  const cityMap = useQuery(
    api.game.cityNavigation.getCityGridState,
    sessionId ? { sessionId } : "skip"
  );

  const hasCityMap = !!currentMapId;
  const isInLocationMode = navigationMode === "location";

  useEffect(() => {
    if (navigationMode === "location") setActiveTab("location");
    else if (navigationMode === "city") setActiveTab("city");
    else if (navigationMode === "world") setActiveTab("world");
  }, [navigationMode]);

  const tabClass = (tab: string) =>
    `flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 text-xs font-medium transition-colors ${
      activeTab === tab
        ? "text-[var(--accent-gold)] border-b-2 border-[var(--accent-gold)]"
        : "text-[var(--foreground-secondary)] hover:text-[var(--foreground)]"
    }`;

  return (
    <div className="border-b border-[var(--border)]">
      {/* Three-Tab Header */}
      <div className="flex border-b border-[var(--border)]">
        <button onClick={() => setActiveTab("world")} className={tabClass("world")}>
          <Globe className="h-3.5 w-3.5" />
          World
        </button>
        <button
          onClick={() => setActiveTab("city")}
          className={tabClass("city")}
          disabled={!hasCityMap}
          style={{ opacity: hasCityMap ? 1 : 0.4 }}
        >
          <Building2 className="h-3.5 w-3.5" />
          City
        </button>
        <button
          onClick={() => setActiveTab("location")}
          className={tabClass("location")}
          disabled={!currentLocation}
          style={{ opacity: currentLocation ? 1 : 0.4 }}
        >
          <MapPin className="h-3.5 w-3.5" />
          Location
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "world" && (
        <div className="overflow-auto max-h-[50vh]">
          <WorldGraph
            campaignId={campaignId}
            sessionId={sessionId}
            currentMapId={currentMapId}
            onEnterCity={() => setActiveTab("city")}
          />
        </div>
      )}

      {activeTab === "city" && (
        <div>
          {sessionId && (
            <div className="p-2 border-b border-[var(--border)] flex gap-2">
              <button
                onClick={() => {
                  exitToWorld({ sessionId });
                  setActiveTab("world");
                }}
                className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-medium bg-[var(--background-tertiary)] text-[var(--foreground-secondary)] hover:bg-[var(--background-tertiary)]/80 transition-colors"
              >
                <ArrowLeft className="h-3 w-3" />
                World
              </button>
            </div>
          )}
          {hasCityMap && sessionId ? (
            <div className="p-3">
              <CityGrid
                sessionId={sessionId}
                campaignId={campaignId}
                currentCharacterId={currentCharacterId}
                currentCharacterName={currentCharacterName}
              />
            </div>
          ) : (
            <div className="p-4">
              <p className="text-sm text-[var(--foreground-muted)]">No city map available.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === "location" && (
        <div>
          {isInLocationMode && hasCityMap && sessionId && (
            <div className="p-2 border-b border-[var(--border)]">
              <button
                onClick={() => {
                  exitToCity({ sessionId });
                  setActiveTab("city");
                }}
                className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-medium bg-[var(--accent-gold)]/10 text-[var(--accent-gold)] hover:bg-[var(--accent-gold)]/20 transition-colors"
              >
                <ArrowLeft className="h-3 w-3" />
                Exit to City
              </button>
            </div>
          )}

          {currentLocation ? (
            <LocationView
              currentLocation={currentLocation}
              sessionId={sessionId}
              characterId={currentCharacterId}
              onNpcClick={onNpcClick}
            />
          ) : (
            <div className="p-4">
              <p className="text-[var(--foreground-muted)] text-sm">
                No location selected. Enter a location from the City grid.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
