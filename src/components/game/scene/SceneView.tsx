"use client";

import { useCallback } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { IntensityMeter } from "./IntensityMeter";
import { ParticipantList } from "./ParticipantList";
import { NegotiationPanel } from "./NegotiationPanel";
import { SceneActionMenu } from "./SceneActionMenu";
import { AftercareView } from "./AftercareView";
import { SafewordButton } from "./SafewordButton";
import { TechniqueBar } from "../skills/TechniqueBar";
import { useGame } from "@/components/game/engine";

interface SceneViewProps {
  sessionId: Id<"gameSessions">;
  currentCharacterId?: Id<"characters">;
}

export function SceneView({ sessionId, currentCharacterId }: SceneViewProps) {
  // Queries
  const sceneState = useQuery(api.game.scene.getSceneState, { sessionId });

  // Find current participant index
  const currentParticipantIndex = sceneState?.participants.findIndex(
    (p) => p.entityType === "character" && p.entityId === currentCharacterId
  ) ?? -1;

  const currentParticipant = currentParticipantIndex >= 0
    ? sceneState?.participants[currentParticipantIndex]
    : null;

  // Queries for available actions (only when active)
  const availableActions = useQuery(
    api.game.scene.getAvailableSceneActions,
    sceneState?.phase === "active" && currentParticipantIndex >= 0
      ? { sessionId, participantIndex: currentParticipantIndex }
      : "skip"
  );

  // Mutations
  const negotiateScene = useMutation(api.game.scene.negotiateScene);
  const performSceneAction = useMutation(api.game.scene.performSceneAction);
  const useSafeword = useMutation(api.game.scene.useSafeword);
  const completeAftercare = useMutation(api.game.scene.completeAftercare);

  // Is it my turn?
  const isMyTurn = sceneState?.currentActorIndex === currentParticipantIndex;

  // Handle negotiation submit
  const handleNegotiationSubmit = useCallback(
    async (consent: { consentGiven: boolean; limits: string[]; activities: string[] }) => {
      if (currentParticipantIndex < 0) return;

      await negotiateScene({
        sessionId,
        participantIndex: currentParticipantIndex,
        consent,
      });
    },
    [negotiateScene, sessionId, currentParticipantIndex]
  );

  // Handle scene action
  const handleAction = useCallback(
    async (actionType: string) => {
      if (currentParticipantIndex < 0) return;

      await performSceneAction({
        sessionId,
        actorIndex: currentParticipantIndex,
        actionType: actionType as "tease" | "restrain" | "sensation" | "impact" | "verbal" | "service" | "worship" | "edge" | "deny" | "reward" | "aftercare" | "check_in" | "other",
      });
    },
    [performSceneAction, sessionId, currentParticipantIndex]
  );

  // Handle safeword
  const handleSafeword = useCallback(
    async (level: "yellow" | "red") => {
      if (currentParticipantIndex < 0) return;

      await useSafeword({
        sessionId,
        participantIndex: currentParticipantIndex,
        level,
      });
    },
    [useSafeword, sessionId, currentParticipantIndex]
  );

  // Handle aftercare complete
  const handleAftercareComplete = useCallback(async () => {
    await completeAftercare({ sessionId });
  }, [completeAftercare, sessionId]);

  // Loading state
  if (!sceneState) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-[var(--foreground-secondary)]">Loading scene...</p>
      </div>
    );
  }

  // Negotiation phase
  if (sceneState.phase === "negotiation") {
    const needsToNegotiate = currentParticipant && !currentParticipant.consentGiven;

    return (
      <div className="flex gap-4">
        {/* Main area */}
        <div className="flex-1">
          {needsToNegotiate ? (
            <NegotiationPanel
              participantName={currentParticipant.entity?.name ?? "You"}
              availableActivities={[
                "tease", "verbal", "service", "restrain", "sensation",
                "worship", "impact", "edge", "deny", "reward"
              ]}
              onSubmit={handleNegotiationSubmit}
            />
          ) : (
            <div className="rounded-lg bg-[var(--card)] border border-[var(--border)] p-6 text-center">
              <h2 className="text-lg font-bold mb-2">Waiting for Consent</h2>
              <p className="text-[var(--foreground-secondary)]">
                Waiting for all participants to complete negotiation...
              </p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-64">
          <ParticipantList
            participants={sceneState.participants}
            currentActorIndex={sceneState.currentActorIndex}
            phase={sceneState.phase}
          />
        </div>
      </div>
    );
  }

  // Aftercare phase
  if (sceneState.phase === "aftercare") {
    return (
      <div className="flex gap-4">
        {/* Main area */}
        <div className="flex-1">
          <AftercareView
            peakIntensity={sceneState.peakIntensity}
            safewordUsed={sceneState.usedSafeword}
            participantNames={sceneState.participants
              .map((p) => p.entity?.name ?? "Unknown")
              .filter(Boolean)}
            onComplete={handleAftercareComplete}
          />
        </div>

        {/* Sidebar */}
        <div className="w-64">
          <ParticipantList
            participants={sceneState.participants}
            currentActorIndex={sceneState.currentActorIndex}
            phase={sceneState.phase}
          />
        </div>
      </div>
    );
  }

  // Active scene
  return (
    <div className="flex gap-4">
      {/* Main area */}
      <div className="flex-1 space-y-4">
        {/* Intensity meter */}
        <div className="rounded-lg bg-[var(--card)] border border-[var(--border)] p-4">
          <IntensityMeter
            intensity={sceneState.intensity}
            peakIntensity={sceneState.peakIntensity}
            mood={sceneState.mood}
            size="lg"
          />
        </div>

        {/* Action menu */}
        {availableActions && currentParticipant && (
          <SceneActionMenu
            availableActions={availableActions.actions}
            currentIntensity={sceneState.intensity}
            role={currentParticipant.role}
            isMyTurn={isMyTurn}
            onAction={handleAction}
          />
        )}
      </div>

      {/* Sidebar */}
      <div className="w-64 space-y-4">
        <ParticipantList
          participants={sceneState.participants}
          currentActorIndex={sceneState.currentActorIndex}
          phase={sceneState.phase}
        />

        {/* Inline safeword buttons */}
        <div className="rounded-lg bg-[var(--card)] border border-[var(--border)] p-4">
          <p className="text-xs text-[var(--foreground-muted)] text-center mb-3">
            Safeword (always available)
          </p>
          <SafewordButton
            variant="inline"
            onSafeword={handleSafeword}
          />
        </div>
      </div>

      {/* Floating safeword button */}
      <SafewordButton
        variant="floating"
        onSafeword={handleSafeword}
      />
    </div>
  );
}
