"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { CombatGrid } from "./CombatGrid";
import { InitiativeTracker } from "./InitiativeTracker";
import { ActionBar } from "./ActionBar";
import { TechniqueBar } from "../skills/TechniqueBar";
import { useGame } from "@/components/game/engine";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface CombatViewProps {
  sessionId: Id<"gameSessions">;
  currentCharacterId?: Id<"characters">;
  gridWidth?: number;
  gridHeight?: number;
}

export function CombatView({
  sessionId,
  currentCharacterId,
  gridWidth = 12,
  gridHeight = 8,
}: CombatViewProps) {
  const { campaignId } = useGame();
  const [selectedCombatantIndex, setSelectedCombatantIndex] = useState<number | null>(null);
  const [isMoving, setIsMoving] = useState(false);

  // Queries
  const combatState = useQuery(api.game.combat.getCombatState, { sessionId });
  const currentTurn = useQuery(api.game.combat.getCurrentTurn, { sessionId });

  // Mutations
  const executeAction = useMutation(api.game.combat.executeAction);
  const move = useMutation(api.game.combat.move);
  const endTurn = useMutation(api.game.combat.endTurn);
  const useSafeword = useMutation(api.game.combat.useSafeword);

  // Determine if it's the current user's turn
  const isMyTurn = useCallback(() => {
    if (!combatState || !currentCharacterId || currentTurn === null) return false;
    const currentCombatant = combatState.combatants[combatState.currentTurnIndex];
    return (
      currentCombatant?.entityType === "character" &&
      currentCombatant?.entityId === currentCharacterId
    );
  }, [combatState, currentCharacterId, currentTurn]);

  const currentCombatant = combatState?.combatants[combatState.currentTurnIndex];

  // Handle cell click (for movement)
  const handleCellClick = useCallback(
    async (position: { x: number; y: number }) => {
      if (!isMoving || selectedCombatantIndex === null || !combatState) return;

      const combatant = combatState.combatants[selectedCombatantIndex];
      if (!combatant) return;

      // Create simple path (just start and end for now)
      const path = [combatant.position, position];

      try {
        await move({
          sessionId,
          combatantIndex: selectedCombatantIndex,
          path,
        });
        setIsMoving(false);
      } catch (error) {
        console.error("Move failed:", error);
      }
    },
    [isMoving, selectedCombatantIndex, combatState, move, sessionId]
  );

  // Handle combatant click
  const handleCombatantClick = useCallback(
    (index: number) => {
      setSelectedCombatantIndex(index);
      setIsMoving(false);
    },
    []
  );

  // Handle action
  const handleAction = useCallback(
    async (actionType: string) => {
      if (!isMyTurn()) return;

      try {
        await executeAction({
          sessionId,
          action: {
            type: actionType as "attack" | "spell" | "dodge" | "disengage" | "dash" | "help" | "hide" | "ready" | "use_item" | "other",
            targetIndex: selectedCombatantIndex !== combatState?.currentTurnIndex
              ? selectedCombatantIndex ?? undefined
              : undefined,
          },
        });
      } catch (error) {
        console.error("Action failed:", error);
      }
    },
    [isMyTurn, executeAction, sessionId, selectedCombatantIndex, combatState]
  );

  // Handle end turn
  const handleEndTurn = useCallback(async () => {
    if (!isMyTurn()) return;

    try {
      await endTurn({ sessionId });
    } catch (error) {
      console.error("End turn failed:", error);
    }
  }, [isMyTurn, endTurn, sessionId]);

  // Handle move toggle
  const handleMoveToggle = useCallback(() => {
    if (!isMyTurn()) return;
    setSelectedCombatantIndex(combatState?.currentTurnIndex ?? null);
    setIsMoving((prev) => !prev);
  }, [isMyTurn, combatState]);

  // Handle safeword
  const handleSafeword = useCallback(
    async (level: "yellow" | "red") => {
      try {
        await useSafeword({ sessionId, level });
      } catch (error) {
        console.error("Safeword failed:", error);
      }
    },
    [useSafeword, sessionId]
  );

  // Loading state
  if (!combatState) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-[var(--foreground-secondary)]">Loading combat...</p>
      </div>
    );
  }

  // Initiative rolling phase
  if (combatState.phase === "rolling_initiative") {
    return (
      <div className="space-y-4">
        <div className="rounded-lg bg-[var(--card)] border border-[var(--border)] p-6 text-center">
          <h2 className="text-xl font-bold mb-2">Rolling Initiative</h2>
          <p className="text-[var(--foreground-secondary)]">
            Waiting for all combatants to roll initiative...
          </p>
        </div>
        <InitiativeTracker
          combatants={combatState.combatants}
          currentTurnIndex={0}
          round={0}
        />
      </div>
    );
  }

  return (
    <div className="flex gap-4">
      {/* Main combat area */}
      <div className="flex-1 space-y-4">
        {/* Combat grid */}
        <CombatGrid
          width={gridWidth}
          height={gridHeight}
          combatants={combatState.combatants}
          currentTurnIndex={combatState.currentTurnIndex}
          selectedCombatantIndex={selectedCombatantIndex}
          isMoving={isMoving}
          onCellClick={handleCellClick}
          onCombatantClick={handleCombatantClick}
        />

        {/* Action bar */}
        {currentCombatant && (
          <ActionBar
            hasAction={currentCombatant.hasAction}
            hasBonusAction={currentCombatant.hasBonusAction}
            hasReaction={currentCombatant.hasReaction}
            movementRemaining={currentCombatant.movementRemaining}
            isMyTurn={isMyTurn()}
            onAction={handleAction}
            onEndTurn={handleEndTurn}
            onMove={handleMoveToggle}
            isMoving={isMoving}
          />
        )}
      </div>

      {/* Sidebar */}
      <div className="w-64 space-y-4">
        {/* Initiative tracker */}
        <InitiativeTracker
          combatants={combatState.combatants}
          currentTurnIndex={combatState.currentTurnIndex}
          round={combatState.round}
          timeRemaining={currentTurn?.timeRemaining}
          onSelectCombatant={handleCombatantClick}
        />

        {/* Safeword buttons */}
        <div className="rounded-lg bg-[var(--card)] border border-[var(--border)] p-4 space-y-2">
          <p className="text-xs text-[var(--foreground-secondary)] text-center mb-2">
            Safeword (ends combat)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 border-[var(--accent-gold)] text-[var(--accent-gold)] hover:bg-[var(--accent-gold)]/10"
              onClick={() => handleSafeword("yellow")}
            >
              <AlertTriangle className="h-4 w-4 mr-1" />
              Yellow
            </Button>
            <Button
              variant="outline"
              className="flex-1 border-[var(--accent-red)] text-[var(--accent-red)] hover:bg-[var(--accent-red)]/10"
              onClick={() => handleSafeword("red")}
            >
              <AlertTriangle className="h-4 w-4 mr-1" />
              Red
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
