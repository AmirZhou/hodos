"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { LocationNode } from "./LocationNode";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation, X } from "lucide-react";

interface LocationGraphProps {
  campaignId: Id<"campaigns">;
  sessionId?: Id<"gameSessions">;
  currentLocationId?: Id<"locations">;
  onLocationSelect?: (locationId: Id<"locations">) => void;
  onClose?: () => void;
}

interface LocationData {
  id: Id<"locations">;
  name: string;
  description: string;
  isDiscovered: boolean;
  hasGrid: boolean;
  connectedTo: Id<"locations">[];
}

// Simple force-directed layout positioning
function calculatePositions(
  locations: LocationData[],
  adjacencyMap: Record<string, string[]>
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  const width = 800;
  const height = 600;
  const padding = 100;

  // Start with a simple circular layout
  const discovered = locations.filter((l) => l.isDiscovered);
  const undiscovered = locations.filter((l) => !l.isDiscovered);

  // Place discovered locations in inner circle
  discovered.forEach((loc, i) => {
    const angle = (i / discovered.length) * 2 * Math.PI - Math.PI / 2;
    const radius = Math.min(width, height) / 3;
    positions.set(loc.id, {
      x: width / 2 + Math.cos(angle) * radius,
      y: height / 2 + Math.sin(angle) * radius,
    });
  });

  // Place undiscovered in outer ring (only if connected to discovered)
  let undiscoveredIndex = 0;
  undiscovered.forEach((loc) => {
    // Check if connected to any discovered location
    const isConnectedToDiscovered = loc.connectedTo.some((connId) =>
      discovered.some((d) => d.id === connId)
    );

    if (isConnectedToDiscovered) {
      const angle = (undiscoveredIndex / Math.max(undiscovered.length, 8)) * 2 * Math.PI;
      const radius = Math.min(width, height) / 2.2;
      positions.set(loc.id, {
        x: width / 2 + Math.cos(angle) * radius,
        y: height / 2 + Math.sin(angle) * radius,
      });
      undiscoveredIndex++;
    }
  });

  return positions;
}

