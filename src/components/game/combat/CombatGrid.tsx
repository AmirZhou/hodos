"use client";

import { useState, useMemo } from "react";
import { CombatToken } from "./CombatToken";
import { MovementOverlay, calculateValidMoves } from "./MovementOverlay";

interface Position {
  x: number;
  y: number;
}

interface GridCell {
  x: number;
  y: number;
  terrain: "normal" | "difficult" | "impassable";
  cover?: "half" | "three-quarters" | "full";
}

interface Combatant {
  entityId: string;
  entityType: "character" | "npc";
  position: Position;
  movementRemaining: number;
  entity: {
    name: string;
    hp: number;
    maxHp: number;
    portrait?: string;
  } | null;
}

interface CombatGridProps {
  width: number;
  height: number;
  cells?: GridCell[];
  combatants: Combatant[];
  currentTurnIndex: number;
  selectedCombatantIndex: number | null;
  isMoving: boolean;
  onCellClick: (position: Position) => void;
  onCombatantClick: (index: number) => void;
}

const CELL_SIZE = 48;

export function CombatGrid({
  width,
  height,
  cells = [],
  combatants,
  currentTurnIndex,
  selectedCombatantIndex,
  isMoving,
  onCellClick,
  onCombatantClick,
}: CombatGridProps) {
  const [hoveredCell, setHoveredCell] = useState<Position | null>(null);

  // Create cell map for quick lookup
  const cellMap = useMemo(() => {
    const map = new Map<string, GridCell>();
    for (const cell of cells) {
      map.set(`${cell.x},${cell.y}`, cell);
    }
    return map;
  }, [cells]);

  // Calculate valid moves for selected combatant
  const validMoves = useMemo(() => {
    if (!isMoving || selectedCombatantIndex === null) return [];

    const combatant = combatants[selectedCombatantIndex];
    if (!combatant) return [];

    const occupiedCells = combatants
      .filter((_, i) => i !== selectedCombatantIndex)
      .map((c) => c.position);

    const impassableCells = cells
      .filter((c) => c.terrain === "impassable")
      .map((c) => ({ x: c.x, y: c.y }));

    return calculateValidMoves(
      combatant.position,
      combatant.movementRemaining,
      width,
      height,
      occupiedCells,
      impassableCells
    );
  }, [isMoving, selectedCombatantIndex, combatants, cells, width, height]);

  const svgWidth = width * CELL_SIZE;
  const svgHeight = height * CELL_SIZE;

  return (
    <div className="overflow-auto rounded-lg border border-[var(--border)] bg-[var(--background-secondary)]">
      <svg
        width={svgWidth}
        height={svgHeight}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="block"
      >
        {/* Grid background */}
        <rect width={svgWidth} height={svgHeight} fill="var(--background-tertiary)" />

        {/* Grid cells */}
        {Array.from({ length: width * height }, (_, i) => {
          const x = i % width;
          const y = Math.floor(i / width);
          const cell = cellMap.get(`${x},${y}`);
          const terrain = cell?.terrain ?? "normal";
          const cover = cell?.cover;
          const isHovered = hoveredCell?.x === x && hoveredCell?.y === y;

          return (
            <g key={`cell-${x}-${y}`}>
              {/* Cell background */}
              <rect
                x={x * CELL_SIZE}
                y={y * CELL_SIZE}
                width={CELL_SIZE}
                height={CELL_SIZE}
                fill={
                  terrain === "impassable"
                    ? "var(--foreground-muted)"
                    : terrain === "difficult"
                    ? "var(--accent-gold)"
                    : "var(--background-tertiary)"
                }
                fillOpacity={terrain === "normal" ? 1 : 0.3}
                stroke="var(--border)"
                strokeWidth={0.5}
                onMouseEnter={() => setHoveredCell({ x, y })}
                onMouseLeave={() => setHoveredCell(null)}
                onClick={() => onCellClick({ x, y })}
                style={{ cursor: isMoving ? "pointer" : "default" }}
              />

              {/* Cover indicator */}
              {cover && (
                <rect
                  x={x * CELL_SIZE + 2}
                  y={y * CELL_SIZE + 2}
                  width={8}
                  height={8}
                  rx={2}
                  fill={
                    cover === "full"
                      ? "var(--accent-green)"
                      : cover === "three-quarters"
                      ? "var(--accent-blue)"
                      : "var(--accent-gold)"
                  }
                  fillOpacity={0.7}
                />
              )}

              {/* Hover highlight */}
              {isHovered && (
                <rect
                  x={x * CELL_SIZE}
                  y={y * CELL_SIZE}
                  width={CELL_SIZE}
                  height={CELL_SIZE}
                  fill="white"
                  fillOpacity={0.1}
                  pointerEvents="none"
                />
              )}
            </g>
          );
        })}

        {/* Movement overlay */}
        {isMoving && (
          <MovementOverlay
            validMoves={validMoves}
            attackRange={[]}
            cellSize={CELL_SIZE}
            onMoveClick={onCellClick}
          />
        )}

        {/* Combatant tokens */}
        {combatants.map((combatant, index) => (
          <CombatToken
            key={combatant.entityId}
            name={combatant.entity?.name ?? "?"}
            entityType={combatant.entityType}
            hp={combatant.entity?.hp ?? 0}
            maxHp={combatant.entity?.maxHp ?? 1}
            portrait={combatant.entity?.portrait}
            isCurrentTurn={index === currentTurnIndex}
            isSelected={index === selectedCombatantIndex}
            position={combatant.position}
            cellSize={CELL_SIZE}
            onClick={() => onCombatantClick(index)}
          />
        ))}

        {/* Coordinates (optional, for debugging) */}
        {/* {Array.from({ length: width }, (_, x) => (
          <text
            key={`coord-x-${x}`}
            x={x * CELL_SIZE + CELL_SIZE / 2}
            y={12}
            textAnchor="middle"
            fontSize={10}
            fill="var(--foreground-muted)"
          >
            {x}
          </text>
        ))}
        {Array.from({ length: height }, (_, y) => (
          <text
            key={`coord-y-${y}`}
            x={8}
            y={y * CELL_SIZE + CELL_SIZE / 2 + 4}
            textAnchor="middle"
            fontSize={10}
            fill="var(--foreground-muted)"
          >
            {y}
          </text>
        ))} */}
      </svg>

      {/* Legend */}
      <div className="flex items-center gap-4 px-4 py-2 border-t border-[var(--border)] text-xs text-[var(--foreground-secondary)]">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-[var(--accent-gold)] opacity-30" />
          <span>Difficult Terrain</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-[var(--foreground-muted)] opacity-30" />
          <span>Impassable</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-[var(--accent-green)] opacity-70" />
          <span>Full Cover</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-[var(--accent-blue)] opacity-70" />
          <span>3/4 Cover</span>
        </div>
      </div>
    </div>
  );
}
