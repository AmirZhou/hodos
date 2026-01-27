"use client";

import {
  createContext,
  useContext,
  ReactNode,
  useMemo,
} from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useAuth } from "@/components/providers/auth-provider";
import { usePresence } from "./usePresence";
import { useGameState, GameState } from "./useGameState";

interface GameContextType {
  // Campaign info
  campaignId: Id<"campaigns">;
  campaign: {
    _id: Id<"campaigns">;
    name: string;
    status: "lobby" | "active" | "paused" | "completed";
  } | null;

  // Current user info
  userId: Id<"users"> | null;
  currentCharacter: {
    _id: Id<"characters">;
    name: string;
    hp: number;
    maxHp: number;
    portrait?: string;
    level: number;
    xp: number;
    ac: number;
    speed: number;
    proficiencyBonus: number;
    class?: string;
    background?: string;
    abilities: {
      strength: number;
      dexterity: number;
      constitution: number;
      intelligence: number;
      wisdom: number;
      charisma: number;
    };
  } | null;

  // Game state (from useGameState)
  gameState: GameState;

  // Session controls
  startSession: () => Promise<void>;
  endSession: () => Promise<void>;

  // Loading states
  isLoading: boolean;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

interface GameProviderProps {
  children: ReactNode;
  campaignId: Id<"campaigns">;
}

export function GameProvider({ children, campaignId }: GameProviderProps) {
  const { user } = useAuth();
  const userId = user?._id ?? null;

  // Fetch campaign data
  const campaign = useQuery(
    api.campaigns.get,
    campaignId ? { id: campaignId } : "skip"
  );

  // Fetch current user's membership and character
  const membership = useQuery(
    api.campaigns.getMembership,
    userId && campaignId ? { campaignId, userId } : "skip"
  );

  const character = useQuery(
    api.characters.get,
    membership?.characterId ? { characterId: membership.characterId } : "skip"
  );

  // Game state subscription
  const gameState = useGameState({ campaignId });

  // Presence heartbeat
  usePresence({
    campaignId,
    userId: userId!,
    enabled: !!userId,
  });

  // Session mutations
  const startSessionMutation = useMutation(api.game.session.start);
  const endSessionMutation = useMutation(api.game.session.end);

  const startSession = async () => {
    await startSessionMutation({
      campaignId,
      mode: "exploration",
    });
  };

  const endSession = async () => {
    if (gameState.sessionId) {
      await endSessionMutation({ sessionId: gameState.sessionId });
    }
  };

  const isLoading =
    campaign === undefined ||
    (userId && membership === undefined) ||
    gameState.isLoading;

  const value = useMemo<GameContextType>(
    () => ({
      campaignId,
      campaign: campaign
        ? {
            _id: campaign._id,
            name: campaign.name,
            status: campaign.status,
          }
        : null,
      userId,
      currentCharacter: character
        ? {
            _id: character._id,
            name: character.name,
            hp: character.hp,
            maxHp: character.maxHp,
            portrait: character.portrait,
            level: character.level,
            xp: character.xp,
            ac: character.ac,
            speed: character.speed,
            proficiencyBonus: character.proficiencyBonus,
            class: character.class,
            background: character.background,
            abilities: character.abilities,
          }
        : null,
      gameState,
      startSession,
      endSession,
      isLoading,
    }),
    [
      campaignId,
      campaign,
      userId,
      character,
      gameState,
      isLoading,
    ]
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error("useGame must be used within a GameProvider");
  }
  return context;
}
