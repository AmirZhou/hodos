"use client";

import { cn } from "@/lib/utils";

interface Combatant {
  entityId: string;
  entityType: "character" | "npc";
  initiative: number;
  entity: {
    name: string;
    hp: number;
    maxHp: number;
    portrait?: string;
  } | null;
}

interface InitiativeTrackerProps {
  combatants: Combatant[];
  currentTurnIndex: number;
  round: number;
  timeRemaining?: number;
  onSelectCombatant?: (index: number) => void;
}

export function InitiativeTracker({
  combatants,
  currentTurnIndex,
  round,
  timeRemaining,
  onSelectCombatant,
}: InitiativeTrackerProps) {
  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className="rounded-lg bg-[var(--card)] border border-[var(--border)] overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2 bg-[var(--background-secondary)] border-b border-[var(--border)] flex items-center justify-between">
        <span className="font-medium text-sm">Round {round}</span>
        {timeRemaining !== undefined && (
          <span
            className={cn(
              "text-sm font-mono",
              timeRemaining < 30000
                ? "text-[var(--accent-red)]"
                : "text-[var(--foreground-secondary)]"
            )}
          >
            {formatTime(timeRemaining)}
          </span>
        )}
      </div>

      {/* Combatant List */}
      <div className="divide-y divide-[var(--border)]">
        {combatants.map((combatant, index) => {
          const isCurrent = index === currentTurnIndex;
          const isDefeated = combatant.entity && combatant.entity.hp <= 0;
          const hpPercent = combatant.entity
            ? (combatant.entity.hp / combatant.entity.maxHp) * 100
            : 0;

          return (
            <div
              key={combatant.entityId}
              className={cn(
                "flex items-center gap-3 px-4 py-2 transition-colors",
                isCurrent && "bg-[var(--accent-gold)]/10",
                isDefeated && "opacity-50",
                onSelectCombatant && "cursor-pointer hover:bg-[var(--background-tertiary)]"
              )}
              onClick={() => onSelectCombatant?.(index)}
            >
              {/* Turn Indicator */}
              <div
                className={cn(
                  "w-2 h-2 rounded-full flex-shrink-0",
                  isCurrent
                    ? "bg-[var(--accent-gold)]"
                    : "bg-[var(--foreground-muted)]"
                )}
              />

              {/* Portrait */}
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold",
                  combatant.entityType === "character"
                    ? "bg-[var(--accent-blue)] text-white"
                    : "bg-[var(--accent-red)] text-white"
                )}
              >
                {combatant.entity?.name?.[0] ?? "?"}
              </div>

              {/* Name and HP */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "text-sm font-medium truncate",
                      isDefeated && "line-through"
                    )}
                  >
                    {combatant.entity?.name ?? "Unknown"}
                  </span>
                  {combatant.entityType === "npc" && (
                    <span className="text-xs text-[var(--foreground-muted)]">
                      NPC
                    </span>
                  )}
                </div>
                {combatant.entity && (
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1.5 rounded-full bg-[var(--background-tertiary)]">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          hpPercent > 50
                            ? "bg-[var(--accent-green)]"
                            : hpPercent > 25
                            ? "bg-[var(--accent-gold)]"
                            : "bg-[var(--accent-red)]"
                        )}
                        style={{ width: `${Math.max(0, hpPercent)}%` }}
                      />
                    </div>
                    <span className="text-xs text-[var(--foreground-muted)] w-12 text-right">
                      {combatant.entity.hp}/{combatant.entity.maxHp}
                    </span>
                  </div>
                )}
              </div>

              {/* Initiative */}
              <div className="text-sm font-mono text-[var(--foreground-secondary)] w-8 text-right">
                {combatant.initiative}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
