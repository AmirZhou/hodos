"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

interface UseGameStateOptions {
  campaignId: Id<"campaigns">;
}

export function useGameState({ campaignId }: UseGameStateOptions) {
  // Get the current active session
  const session = useQuery(api.game.session.getCurrent, { campaignId });

  // Get online players
  const onlinePlayers = useQuery(api.presence.getOnlinePlayers, { campaignId });

  // Get game log
  const gameLog = useQuery(api.game.log.getRecent, {
    campaignId,
    limit: 50
  });

  // Computed state
  const isLoading = session === undefined;
  const hasActiveSession = session !== null && session !== undefined;
  const currentMode = session?.mode ?? "exploration";
  const isInCombat = currentMode === "combat" && session?.combat !== undefined;
  const isInScene = currentMode === "scene" && session?.scene !== undefined;

  // Exploration state
  const hasExplorationGrid = !!session?.explorationPositions && Object.keys(session.explorationPositions).length > 0;

  return {
    // Session data
    session,
    sessionId: session?._id,
    currentMode,
    locationId: session?.locationId,

    // City / map navigation
    navigationMode: session?.navigationMode as "world" | "city" | "location" | undefined,
    currentMapId: session?.currentMapId,

    // Combat state
    combat: session?.combat,
    isInCombat,

    // Scene state
    scene: session?.scene,
    isInScene,

    // Exploration state
    hasExplorationGrid,

    // Multiplayer
    onlinePlayers: onlinePlayers ?? [],
    playerCount: onlinePlayers?.length ?? 0,

    // Game log
    gameLog: gameLog ?? [],

    // Status
    isLoading,
    hasActiveSession,
    sessionStatus: session?.status,
  };
}

export type GameState = ReturnType<typeof useGameState>;