export function LocationGraph({
  campaignId,
  sessionId,
  currentLocationId,
  onLocationSelect,
  onClose,
}: LocationGraphProps) {
  const [selectedLocation, setSelectedLocation] = useState<Id<"locations"> | null>(null);
  const [hoveredLocation, setHoveredLocation] = useState<string | null>(null);

  // Queries
  const locationGraph = useQuery(api.game.travel.getLocationGraph, { campaignId });
  const selectedDetails = useQuery(
    api.game.travel.getLocationDetails,
    selectedLocation ? { locationId: selectedLocation, campaignId } : "skip"
  );

  // Mutations
  const travelTo = useMutation(api.game.travel.travelTo);

  // Calculate positions
  const positions = useMemo(() => {
    if (!locationGraph) return new Map();
    return calculatePositions(
      locationGraph.allLocations as LocationData[],
      locationGraph.adjacencyMap
    );
  }, [locationGraph]);

  // Handle travel
  const handleTravel = async () => {
    if (!sessionId || !selectedLocation) return;

    try {
      await travelTo({ sessionId, destinationId: selectedLocation });
      onLocationSelect?.(selectedLocation);
      setSelectedLocation(null);
    } catch (error) {
      console.error("Travel failed:", error);
    }
  };

  if (!locationGraph) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-[var(--foreground-secondary)]">Loading map...</p>
      </div>
    );
  }

  const width = 800;
  const height = 600;

  return (
    <div className="rounded-lg bg-[var(--card)] border border-[var(--border)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[var(--background-secondary)] border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-[var(--accent-gold)]" />
          <span className="font-medium">World Map</span>
          <span className="text-sm text-[var(--foreground-muted)]">
            ({locationGraph.discoveredCount}/{locationGraph.totalCount} discovered)
          </span>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="flex">
        {/* Map area */}
        <div className="flex-1 overflow-auto bg-[var(--background-tertiary)]">
          <svg
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            className="block"
          >
            {/* Background pattern */}
            <defs>
              <pattern
                id="grid"
                width="40"
                height="40"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 40 0 L 0 0 0 40"
                  fill="none"
                  stroke="var(--border)"
                  strokeWidth="0.5"
                  strokeOpacity="0.3"
                />
              </pattern>
            </defs>
            <rect width={width} height={height} fill="url(#grid)" />

            {/* Connection lines */}
            {locationGraph.allLocations.map((location) => {
              const fromPos = positions.get(location.id);
              if (!fromPos) return null;

              return location.connectedTo.map((connectedId) => {
                const toPos = positions.get(connectedId as string);
                if (!toPos) return null;

                // Only draw line once (when from < to alphabetically)
                if (location.id > connectedId) return null;

                const isConnectedToCurrent =
                  location.id === currentLocationId || connectedId === currentLocationId;
                const isHovered =
                  hoveredLocation === location.id || hoveredLocation === connectedId;

                return (
                  <line
                    key={`${location.id}-${connectedId}`}
                    x1={fromPos.x}
                    y1={fromPos.y}
                    x2={toPos.x}
                    y2={toPos.y}
                    stroke={
                      isConnectedToCurrent
                        ? "var(--accent-gold)"
                        : isHovered
                        ? "var(--accent-blue)"
                        : "var(--foreground-muted)"
                    }
                    strokeWidth={isConnectedToCurrent || isHovered ? 3 : 2}
                    strokeOpacity={location.isDiscovered ? 0.6 : 0.2}
                    strokeDasharray={location.isDiscovered ? "none" : "8 4"}
                  />
                );
              });
            })}

            {/* Location nodes */}
            {locationGraph.allLocations.map((location) => {
              const pos = positions.get(location.id);
              if (!pos) return null;

              const isConnectedToCurrent = currentLocationId
                ? location.connectedTo.includes(currentLocationId) ||
                  location.id === currentLocationId
                : false;

              return (
                <LocationNode
                  key={location.id}
                  id={location.id}
                  name={location.name}
                  isDiscovered={location.isDiscovered}
                  isCurrent={location.id === currentLocationId}
                  isConnected={isConnectedToCurrent}
                  hasGrid={location.hasGrid}
                  position={pos}
                  onClick={() => setSelectedLocation(location.id)}
                  onHover={(hovering) =>
                    setHoveredLocation(hovering ? location.id : null)
                  }
                />
              );
            })}
          </svg>
        </div>

        {/* Details sidebar */}
        {selectedLocation && selectedDetails && (
          <div className="w-72 border-l border-[var(--border)] p-4 space-y-4">
            <div>
              <h3 className="font-bold text-lg">{selectedDetails.name}</h3>
            </div>

            <p className="text-sm text-[var(--foreground-secondary)]">
              {selectedDetails.description}
            </p>

            {/* NPCs at location */}
            {selectedDetails.npcs && selectedDetails.npcs.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Characters here:</h4>
                <div className="space-y-1">
                  {selectedDetails.npcs.map((npc) => (
                    <div
                      key={npc.id}
                      className="flex items-center gap-2 text-sm p-2 rounded bg-[var(--background-tertiary)]"
                    >
                      <div className="w-6 h-6 rounded-full bg-[var(--accent-purple)] flex items-center justify-center text-white text-xs font-bold">
                        {npc.name[0]}
                      </div>
                      <span>{npc.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Connected locations */}
            {selectedDetails.connectedLocations &&
              selectedDetails.connectedLocations.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Connected to:</h4>
                  <div className="flex flex-wrap gap-1">
                    {selectedDetails.connectedLocations
                      .filter((conn): conn is NonNullable<typeof conn> => conn !== null)
                      .map((conn) => (
                        <span
                          key={conn.id}
                          className="text-xs px-2 py-1 rounded bg-[var(--background-tertiary)]"
                        >
                          {conn.isDiscovered ? conn.name : "???"}
                        </span>
                      ))}
                  </div>
                </div>
              )}

            {/* Travel button */}
            {sessionId && selectedLocation !== currentLocationId && (
              <Button
                className="w-full gap-2"
                onClick={handleTravel}
                disabled={
                  !selectedDetails.isDiscovered ||
                  !currentLocationId ||
                  !locationGraph.allLocations
                    .find((l) => l.id === currentLocationId)
                    ?.connectedTo.includes(selectedLocation)
                }
              >
                <Navigation className="h-4 w-4" />
                Travel Here
              </Button>
            )}

            <Button
              variant="outline"
              className="w-full"
              onClick={() => setSelectedLocation(null)}
            >
              Close
            </Button>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 px-4 py-2 border-t border-[var(--border)] text-xs text-[var(--foreground-secondary)]">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-[var(--accent-gold)]" />
          <span>Current Location</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-[var(--accent-blue)]" />
          <span>Reachable</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-[var(--foreground-muted)] opacity-30" />
          <span>Undiscovered</span>
        </div>
      </div>
    </div>
  );
}
