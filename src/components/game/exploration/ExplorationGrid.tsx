"use client";

import { useState, useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

const CELL_SIZE = 48;
const AXIS_SIZE = 24; // Space for axis labels

interface Position {
  x: number;
  y: number;
}

interface ExplorationGridProps {
  sessionId: Id<"gameSessions">;
  currentCharacterId?: Id<"characters">;
  currentCharacterName?: string;
}

export function ExplorationGrid({
  sessionId,
  currentCharacterId,
  currentCharacterName,
}: ExplorationGridProps) {
  const explorationState = useQuery(api.game.exploration.getExplorationState, {
    sessionId,
  });
  const moveCharacter = useMutation(api.game.exploration.moveCharacter);
  const [hoveredCell, setHoveredCell] = useState<Position | null>(null);
  const [isMoving, setIsMoving] = useState(false);

  if (!explorationState) return null;

  const { gridSize, characterPositions, npcPositions, cells } = explorationState;

  // No positions initialized yet
  if (Object.keys(characterPositions).length === 0 && Object.keys(npcPositions).length === 0) {
    return null;
  }

  const currentCharPos = currentCharacterId
    ? characterPositions[currentCharacterId]
    : null;

  // Cell lookup
  const cellMap = new Map<string, (typeof cells)[0]>();
  for (const cell of cells) {
    cellMap.set(`${cell.x},${cell.y}`, cell);
  }

  // Occupied cells
  const occupiedSet = new Set<string>();
  for (const [, pos] of Object.entries(characterPositions)) {
    occupiedSet.add(`${pos.x},${pos.y}`);
  }
  for (const [, npc] of Object.entries(npcPositions)) {
    occupiedSet.add(`${npc.x},${npc.y}`);
  }

  // Valid moves: adjacent cells (4-directional) that are not occupied or impassable
  const validMoves = new Set<string>();
  if (currentCharPos) {
    const dirs = [
      { dx: 0, dy: -1 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
      { dx: 1, dy: 0 },
    ];
    for (const { dx, dy } of dirs) {
      const nx = currentCharPos.x + dx;
      const ny = currentCharPos.y + dy;
      if (nx < 0 || nx >= gridSize.width || ny < 0 || ny >= gridSize.height) continue;
      const cell = cellMap.get(`${nx},${ny}`);
      if (cell?.terrain === "impassable") continue;
      if (occupiedSet.has(`${nx},${ny}`) && !(currentCharacterId && characterPositions[currentCharacterId]?.x === nx && characterPositions[currentCharacterId]?.y === ny)) {
        continue;
      }
      validMoves.add(`${nx},${ny}`);
    }
  }

  const handleCellClick = async (pos: Position) => {
    if (!currentCharacterId || !currentCharacterName || isMoving) return;
    if (!validMoves.has(`${pos.x},${pos.y}`)) return;

    setIsMoving(true);
    try {
      await moveCharacter({
        sessionId,
        characterId: currentCharacterId,
        characterName: currentCharacterName,
        to: pos,
      });
    } catch (e) {
      console.error("Move failed:", e);
    } finally {
      setIsMoving(false);
    }
  };

  const svgWidth = gridSize.width * CELL_SIZE + AXIS_SIZE;
  const svgHeight = gridSize.height * CELL_SIZE + AXIS_SIZE;

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--background-secondary)]">
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="block w-full h-auto"
      >
        {/* Background */}
        <rect width={svgWidth} height={svgHeight} fill="var(--background-tertiary)" />

        {/* X-axis labels (1-based) */}
        {Array.from({ length: gridSize.width }, (_, x) => (
          <text
            key={`x-${x}`}
            x={AXIS_SIZE + x * CELL_SIZE + CELL_SIZE / 2}
            y={AXIS_SIZE / 2 + 4}
            textAnchor="middle"
            fontSize={10}
            fill="var(--foreground-muted)"
          >
            {x + 1}
          </text>
        ))}

        {/* Y-axis labels (1-based) */}
        {Array.from({ length: gridSize.height }, (_, y) => (
          <text
            key={`y-${y}`}
            x={AXIS_SIZE / 2}
            y={AXIS_SIZE + y * CELL_SIZE + CELL_SIZE / 2 + 4}
            textAnchor="middle"
            fontSize={10}
            fill="var(--foreground-muted)"
          >
            {y + 1}
          </text>
        ))}

        {/* Grid cells */}
        {Array.from({ length: gridSize.width * gridSize.height }, (_, i) => {
          const x = i % gridSize.width;
          const y = Math.floor(i / gridSize.width);
          const cell = cellMap.get(`${x},${y}`);
          const terrain = cell?.terrain ?? "normal";
          const isHovered = hoveredCell?.x === x && hoveredCell?.y === y;
          const isValid = validMoves.has(`${x},${y}`);

          return (
            <g key={`cell-${x}-${y}`}>
              <rect
                x={AXIS_SIZE + x * CELL_SIZE}
                y={AXIS_SIZE + y * CELL_SIZE}
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
                onClick={() => handleCellClick({ x, y })}
                style={{ cursor: isValid ? "pointer" : "default" }}
              />

              {/* Valid move highlight */}
              {isValid && (
                <rect
                  x={AXIS_SIZE + x * CELL_SIZE + 2}
                  y={AXIS_SIZE + y * CELL_SIZE + 2}
                  width={CELL_SIZE - 4}
                  height={CELL_SIZE - 4}
                  rx={4}
                  fill="var(--accent-blue)"
                  fillOpacity={isHovered ? 0.4 : 0.15}
                  pointerEvents="none"
                />
              )}

              {/* Hover highlight */}
              {isHovered && !isValid && (
                <rect
                  x={AXIS_SIZE + x * CELL_SIZE}
                  y={AXIS_SIZE + y * CELL_SIZE}
                  width={CELL_SIZE}
                  height={CELL_SIZE}
                  fill="white"
                  fillOpacity={0.05}
                  pointerEvents="none"
                />
              )}
            </g>
          );
        })}

        {/* Character tokens */}
        {Object.entries(characterPositions).map(([charId, pos]) => {
          const isCurrent = charId === currentCharacterId;
          return (
            <ExplorationToken
              key={charId}
              position={pos}
              label={isCurrent && currentCharacterName ? currentCharacterName[0] : "?"}
              color="var(--accent-blue)"
              isCurrent={isCurrent}
            />
          );
        })}

        {/* NPC tokens */}
        {Object.entries(npcPositions).map(([npcId, npc]) => (
          <ExplorationToken
            key={npcId}
            position={{ x: npc.x, y: npc.y }}
            label={npc.name[0]}
            color="var(--accent-red)"
            isCurrent={false}
            name={npc.name}
          />
        ))}
      </svg>
    </div>
  );
}

function ExplorationToken({
  position,
  label,
  color,
  isCurrent,
  name,
}: {
  position: Position;
  label: string;
  color: string;
  isCurrent: boolean;
  name?: string;
}) {
  const tokenSize = CELL_SIZE * 0.75;
  const cx = AXIS_SIZE + position.x * CELL_SIZE + CELL_SIZE / 2;
  const cy = AXIS_SIZE + position.y * CELL_SIZE + CELL_SIZE / 2;

  return (
    <g transform={`translate(${cx}, ${cy})`}>
      {/* Current character indicator ring */}
      {isCurrent && (
        <circle
          r={tokenSize / 2 + 3}
          fill="none"
          stroke="var(--accent-gold)"
          strokeWidth={2}
          strokeDasharray="4 2"
          className="animate-pulse"
        />
      )}

      {/* Token circle */}
      <circle
        r={tokenSize / 2}
        fill={color}
        stroke="var(--background)"
        strokeWidth={2}
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

      {/* Name label below token */}
      {name && (
        <text
          y={tokenSize / 2 + 12}
          textAnchor="middle"
          fontSize={9}
          fill="var(--foreground-secondary)"
        >
          {name}
        </text>
      )}
    </g>
  );
}
