"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useGame } from "@/components/game/engine";
import { CombatView } from "@/components/game/combat";
import { SceneView } from "@/components/game/scene";
import { MovementLogEntry } from "@/components/game/exploration/MovementLogEntry";
import { RollPrompt } from "@/components/game/dice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Send,
  Mic,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  Edit3,
  Loader2,
} from "lucide-react";

export function GameModeRouter({
  characterId,
  onNpcNameClick,
}: {
  characterId?: Id<"characters">;
  onNpcNameClick?: (npcId: Id<"npcs">) => void;
}) {
  const { gameState } = useGame();

  if (gameState.isInCombat && gameState.sessionId) {
    return (
      <div className="flex-1 overflow-y-auto p-4 lg:p-6">
        <CombatView
          sessionId={gameState.sessionId}
          currentCharacterId={characterId}
        />
      </div>
    );
  }

  if (gameState.isInScene && gameState.sessionId) {
    return (
      <div className="flex-1 overflow-y-auto p-4 lg:p-6">
        <SceneView
          sessionId={gameState.sessionId}
          currentCharacterId={characterId}
        />
      </div>
    );
  }

  return (
    <ExplorationView
      onNpcNameClick={onNpcNameClick}
    />
  );
}

interface GameLogEntry {
  _id: Id<"gameLog">;
  type: "narration" | "dialogue" | "action" | "roll" | "system" | "ooc" | "movement";
  content?: string;
  contentEn?: string;
  actorName?: string;
  actorId?: string;
  actorType?: "dm" | "character" | "npc";
  movementData?: {
    from: { x: number; y: number };
    to: { x: number; y: number };
  };
  roll?: {
    type: string;
    dice: string;
    result: number;
    dc?: number;
    success?: boolean;
  };
}

