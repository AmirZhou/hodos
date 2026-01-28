"use client";

import { useState } from "react";
import { useMutation, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { D20Dice } from "./D20Dice";
import { Check, ChevronUp } from "lucide-react";

interface PendingRoll {
  type: string;
  skill?: string;
  ability: string;
  dc: number;
  reason: string;
  characterId: Id<"characters">;
  actionContext: string;
}

interface RollPromptProps {
  campaignId: Id<"campaigns">;
  sessionId: Id<"gameSessions">;
  pendingRoll: PendingRoll;
  characterName: string;
  modifier: number;
  proficiencyBonus: number;
}

export function RollPrompt({
  campaignId,
  sessionId,
  pendingRoll,
  characterName,
  modifier,
  proficiencyBonus,
}: RollPromptProps) {
  const [rollResult, setRollResult] = useState<{
    naturalRoll: number;
    total: number;
    success: boolean;
    isCritical: boolean;
    isCriticalMiss: boolean;
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const executeRoll = useAction(api.game.actions.executeRoll);

  const handleRoll = async (naturalRoll: number) => {
    setIsProcessing(true);

    try {
      const result = await executeRoll({
        campaignId,
        sessionId,
        characterId: pendingRoll.characterId,
        naturalRoll,
      });

      if (result.rollResult) {
        setRollResult(result.rollResult);
      }
    } catch (e) {
      console.error("Roll failed:", e);
    } finally {
      setIsProcessing(false);
    }
  };

  const skillOrAbility = pendingRoll.skill || pendingRoll.ability;
  const checkName = skillOrAbility.charAt(0).toUpperCase() + skillOrAbility.slice(1);

  return (
    <div className="rounded-xl border-2 border-[var(--accent-gold)]/50 bg-gradient-to-b from-[var(--background-tertiary)] to-[var(--card)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[var(--background-secondary)] border-b border-[var(--border)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[var(--accent-gold)]/20 border border-[var(--accent-gold)] flex items-center justify-center">
            <span className="text-lg font-bold text-[var(--accent-gold)]">
              {characterName[0]}
            </span>
          </div>
          <div>
            <h3 className="font-semibold text-lg">{checkName} Check</h3>
            <div className="flex items-center gap-1 text-sm text-[var(--accent-gold)]">
              <ChevronUp className="h-3 w-3" />
              <span>Bonuses: +{modifier}</span>
              {proficiencyBonus > 0 && (
                <span className="text-[var(--foreground-muted)]">
                  {" "}(+{proficiencyBonus} Proficiency)
                </span>
              )}
            </div>
          </div>
        </div>

        {rollResult && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--accent-green)]/20 text-[var(--accent-green)]">
            <Check className="h-4 w-4" />
            <span className="text-sm font-medium">Rolled</span>
          </div>
        )}
      </div>

      {/* Roll area */}
      <div className="p-6">
        {/* Reason/context */}
        <p className="text-sm text-[var(--foreground-secondary)] mb-6 text-center">
          {pendingRoll.reason}
        </p>

        <div className="flex items-center justify-center gap-8">
          {/* Dice */}
          <D20Dice
            onRoll={handleRoll}
            disabled={!!rollResult || isProcessing}
            size={100}
          />

          {/* DC display */}
          <div className="flex flex-col items-center px-6 py-4 rounded-lg border border-[var(--border)] bg-[var(--background-tertiary)]">
            <span className="text-xs text-[var(--foreground-muted)] uppercase tracking-wider mb-1">
              Difficulty Class
            </span>
            <span className="text-3xl font-bold text-[var(--foreground)]">
              {pendingRoll.dc}
            </span>
          </div>
        </div>

        {/* Result display */}
        {rollResult && (
          <div className="mt-6 text-center">
            {/* Math breakdown */}
            <div className="text-lg text-[var(--foreground-secondary)] mb-2">
              {rollResult.naturalRoll} + {modifier} = {rollResult.total}
            </div>

            {/* Success/Failure */}
            <div
              className={`text-2xl font-bold tracking-wider ${
                rollResult.isCritical
                  ? "text-[var(--accent-green)] animate-pulse"
                  : rollResult.isCriticalMiss
                  ? "text-[var(--accent-red)] animate-pulse"
                  : rollResult.success
                  ? "text-[var(--accent-green)]"
                  : "text-[var(--accent-red)]"
              }`}
            >
              {rollResult.isCritical
                ? "CRITICAL SUCCESS!"
                : rollResult.isCriticalMiss
                ? "CRITICAL FAILURE!"
                : rollResult.success
                ? "SUCCESS!"
                : "FAILURE!"}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
