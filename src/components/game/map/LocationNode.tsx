"use client";

import { cn } from "@/lib/utils";
import { MapPin, Lock, Swords, Users } from "lucide-react";

interface LocationNodeProps {
  id: string;
  name: string;
  isDiscovered: boolean;
  isCurrent: boolean;
  isConnected: boolean;
  hasGrid: boolean;
  npcCount?: number;
  position: { x: number; y: number };
  onClick: () => void;
  onHover?: (hovering: boolean) => void;
}

export function LocationNode({
  name,
  isDiscovered,
  isCurrent,
  isConnected,
  hasGrid,
  npcCount = 0,
  position,
  onClick,
  onHover,
}: LocationNodeProps) {
  const nodeSize = 60;
  const canClick = isDiscovered && isConnected;

  return (
    <g
      transform={`translate(${position.x}, ${position.y})`}
      onClick={canClick ? onClick : undefined}
      onMouseEnter={() => onHover?.(true)}
      onMouseLeave={() => onHover?.(false)}
      className={cn(
        "transition-transform",
        canClick && "cursor-pointer hover:scale-110"
      )}
      style={{ pointerEvents: "all" }}
    >
      {/* Current location glow */}
      {isCurrent && (
        <circle
          r={nodeSize / 2 + 8}
          fill="none"
          stroke="var(--accent-gold)"
          strokeWidth={3}
          strokeDasharray="8 4"
          className="animate-pulse"
        />
      )}

      {/* Connected indicator */}
      {isConnected && !isCurrent && isDiscovered && (
        <circle
          r={nodeSize / 2 + 4}
          fill="none"
          stroke="var(--accent-blue)"
          strokeWidth={2}
          strokeOpacity={0.5}
        />
      )}

      {/* Main node circle */}
      <circle
        r={nodeSize / 2}
        fill={
          !isDiscovered
            ? "var(--foreground-muted)"
            : isCurrent
            ? "var(--accent-gold)"
            : isConnected
            ? "var(--accent-blue)"
            : "var(--background-tertiary)"
        }
        fillOpacity={isDiscovered ? 1 : 0.3}
        stroke="var(--border)"
        strokeWidth={2}
      />

      {/* Icon */}
      {!isDiscovered ? (
        <g transform="translate(-8, -8)">
          <Lock className="h-4 w-4" stroke="var(--foreground-muted)" />
        </g>
      ) : (
        <g transform="translate(-10, -10)">
          <MapPin className="h-5 w-5" stroke="white" fill="none" />
        </g>
      )}

      {/* Indicators */}
      {isDiscovered && (
        <g>
          {/* Combat grid indicator */}
          {hasGrid && (
            <g transform={`translate(${nodeSize / 2 - 8}, ${-nodeSize / 2 + 8})`}>
              <circle r={8} fill="var(--accent-red)" />
              <Swords className="h-3 w-3" stroke="white" transform="translate(-6, -6)" />
            </g>
          )}

          {/* NPC count indicator */}
          {npcCount > 0 && (
            <g transform={`translate(${-nodeSize / 2 + 8}, ${-nodeSize / 2 + 8})`}>
              <circle r={10} fill="var(--accent-purple)" />
              <text
                textAnchor="middle"
                dominantBaseline="central"
                fill="white"
                fontSize={10}
                fontWeight="bold"
              >
                {npcCount}
              </text>
            </g>
          )}
        </g>
      )}

      {/* Label */}
      <g transform={`translate(0, ${nodeSize / 2 + 16})`}>
        <text
          textAnchor="middle"
          fill={isDiscovered ? "var(--foreground)" : "var(--foreground-muted)"}
          fontSize={12}
          fontWeight={isCurrent ? "bold" : "normal"}
        >
          {isDiscovered ? name : "???"}
        </text>
        {isDiscovered && nameFr && (
          <text
            textAnchor="middle"
            fill="var(--accent-blue)"
            fontSize={10}
            dy={14}
          >
            {nameFr}
          </text>
        )}
      </g>
    </g>
  );
}
