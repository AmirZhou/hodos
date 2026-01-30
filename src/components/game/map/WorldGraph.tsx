"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Globe, Lock, Navigation, Building2 } from "lucide-react";

interface WorldGraphProps {
  campaignId: Id<"campaigns">;
  sessionId?: Id<"gameSessions">;
  currentMapId?: Id<"maps">;
  onEnterCity?: (mapId: Id<"maps">) => void;
}

interface WorldNode {
  id: Id<"maps">;
  name: string;
  description: string;
  slug: string;
  isDiscovered: boolean;
  hasCityGrid: boolean;
  connectedMaps: Id<"maps">[];
  parentMapId?: Id<"maps">;
  properties: Record<string, any>;
}

/**
 * Position city nodes in a force-like layout.
 * Discovered cities form an inner ring, undiscovered in outer.
 */
function calculateWorldPositions(
  nodes: WorldNode[],
  currentMapId?: Id<"maps">,
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  const width = 500;
  const height = 400;

  // Separate parent (world) nodes from child (city) nodes
  const worldNodes = nodes.filter((n) => !n.parentMapId);
  const cityNodes = nodes.filter((n) => !!n.parentMapId);

  // Place world-level nodes if any
  if (worldNodes.length > 0 && cityNodes.length === 0) {
    // Only world nodes — circular layout
    worldNodes.forEach((node, i) => {
      const angle = (i / worldNodes.length) * 2 * Math.PI - Math.PI / 2;
      const radius = Math.min(width, height) / 3;
      positions.set(node.id, {
        x: width / 2 + Math.cos(angle) * radius,
        y: height / 2 + Math.sin(angle) * radius,
      });
    });
    return positions;
  }

  // Place city nodes
  const allNodes = cityNodes.length > 0 ? cityNodes : worldNodes;
  const discovered = allNodes.filter((n) => n.isDiscovered);
  const undiscovered = allNodes.filter((n) => !n.isDiscovered);

  // Current city at center
  const currentNode = allNodes.find((n) => n.id === currentMapId);
  if (currentNode) {
    positions.set(currentNode.id, { x: width / 2, y: height / 2 });
  }

  // Discovered cities in inner ring (excluding current)
  const discoveredExcludingCurrent = discovered.filter(
    (n) => n.id !== currentMapId,
  );
  discoveredExcludingCurrent.forEach((node, i) => {
    const angle =
      (i / Math.max(discoveredExcludingCurrent.length, 1)) * 2 * Math.PI -
      Math.PI / 2;
    const radius = Math.min(width, height) / 3.5;
    positions.set(node.id, {
      x: width / 2 + Math.cos(angle) * radius,
      y: height / 2 + Math.sin(angle) * radius,
    });
  });

  // Undiscovered in outer ring
  undiscovered.forEach((node, i) => {
    const angle =
      (i / Math.max(undiscovered.length, 4)) * 2 * Math.PI - Math.PI / 4;
    const radius = Math.min(width, height) / 2.5;
    positions.set(node.id, {
      x: width / 2 + Math.cos(angle) * radius,
      y: height / 2 + Math.sin(angle) * radius,
    });
  });

  // Also place world nodes if mixed
  worldNodes.forEach((node) => {
    if (!positions.has(node.id)) {
      positions.set(node.id, { x: width / 2, y: 30 });
    }
  });

  return positions;
}