function ExplorationView({
  onNpcNameClick,
}: {
  onNpcNameClick?: (npcId: Id<"npcs">) => void;
}) {
  const { gameState, currentCharacter, campaign } = useGame();
  const [input, setInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  const pendingRoll = gameState.session?.pendingRoll;

  const getRollModifier = () => {
    if (!pendingRoll || !currentCharacter) return { modifier: 0, proficiencyBonus: 0 };

    const abilities = currentCharacter.abilities;
    const abilityKey = pendingRoll.ability.toLowerCase() as keyof typeof abilities;
    const abilityScore = abilities[abilityKey] ?? 10;
    const abilityMod = Math.floor((abilityScore - 10) / 2);

    const proficiencyBonus = currentCharacter.proficiencyBonus ?? 2;
    const skills = (currentCharacter as { skills?: string[] }).skills ?? [];
    const isProficient = pendingRoll.skill ? skills.includes(pendingRoll.skill.toLowerCase()) : false;

    const totalModifier = abilityMod + (isProficient ? proficiencyBonus : 0);

    return {
      modifier: totalModifier,
      proficiencyBonus: isProficient ? proficiencyBonus : 0
    };
  };

  const { modifier: rollModifier, proficiencyBonus: rollProfBonus } = getRollModifier();

  const submitAction = useAction(api.game.actions.submitAction);
  const submitQuickAction = useAction(api.game.actions.submitQuickAction);

  const relationships = useQuery(
    api.relationships.getForCharacter,
    currentCharacter?._id ? { characterId: currentCharacter._id } : "skip"
  );
  const npcNameToId: Record<string, Id<"npcs">> = {};
  if (relationships) {
    for (const rel of relationships) {
      if (rel.npc?.name) {
        npcNameToId[rel.npc.name] = rel.npcId;
      }
    }
  }

  const handleSubmit = async (text: string) => {
    if (!text.trim() || !currentCharacter || !campaign || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await submitAction({
        campaignId: campaign._id,
        characterId: currentCharacter._id,
        input: text.trim(),
      });
      setInput("");
    } catch (error) {
      console.error("Failed to submit action:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickAction = async (label: string) => {
    if (!currentCharacter || !campaign || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await submitQuickAction({
        campaignId: campaign._id,
        characterId: currentCharacter._id,
        actionType: label.toLowerCase().replace(/\s+/g, "_"),
        actionText: label,
      });
    } catch (error) {
      console.error("Failed to submit quick action:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [gameState.gameLog.length]);

  return (
    <>
      {/* Game Log */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-6">
        <div className="mx-auto max-w-5xl space-y-6">
          {gameState.gameLog.length === 0 ? (
            <div className="text-center py-12 text-[var(--foreground-muted)]">
              <p>The adventure begins...</p>
              <p className="text-sm mt-2">Type an action or wait for the DM.</p>
            </div>
          ) : (
            gameState.gameLog.map((entry) => (
              <LogEntry
                key={entry._id}
                entry={entry}
                onNpcNameClick={onNpcNameClick && entry.actorType === "npc" && entry.actorName && npcNameToId[entry.actorName]
                  ? () => onNpcNameClick(npcNameToId[entry.actorName!])
                  : undefined}
              />
            ))
          )}

          {pendingRoll && campaign && gameState.sessionId && currentCharacter && (
            <RollPrompt
              campaignId={campaign._id}
              sessionId={gameState.sessionId}
              pendingRoll={pendingRoll as {
                type: string;
                skill?: string;
                ability: string;
                dc: number;
                reason: string;
                characterId: Id<"characters">;
                actionContext: string;
              }}
              characterName={currentCharacter.name}
              modifier={rollModifier}
              proficiencyBonus={rollProfBonus}
            />
          )}

          <div ref={logEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-[var(--border)] bg-[var(--background-secondary)] p-4">
        <div className="mx-auto max-w-3xl">
          {/* Quick Actions */}
          <div className="mb-3 flex flex-wrap gap-2">
            {gameState.session?.suggestedActions && gameState.session.suggestedActions.length > 0 ? (
              gameState.session.suggestedActions.map((action, i) => (
                <QuickAction key={i} label={action.text || action.en || ""} onClick={handleQuickAction} disabled={isSubmitting} />
              ))
            ) : (
              <>
                <QuickAction label="Look around" onClick={handleQuickAction} disabled={isSubmitting} />
                <QuickAction label="Talk to..." onClick={handleQuickAction} disabled={isSubmitting} />
                <QuickAction label="Investigate" onClick={handleQuickAction} disabled={isSubmitting} />
                <QuickAction label="Rest" onClick={handleQuickAction} disabled={isSubmitting} />
              </>
            )}
          </div>

          {/* Input */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                placeholder="What do you do? / Que faites-vous ?"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="pr-20"
                disabled={isSubmitting}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && input.trim() && !isSubmitting) {
                    handleSubmit(input);
                  }
                }}
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" disabled={isSubmitting}>
                  <Mic className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <Button disabled={!input.trim() || isSubmitting} onClick={() => handleSubmit(input)}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>

          <p className="mt-2 text-xs text-[var(--foreground-muted)] text-center">
            Type anything or choose a quick action. The AI DM will respond.
          </p>
        </div>
      </div>
    </>
  );
}

function LogEntry({
  entry,
  onNpcNameClick,
}: {
  entry: GameLogEntry;
  onNpcNameClick?: () => void;
}) {
  const { gameState } = useGame();

  if (entry.type === "movement" && entry.movementData && gameState.sessionId) {
    return (
      <MovementLogEntry
        sessionId={gameState.sessionId}
        characterId={entry.actorId ?? ""}
        actorName={entry.actorName}
        movementData={entry.movementData}
      />
    );
  }

  const isPlayerAction = entry.actorType === "character";
  const isRoll = entry.type === "roll";
  const isDialogue = entry.type === "dialogue";

  const contentBlock = (
    <>
      <div
        className={`rounded-lg p-4 ${
          isPlayerAction
            ? "bg-[var(--accent-gold)]/10 border border-[var(--accent-gold)]/30"
            : isRoll
            ? "bg-[var(--accent-purple)]/10 border border-[var(--accent-purple)]/30"
            : isDialogue
            ? "bg-[var(--background-tertiary)] border-l-2 border-[var(--accent-blue)]"
            : "bg-[var(--card)]"
        }`}
      >
        {isRoll && entry.roll && (
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-lg bg-[var(--accent-purple)] flex items-center justify-center text-white font-bold">
                {entry.roll.result}
              </div>
              <div>
                <div className="text-sm font-medium">{entry.content || entry.contentEn || ""}</div>
                <div className="text-xs text-[var(--foreground-muted)]">
                  {entry.roll.dice}
                  {entry.roll.dc && ` vs DC ${entry.roll.dc}`}
                </div>
              </div>
            </div>
            {entry.roll.success !== undefined && (
              <span
                className={`ml-auto px-2 py-1 rounded text-xs font-medium ${
                  entry.roll.success
                    ? "bg-[var(--accent-green)]/20 text-[var(--accent-green)]"
                    : "bg-[var(--accent-red)]/20 text-[var(--accent-red)]"
                }`}
              >
                {entry.roll.success ? "Success" : "Failure"}
              </span>
            )}
          </div>
        )}

        {!isRoll && (
          <div className="space-y-2">
            <p className="text-[var(--foreground)] leading-relaxed">
              {entry.content || entry.contentEn || ""}
            </p>
          </div>
        )}
      </div>

      {!isPlayerAction && !isRoll && (
        <div className="mt-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <ThumbsUp className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <ThumbsDown className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <RefreshCw className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <Edit3 className="h-3 w-3" />
          </Button>
        </div>
      )}
    </>
  );

  return (
    <div className={`group ${isPlayerAction ? "pl-8" : ""}`}>
      {!isPlayerAction && entry.actorName && (
        <div className="mb-1 flex items-center gap-2">
          <span
            className={`text-sm font-medium text-[var(--foreground-secondary)] ${onNpcNameClick ? "cursor-pointer hover:text-[var(--accent-gold)] hover:underline" : ""}`}
            onClick={onNpcNameClick}
          >
            {entry.actorName}
          </span>
          {entry.type === "narration" && (
            <span className="text-xs text-[var(--foreground-muted)]">
              Narration
            </span>
          )}
        </div>
      )}

      {contentBlock}
    </div>
  );
}

function QuickAction({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: (label: string) => void;
  disabled?: boolean;
}) {
  return (
    <button
      className="px-3 py-1.5 rounded-full border border-[var(--border)] bg-[var(--card)] hover:border-[var(--accent-gold)] hover:bg-[var(--accent-gold)]/10 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
      onClick={() => onClick(label)}
      disabled={disabled}
    >
      <span>{label}</span>
    </button>
  );
}
