"use client";

import { cn } from "@/lib/utils";

interface CombatTokenProps {
  name: string;
  entityType: "character" | "npc";
  hp: number;
  maxHp: number;
  portrait?: string;
  isCurrentTurn: boolean;
  isSelected: boolean;
  position: { x: number; y: number };
  cellSize: number;
  onClick?: () => void;
}

export function CombatToken({
  name,
  entityType,
  hp,
  maxHp,
  isCurrentTurn,
  isSelected,
  position,
  cellSize,
  onClick,
}: CombatTokenProps) {
  const isDefeated = hp <= 0;
  const hpPercent = (hp / maxHp) * 100;
  const tokenSize = cellSize * 0.8;

  return (
    <g
      transform={`translate(${position.x * cellSize + cellSize / 2}, ${position.y * cellSize + cellSize / 2})`}
      onClick={onClick}
      className="cursor-pointer"
      style={{ pointerEvents: "all" }}
    >
      {/* Selection ring */}
      {isSelected && (
        <circle
          r={tokenSize / 2 + 4}
          fill="none"
          stroke="var(--accent-gold)"
          strokeWidth={2}
          strokeDasharray="4 2"
          className="animate-pulse"
        />
      )}

      {/* Current turn indicator */}
      {isCurrentTurn && (
        <circle
          r={tokenSize / 2 + 2}
          fill="none"
          stroke="var(--accent-gold)"
          strokeWidth={3}
        />
      )}

      {/* Token background */}
      <circle
        r={tokenSize / 2}
        fill={
          isDefeated
            ? "var(--foreground-muted)"
            : entityType === "character"
            ? "var(--accent-blue)"
            : "var(--accent-red)"
        }
        stroke="var(--background)"
        strokeWidth={2}
        opacity={isDefeated ? 0.5 : 1}
      />

      {/* Token letter */}
      <text
        textAnchor="middle"
        dominantBaseline="central"
        fill="white"
        fontSize={tokenSize * 0.5}
        fontWeight="bold"
        opacity={isDefeated ? 0.5 : 1}
      >
        {name[0]?.toUpperCase() ?? "?"}
      </text>

      {/* HP bar */}
      {!isDefeated && (
        <g transform={`translate(${-tokenSize / 2}, ${tokenSize / 2 + 2})`}>
          <rect
            width={tokenSize}
            height={4}
            rx={2}
            fill="var(--background-tertiary)"
          />
          <rect
            width={tokenSize * (hpPercent / 100)}
            height={4}
            rx={2}
            fill={
              hpPercent > 50
                ? "var(--accent-green)"
                : hpPercent > 25
                ? "var(--accent-gold)"
                : "var(--accent-red)"
            }
          />
        </g>
      )}

      {/* Defeated X */}
      {isDefeated && (
        <g>
          <line
            x1={-tokenSize / 4}
            y1={-tokenSize / 4}
            x2={tokenSize / 4}
            y2={tokenSize / 4}
            stroke="var(--accent-red)"
            strokeWidth={3}
            strokeLinecap="round"
          />
          <line
            x1={tokenSize / 4}
            y1={-tokenSize / 4}
            x2={-tokenSize / 4}
            y2={tokenSize / 4}
            stroke="var(--accent-red)"
            strokeWidth={3}
            strokeLinecap="round"
          />
        </g>
      )}
    </g>
  );
}