export function WorldGraph({
  campaignId,
  sessionId,
  currentMapId,
  onEnterCity,
}: WorldGraphProps) {
  const [selectedNode, setSelectedNode] = useState<Id<"maps"> | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const worldGraph = useQuery(api.game.worldNavigation.getWorldGraph, {
    campaignId,
  });
  const travelToCity = useMutation(api.game.worldNavigation.travelToCity);

  const positions = useMemo(() => {
    if (!worldGraph) return new Map<string, { x: number; y: number }>();
    return calculateWorldPositions(
      worldGraph.nodes as WorldNode[],
      currentMapId,
    );
  }, [worldGraph, currentMapId]);

  const handleEnterCity = async (mapId: Id<"maps">) => {
    if (!sessionId) return;
    try {
      await travelToCity({ sessionId, mapId });
      onEnterCity?.(mapId);
    } catch (error) {
      console.error("Travel to city failed:", error);
    }
  };

  if (!worldGraph) {
    return (
      <div className="flex items-center justify-center h-48">
        <p className="text-sm text-[var(--foreground-secondary)]">
          Loading world map...
        </p>
      </div>
    );
  }

  if (worldGraph.nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-48">
        <p className="text-sm text-[var(--foreground-muted)]">
          No world map data available.
        </p>
      </div>
    );
  }

  const width = 500;
  const height = 400;

  const selectedNodeData = selectedNode
    ? (worldGraph.nodes as WorldNode[]).find((n) => n.id === selectedNode)
    : null;

  return (
    <div className="space-y-0">
      {/* SVG Canvas */}
      <div className="overflow-auto bg-[var(--background-tertiary)]">
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          className="block w-full"
        >
          {/* Background pattern */}
          <defs>
            <pattern
              id="world-grid"
              width="40"
              height="40"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 40 0 L 0 0 0 40"
                fill="none"
                stroke="var(--border)"
                strokeWidth="0.5"
                strokeOpacity="0.2"
              />
            </pattern>
          </defs>
          <rect width={width} height={height} fill="url(#world-grid)" />

          {/* Connection lines */}
          {(worldGraph.nodes as WorldNode[]).map((node) => {
            const fromPos = positions.get(node.id);
            if (!fromPos) return null;

            return (node.connectedMaps ?? []).map((connectedId) => {
              const toPos = positions.get(connectedId as string);
              if (!toPos) return null;

              // Only draw once (when from < to)
              if (node.id > connectedId) return null;

              const isConnectedToCurrent =
                node.id === currentMapId ||
                connectedId.toString() === currentMapId?.toString();
              const isHovered =
                hoveredNode === node.id ||
                hoveredNode === connectedId.toString();

              const fromDiscovered = node.isDiscovered;
              const toNode = (worldGraph.nodes as WorldNode[]).find(
                (n) => n.id === connectedId,
              );
              const toDiscovered = toNode?.isDiscovered ?? false;
              const bothDiscovered = fromDiscovered && toDiscovered;

              return (
                <line
                  key={`${node.id}-${connectedId}`}
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
                  strokeOpacity={bothDiscovered ? 0.6 : 0.2}
                  strokeDasharray={bothDiscovered ? "none" : "8 4"}
                />
              );
            });
          })}

          {/* City nodes */}
          {(worldGraph.nodes as WorldNode[]).map((node) => {
            const pos = positions.get(node.id);
            if (!pos) return null;

            const isCurrent = node.id === currentMapId;
            const isConnected = currentMapId
              ? node.connectedMaps?.some(
                  (id) => id.toString() === currentMapId.toString(),
                ) ?? false
              : false;
            const canClick = node.isDiscovered && (isConnected || isCurrent);

            return (
              <g
                key={node.id}
                transform={`translate(${pos.x}, ${pos.y})`}
                onClick={() => canClick && setSelectedNode(node.id)}
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
                className={
                  canClick
                    ? "cursor-pointer transition-transform hover:scale-110"
                    : ""
                }
                style={{ pointerEvents: "all" }}
              >
                {/* Current city glow */}
                {isCurrent && (
                  <circle
                    r={36}
                    fill="none"
                    stroke="var(--accent-gold)"
                    strokeWidth={3}
                    strokeDasharray="8 4"
                    className="animate-pulse"
                  />
                )}

                {/* Connected ring */}
                {isConnected && !isCurrent && node.isDiscovered && (
                  <circle
                    r={32}
                    fill="none"
                    stroke="var(--accent-blue)"
                    strokeWidth={2}
                    strokeOpacity={0.5}
                  />
                )}

                {/* Main node */}
                <circle
                  r={28}
                  fill={
                    !node.isDiscovered
                      ? "var(--foreground-muted)"
                      : isCurrent
                        ? "var(--accent-gold)"
                        : isConnected
                          ? "var(--accent-blue)"
                          : "var(--background-tertiary)"
                  }
                  fillOpacity={node.isDiscovered ? 1 : 0.3}
                  stroke="var(--border)"
                  strokeWidth={2}
                />

                {/* Icon */}
                {node.isDiscovered ? (
                  <foreignObject x={-10} y={-10} width={20} height={20}>
                    <Building2
                      className="h-5 w-5"
                      style={{ color: isCurrent ? "white" : "var(--foreground)" }}
                    />
                  </foreignObject>
                ) : (
                  <foreignObject x={-8} y={-8} width={16} height={16}>
                    <Lock
                      className="h-4 w-4"
                      style={{ color: "var(--foreground-muted)" }}
                    />
                  </foreignObject>
                )}

                {/* Label */}
                <text
                  y={44}
                  textAnchor="middle"
                  fill={
                    node.isDiscovered
                      ? "var(--foreground)"
                      : "var(--foreground-muted)"
                  }
                  fontSize={11}
                  fontWeight={isCurrent ? "bold" : "normal"}
                >
                  {node.isDiscovered ? node.name : "???"}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Selected node detail panel */}
      {selectedNodeData && (
        <div className="p-3 border-t border-[var(--border)] space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">{selectedNodeData.name}</h4>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-xs text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
            >
              Close
            </button>
          </div>
          <p className="text-xs text-[var(--foreground-secondary)] line-clamp-3">
            {selectedNodeData.description}
          </p>
          {sessionId && selectedNodeData.id !== currentMapId && (
            <Button
              size="sm"
              className="w-full gap-2"
              onClick={() => handleEnterCity(selectedNodeData.id)}
              disabled={!selectedNodeData.isDiscovered}
            >
              <Navigation className="h-3 w-3" />
              Travel to {selectedNodeData.name}
            </Button>
          )}
          {selectedNodeData.id === currentMapId && (
            <div className="text-xs text-[var(--accent-gold)] text-center py-1">
              You are here
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 px-3 py-2 border-t border-[var(--border)] text-xs text-[var(--foreground-secondary)]">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[var(--accent-gold)]" />
          <span>Current</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[var(--accent-blue)]" />
          <span>Reachable</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[var(--foreground-muted)] opacity-30" />
          <span>Undiscovered</span>
        </div>
      </div>
    </div>
  );
}
