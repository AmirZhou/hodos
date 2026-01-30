"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

const CELL_SIZE = 28;
const GRID_DIM = 16;

interface CityGridProps {
  sessionId: Id<"gameSessions">;
  campaignId: Id<"campaigns">;
  currentCharacterId?: Id<"characters">;
  currentCharacterName?: string;
}

type CityTerrain =
  | "road" | "building" | "water" | "wall"
  | "gate" | "plaza" | "garden" | "dock" | "bridge";

// Opacities for when no background image is present
const TERRAIN_COLORS: Record<CityTerrain, { fill: string; opacity: number; bgOpacity: number }> = {
  road:     { fill: "#8B7355", opacity: 0.3,  bgOpacity: 0 },
  building: { fill: "#555555", opacity: 0.4,  bgOpacity: 0 },
  water:    { fill: "#2266AA", opacity: 0.5,  bgOpacity: 0 },
  wall:     { fill: "#333333", opacity: 0.6,  bgOpacity: 0 },
  gate:     { fill: "#AA8844", opacity: 0.4,  bgOpacity: 0 },
  plaza:    { fill: "#CCAA66", opacity: 0.35, bgOpacity: 0 },
  garden:   { fill: "#336633", opacity: 0.4,  bgOpacity: 0 },
  dock:     { fill: "#5D4E37", opacity: 0.35, bgOpacity: 0 },
  bridge:   { fill: "#9B7B4B", opacity: 0.45, bgOpacity: 0 },
};

