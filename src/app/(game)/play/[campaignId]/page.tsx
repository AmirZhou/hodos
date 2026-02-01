"use client";

import { useState, use } from "react";
import { Id } from "../../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { GameProvider, useGame } from "@/components/game/engine";
import { SafewordButton } from "@/components/game/scene";
import { GameHeader } from "@/components/game/header/GameHeader";
import { GameModeRouter } from "@/components/game/layout/GameModeRouter";
import { MapPanel } from "@/components/game/layout/MapPanel";
import { GameSidebar } from "@/components/game/sidebar/GameSidebar";
import { GameErrorBoundary } from "@/components/game/GameErrorBoundary";
import { NpcInteractionModal } from "@/components/game/npc/NpcInteractionModal";
import { InventoryModal } from "@/components/game/equipment/InventoryModal";
import { CharacterSheetModal } from "@/components/game/equipment/CharacterSheetModal";
import { TradeBoardModal } from "@/components/game/trade/TradeBoardModal";
import { Play, Loader2 } from "lucide-react";

export default function GameplayPage({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId: campaignIdParam } = use(params);
  const campaignId = campaignIdParam as Id<"campaigns">;

  return (
    <GameProvider campaignId={campaignId}>
      <GameplayContent campaignId={campaignId} />
    </GameProvider>
  );
}

function GameplayContent({ campaignId }: { campaignId: Id<"campaigns"> }) {
  const {
    campaign,
    currentCharacter,
    gameState,
    isLoading,
    startSession,
  } = useGame();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedNpcId, setSelectedNpcId] = useState<Id<"npcs"> | null>(null);
  const [showInventory, setShowInventory] = useState(false);
  const [showCharSheet, setShowCharSheet] = useState(false);
  const [showTradeBoard, setShowTradeBoard] = useState(false);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--background)]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-[var(--accent-gold)]" />
          <p className="text-[var(--foreground-secondary)]">Loading game...</p>
        </div>
      </div>
    );
  }

  if (!gameState.hasActiveSession) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--background)]">
        <div className="text-center space-y-6 max-w-md">
          <h1 className="text-2xl font-bold">{campaign?.name ?? "Game"}</h1>
          <p className="text-[var(--foreground-secondary)]">
            No active game session. Start a new session to begin playing.
          </p>
          <Button onClick={startSession} size="lg" className="gap-2">
            <Play className="h-5 w-5" />
            Start Session
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[var(--background)]">
      {/* Main Game Area */}
      <div className="flex flex-1 flex-col min-w-0">
        <GameHeader
          campaignName={campaign?.name ?? "Game"}
          onToggleMap={() => {}}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onlinePlayers={gameState.onlinePlayers}
          sessionId={gameState.sessionId}
          llmProvider={gameState.session?.llmProvider}
        />

        <GameErrorBoundary fallbackLabel="Game View">
          <GameModeRouter
            characterId={currentCharacter?._id}
            onNpcNameClick={setSelectedNpcId}
          />
        </GameErrorBoundary>
      </div>

      {/* Right Panel */}
      {sidebarOpen && (
        <aside className="hidden w-[480px] flex-shrink-0 border-l border-[var(--border)] bg-[var(--background-secondary)] lg:flex lg:flex-col overflow-y-auto">
          <GameErrorBoundary fallbackLabel="Map">
            <MapPanel
              campaignId={campaignId}
              sessionId={gameState.sessionId}
              currentLocationId={gameState.locationId}
              currentCharacterId={currentCharacter?._id}
              currentCharacterName={currentCharacter?.name}
              navigationMode={gameState.navigationMode as "world" | "city" | "location" | undefined}
              currentMapId={gameState.currentMapId}
            />
          </GameErrorBoundary>

          <GameErrorBoundary fallbackLabel="Sidebar">
            <GameSidebar
              campaignId={campaignId}
              onNpcClick={setSelectedNpcId}
              onOpenCharSheet={() => setShowCharSheet(true)}
              onOpenInventory={() => setShowInventory(true)}
              onOpenTradeBoard={() => setShowTradeBoard(true)}
            />
          </GameErrorBoundary>
        </aside>
      )}

      {/* Modals */}
      {selectedNpcId && currentCharacter && (
        <NpcInteractionModal
          npcId={selectedNpcId}
          characterId={currentCharacter._id}
          campaignId={campaignId}
          onClose={() => setSelectedNpcId(null)}
        />
      )}

      {showInventory && currentCharacter && (
        <InventoryModal
          characterId={currentCharacter._id}
          onClose={() => setShowInventory(false)}
        />
      )}

      {showCharSheet && currentCharacter && (
        <CharacterSheetModal
          characterId={currentCharacter._id}
          onClose={() => setShowCharSheet(false)}
        />
      )}

      {showTradeBoard && currentCharacter && (
        <TradeBoardModal
          campaignId={campaignId}
          characterId={currentCharacter._id}
          onClose={() => setShowTradeBoard(false)}
        />
      )}

      {gameState.isInScene && (
        <SafewordButton
          variant="floating"
          onSafeword={() => {}}
          disabled
        />
      )}
    </div>
  );
}