export function CityGrid({
  sessionId,
  campaignId,
  currentCharacterId,
  currentCharacterName,
}: CityGridProps) {
  const gridState = useQuery(api.game.cityNavigation.getCityGridState, {
    sessionId,
  });
  const moveCityToken = useMutation(api.game.cityNavigation.moveCityToken);
  const enterLocation = useMutation(api.game.cityNavigation.enterLocation);

  const [hoveredCell, setHoveredCell] = useState<{ x: number; y: number } | null>(null);
  const [isMoving, setIsMoving] = useState(false);

  if (!gridState) return null;

  const {
    cells,
    gridSize,
    backgroundImage,
    cityPosition,
    locationMap,
    discoveredLocationIds,
  } = gridState;

  // Build cell lookup
  const cellMap = new Map<string, (typeof cells)[0]>();
  for (const c of cells) {
    cellMap.set(`${c.x},${c.y}`, c);
  }

  // Build set of discovered location IDs
  const discoveredSet = new Set(discoveredLocationIds);

  // Valid moves: adjacent walkable cells
  const validMoves = new Set<string>();
  const dirs = [
    { dx: 0, dy: -1 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 0 },
    { dx: 1, dy: 0 },
  ];
  for (const { dx, dy } of dirs) {
    const nx = cityPosition.x + dx;
    const ny = cityPosition.y + dy;
    if (nx < 0 || nx >= gridSize.width || ny < 0 || ny >= gridSize.height) continue;
    const cell = cellMap.get(`${nx},${ny}`);
    if (cell?.walkable) {
      validMoves.add(`${nx},${ny}`);
    }
  }

  // Current cell — check if it's a location
  const currentCell = cellMap.get(`${cityPosition.x},${cityPosition.y}`);
  const currentLocationTemplate = currentCell?.locationTemplateId;
  const currentLocationInfo = currentLocationTemplate
    ? locationMap[currentLocationTemplate]
    : null;

  const handleCellClick = async (x: number, y: number) => {
    if (isMoving) return;
    if (!validMoves.has(`${x},${y}`)) return;

    setIsMoving(true);
    try {
      await moveCityToken({ sessionId, to: { x, y } });
    } catch (e) {
      console.error("City move failed:", e);
    } finally {
      setIsMoving(false);
    }
  };

  const handleEnterLocation = async () => {
    if (!currentCharacterId || !currentCharacterName || isMoving) return;
    setIsMoving(true);
    try {
      await enterLocation({
        sessionId,
        characterId: currentCharacterId,
        characterName: currentCharacterName,
      });
    } catch (e) {
      console.error("Enter location failed:", e);
    } finally {
      setIsMoving(false);
    }
  };

  const svgWidth = gridSize.width * CELL_SIZE;
  const svgHeight = gridSize.height * CELL_SIZE;

  return (
    <div>
      <div className="relative rounded-lg border border-[var(--border)] bg-[var(--background-secondary)] overflow-hidden">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="block w-full h-auto"
        >
          {/* Background image */}
          {backgroundImage && (
            <image
              href={backgroundImage}
              x={0}
              y={0}
              width={svgWidth}
              height={svgHeight}
              preserveAspectRatio="xMidYMid slice"
            />
          )}

          {/* If no background image, draw a dark background */}
          {!backgroundImage && (
            <rect width={svgWidth} height={svgHeight} fill="var(--background-tertiary)" />
          )}

          {/* Terrain overlay + cells */}
          {cells.map((c) => {
            const terrain = c.terrain as CityTerrain;
            const colors = TERRAIN_COLORS[terrain] ?? TERRAIN_COLORS.road;
            const isHovered = hoveredCell?.x === c.x && hoveredCell?.y === c.y;
            const isValid = validMoves.has(`${c.x},${c.y}`);
            const isPlayerPos = cityPosition.x === c.x && cityPosition.y === c.y;

            // Fog of war: undiscovered locations get a dark overlay
            const hasLocation = !!c.locationTemplateId;
            const locationInfo = c.locationTemplateId
              ? locationMap[c.locationTemplateId]
              : null;
            const isDiscovered = locationInfo
              ? discoveredSet.has(locationInfo.locationId)
              : true; // non-location cells are always "discovered"

            return (
              <g key={`${c.x}-${c.y}`}>
                {/* Terrain color overlay */}
                <rect
                  x={c.x * CELL_SIZE}
                  y={c.y * CELL_SIZE}
                  width={CELL_SIZE}
                  height={CELL_SIZE}
                  fill={colors.fill}
                  fillOpacity={backgroundImage ? colors.bgOpacity : colors.opacity + 0.2}
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth={0.5}
                  onMouseEnter={() => setHoveredCell({ x: c.x, y: c.y })}
                  onMouseLeave={() => setHoveredCell(null)}
                  onClick={() => handleCellClick(c.x, c.y)}
                  style={{ cursor: isValid ? "pointer" : "default" }}
                />

                {/* Fog of war for undiscovered locations */}
                {hasLocation && !isDiscovered && !isPlayerPos && (
                  <rect
                    x={c.x * CELL_SIZE}
                    y={c.y * CELL_SIZE}
                    width={CELL_SIZE}
                    height={CELL_SIZE}
                    fill="black"
                    fillOpacity={0.6}
                    pointerEvents="none"
                  />
                )}

                {/* Location marker (discovered) */}
                {hasLocation && isDiscovered && !isPlayerPos && (
                  <g pointerEvents="none">
                    <rect
                      x={c.x * CELL_SIZE + 2}
                      y={c.y * CELL_SIZE + 2}
                      width={CELL_SIZE - 4}
                      height={CELL_SIZE - 4}
                      rx={3}
                      fill="none"
                      stroke="var(--accent-gold)"
                      strokeWidth={1.5}
                      strokeDasharray="3 2"
                      opacity={0.8}
                    />
                    {/* Door icon (small square) */}
                    <rect
                      x={c.x * CELL_SIZE + CELL_SIZE / 2 - 3}
                      y={c.y * CELL_SIZE + CELL_SIZE / 2 - 4}
                      width={6}
                      height={8}
                      rx={1}
                      fill="var(--accent-gold)"
                      opacity={0.7}
                    />
                  </g>
                )}

                {/* Valid move highlight */}
                {isValid && (
                  <rect
                    x={c.x * CELL_SIZE + 2}
                    y={c.y * CELL_SIZE + 2}
                    width={CELL_SIZE - 4}
                    height={CELL_SIZE - 4}
                    rx={3}
                    fill="var(--accent-blue)"
                    fillOpacity={isHovered ? 0.45 : 0.2}
                    pointerEvents="none"
                  />
                )}

                {/* Hover highlight */}
                {isHovered && !isValid && !isPlayerPos && (
                  <rect
                    x={c.x * CELL_SIZE}
                    y={c.y * CELL_SIZE}
                    width={CELL_SIZE}
                    height={CELL_SIZE}
                    fill="white"
                    fillOpacity={0.06}
                    pointerEvents="none"
                  />
                )}
              </g>
            );
          })}

          {/* Player token */}
          <CityToken
            position={cityPosition}
            label={currentCharacterName?.[0] ?? "?"}
          />
        </svg>

        {/* Overlay: location tooltip + enter button pinned to bottom of map */}
        <div className="absolute bottom-0 left-0 right-0 pointer-events-none flex flex-col items-center gap-1.5 p-2">
          {/* Hover tooltip */}
          <div className="text-xs text-white text-center h-4 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
            {(() => {
              if (!hoveredCell) return null;
              const hc = cellMap.get(`${hoveredCell.x},${hoveredCell.y}`);
              if (!hc?.locationTemplateId) return null;
              const info = locationMap[hc.locationTemplateId];
              if (!info) return null;
              const disc = discoveredSet.has(info.locationId);
              return disc ? info.name : "Undiscovered Location";
            })()}
          </div>

          {/* Enter location button */}
          {currentLocationInfo && (
            <button
              onClick={handleEnterLocation}
              disabled={isMoving || !currentCharacterId}
              className="pointer-events-auto w-[90%] py-1.5 px-3 rounded-md text-sm font-medium bg-black/60 backdrop-blur-sm text-[var(--accent-gold)] border border-[var(--accent-gold)]/40 hover:bg-black/75 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Enter {currentLocationInfo.name}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function CityToken({
  position,
  label,
}: {
  position: { x: number; y: number };
  label: string;
}) {
  const tokenSize = CELL_SIZE * 0.75;
  const cx = position.x * CELL_SIZE + CELL_SIZE / 2;
  const cy = position.y * CELL_SIZE + CELL_SIZE / 2;

  return (
    <g transform={`translate(${cx}, ${cy})`} pointerEvents="none">
      {/* Glow ring */}
      <circle
        r={tokenSize / 2 + 2}
        fill="none"
        stroke="var(--accent-gold)"
        strokeWidth={1.5}
        strokeDasharray="3 2"
        className="animate-pulse"
      />
      {/* Token circle */}
      <circle
        r={tokenSize / 2}
        fill="var(--accent-blue)"
        stroke="var(--background)"
        strokeWidth={1.5}
      />
      {/* Letter */}
      <text
        textAnchor="middle"
        dominantBaseline="central"
        fill="white"
        fontSize={tokenSize * 0.5}
        fontWeight="bold"
      >
        {label.toUpperCase()}
      </text>
    </g>
  );
}
