"use client";

import { useState, useRef, useEffect, use, useCallback } from "react";
import { useQuery, useAction, useMutation } from "convex/react";
import Link from "next/link";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GameProvider, useGame } from "@/components/game/engine";
import { CombatView } from "@/components/game/combat";
import { SceneView, SafewordButton } from "@/components/game/scene";
import { ExplorationGrid } from "@/components/game/exploration/ExplorationGrid";
import { MovementLogEntry } from "@/components/game/exploration/MovementLogEntry";
import { RollPrompt } from "@/components/game/dice";
import { ModelSelector } from "@/components/game/settings";
import { LocationGraph } from "@/components/game/map";
import { AnalysisPanel } from "@/components/learning";
import { EquipmentPanel } from "@/components/game/equipment/EquipmentPanel";
import { NpcInteractionModal } from "@/components/game/npc/NpcInteractionModal";
import {
  Send,
  Mic,
  Users,
  Map,
  BookOpen,
  Heart,
  ChevronRight,
  Globe,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  Edit3,
  Play,
  Loader2,
  Shield,
  Zap,
  Target,
  ChevronDown,
  ChevronUp,
  Package,
  Crown,
  Shirt,
  Hand,
  Footprints,
  CircleDot,
  Gem,
  Sword,
  Scroll,
  X,
  MapPin,
} from "lucide-react";
import { InventoryModal } from "@/components/game/equipment/InventoryModal";
import { CharacterSheetModal } from "@/components/game/equipment/CharacterSheetModal";
import {
  getRarityColor, RARITY_BORDER_COLORS, RARITY_BG_COLORS,
  getSlotLabel, formatStatValue,
} from "@/lib/equipment";

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
    userId,
  } = useGame();

  const seedMutation = useMutation(api.game.seedTestScenario.seedTestScenario);
  const [seeding, setSeeding] = useState(false);
  const [seeded, setSeeded] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<"bdsm-dungeon" | "foot-fetish-spa" | "servant-serving" | "mid-scene">("foot-fetish-spa");

  // Auto-seed if campaign has a seedScenario and no active session yet
  useEffect(() => {
    const seedScenario = (campaign as { seedScenario?: string } | null)?.seedScenario;
    if (
      !seeding &&
      !seeded &&
      seedScenario &&
      currentCharacter &&
      !gameState.hasActiveSession
    ) {
      setSeeding(true);
      seedMutation({
        campaignId,
        characterId: currentCharacter._id,
        scenario: seedScenario as "bdsm-dungeon" | "foot-fetish-spa" | "servant-serving" | "mid-scene",
      })
        .then(() => setSeeded(true))
        .catch((err) => console.error("Auto-seed failed:", err))
        .finally(() => setSeeding(false));
    }
  }, [(campaign as { seedScenario?: string } | null)?.seedScenario, currentCharacter, gameState.hasActiveSession, seeding, seeded, campaignId, seedMutation]);

  const [showFrench, setShowFrench] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showMap, setShowMap] = useState(false);
  const [savedEntries, setSavedEntries] = useState<Set<string>>(new Set());
  const [selectedNpcId, setSelectedNpcId] = useState<Id<"npcs"> | null>(null);
  const [showInventory, setShowInventory] = useState(false);
  const [showCharSheet, setShowCharSheet] = useState(false);

  const saveToNotebook = useMutation(api.notebook.save);

  const handleSaveEntry = useCallback(
    async (entry: GameLogEntry) => {
      if (!userId) return;

      try {
        await saveToNotebook({
          userId,
          frenchText: "",
          englishText: entry.content,
          grammarNotes: [],
          vocabularyItems: [],
          usageNote: "",
          gameLogId: entry._id,
          campaignId,
          sceneSummary: entry.actorName
            ? `${entry.actorName}: ${entry.content.slice(0, 100)}`
            : entry.content.slice(0, 100),
          tags: [],
        });
        setSavedEntries((prev) => new Set(prev).add(entry._id));
      } catch (error) {
        console.error("Failed to save to notebook:", error);
      }
    },
    [userId, campaignId, saveToNotebook]
  );

  // Loading state
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

  // Auto-seeding in progress
  if (seeding) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--background)]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-[var(--accent-gold)]" />
          <p className="text-[var(--foreground-secondary)]">Preparing scenario...</p>
        </div>
      </div>
    );
  }

  // No active session - show start button
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
          {currentCharacter && (
            <div className="flex flex-col items-center gap-3">
              <select
                value={selectedScenario}
                onChange={(e) => setSelectedScenario(e.target.value as typeof selectedScenario)}
                className="rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
              >
                <option value="foot-fetish-spa">Foot Fetish Spa</option>
                <option value="bdsm-dungeon">BDSM Dungeon</option>
                <option value="servant-serving">Devoted Servant</option>
                <option value="mid-scene">In Medias Res</option>
              </select>
              <Button
                variant="outline"
                size="lg"
                className="gap-2"
                disabled={seeding}
                onClick={async () => {
                  setSeeding(true);
                  try {
                    await seedMutation({
                      campaignId,
                      characterId: currentCharacter._id,
                      scenario: selectedScenario,
                    });
                  } finally {
                    setSeeding(false);
                  }
                }}
              >
                {seeding ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Zap className="h-5 w-5" />
                )}
                Seed Test Scenario
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[var(--background)]">
      {/* Main Game Area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top Bar */}
        <GameHeader
          campaignName={campaign?.name ?? "Game"}
          showFrench={showFrench}
          onToggleFrench={() => setShowFrench(!showFrench)}
          onToggleMap={() => setShowMap(!showMap)}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onlinePlayers={gameState.onlinePlayers}
          sessionId={gameState.sessionId}
          llmProvider={gameState.session?.llmProvider}
        />

        {/* Main Content - Mode Router */}
        <GameModeRouter
          showFrench={showFrench}
          characterId={currentCharacter?._id}
          onSaveEntry={handleSaveEntry}
          savedEntries={savedEntries}
          onNpcNameClick={setSelectedNpcId}
        />
      </div>

      {/* Right Panel — Map + Character Info (always visible on lg) */}
      {sidebarOpen && (
        <aside className="hidden w-[480px] flex-shrink-0 border-l border-[var(--border)] bg-[var(--background-secondary)] lg:flex lg:flex-col overflow-y-auto">
          {/* Map Panel (Location / World tabs) */}
          <MapPanel
            campaignId={campaignId}
            sessionId={gameState.sessionId}
            currentLocationId={gameState.locationId}
            currentCharacterId={currentCharacter?._id}
            currentCharacterName={currentCharacter?.name}
          />

          {/* Character & World Info below the map */}
          <GameSidebar
            campaignId={campaignId}
            onNpcClick={setSelectedNpcId}
            onOpenCharSheet={() => setShowCharSheet(true)}
            onOpenInventory={() => setShowInventory(true)}
          />
        </aside>
      )}

      {/* NPC Interaction Modal */}
      {selectedNpcId && currentCharacter && (
        <NpcInteractionModal
          npcId={selectedNpcId}
          characterId={currentCharacter._id}
          campaignId={campaignId}
          onClose={() => setSelectedNpcId(null)}
        />
      )}

      {/* Inventory Modal */}
      {showInventory && currentCharacter && (
        <InventoryModal
          characterId={currentCharacter._id}
          onClose={() => setShowInventory(false)}
        />
      )}

      {/* Character Sheet Modal */}
      {showCharSheet && currentCharacter && (
        <CharacterSheetModal
          characterId={currentCharacter._id}
          onClose={() => setShowCharSheet(false)}
        />
      )}

      {/* Global Safeword Button (always visible during scene) */}
      {gameState.isInScene && (
        <SafewordButton
          variant="floating"
          onSafeword={() => {
            // Handled by SceneView
          }}
          disabled
        />
      )}
    </div>
  );
}

function MapPanel({
  campaignId,
  sessionId,
  currentLocationId,
  currentCharacterId,
  currentCharacterName,
}: {
  campaignId: Id<"campaigns">;
  sessionId?: Id<"gameSessions">;
  currentLocationId?: Id<"locations">;
  currentCharacterId?: Id<"characters">;
  currentCharacterName?: string;
}) {
  const [activeTab, setActiveTab] = useState<"location" | "world">("location");

  const currentLocation = useQuery(
    api.game.travel.getCurrentLocation,
    sessionId ? { sessionId } : "skip"
  );

  return (
    <div className="border-b border-[var(--border)]">
      {/* Tab Header */}
      <div className="flex border-b border-[var(--border)]">
        <button
          onClick={() => setActiveTab("location")}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium transition-colors ${
            activeTab === "location"
              ? "text-[var(--accent-gold)] border-b-2 border-[var(--accent-gold)]"
              : "text-[var(--foreground-secondary)] hover:text-[var(--foreground)]"
          }`}
        >
          <MapPin className="h-4 w-4" />
          {currentLocation?.name ?? "Location"}
        </button>
        <button
          onClick={() => setActiveTab("world")}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium transition-colors ${
            activeTab === "world"
              ? "text-[var(--accent-gold)] border-b-2 border-[var(--accent-gold)]"
              : "text-[var(--foreground-secondary)] hover:text-[var(--foreground)]"
          }`}
        >
          <Globe className="h-4 w-4" />
          World
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "location" ? (
        <LocationTab
          sessionId={sessionId}
          currentLocation={currentLocation}
          currentCharacterId={currentCharacterId}
          currentCharacterName={currentCharacterName}
        />
      ) : (
        <div className="overflow-auto max-h-[50vh]">
          <LocationGraph
            campaignId={campaignId}
            sessionId={sessionId}
            currentLocationId={currentLocationId}
          />
        </div>
      )}
    </div>
  );
}

function LocationTab({
  sessionId,
  currentLocation,
  currentCharacterId,
  currentCharacterName,
}: {
  sessionId?: Id<"gameSessions">;
  currentLocation?: { name: string; description: string; npcs?: Array<{ id: string; name: string }> } | null;
  currentCharacterId?: Id<"characters">;
  currentCharacterName?: string;
}) {
  return (
    <div className="p-4 space-y-4">
      {/* Location Info */}
      {currentLocation ? (
        <div>
          <h3 className="font-bold text-lg">{currentLocation.name}</h3>
          <p className="text-sm text-[var(--foreground-secondary)] mt-2">
            {currentLocation.description}
          </p>
        </div>
      ) : (
        <p className="text-[var(--foreground-muted)]">No location set.</p>
      )}

      {/* Exploration Grid */}
      {sessionId && (
        <ExplorationGrid
          sessionId={sessionId}
          currentCharacterId={currentCharacterId}
          currentCharacterName={currentCharacterName}
        />
      )}

      {/* NPCs at location */}
      {currentLocation?.npcs && currentLocation.npcs.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2">Characters here:</h4>
          <div className="space-y-1">
            {currentLocation.npcs.map((npc) => (
              <div
                key={npc.id}
                className="flex items-center gap-2 text-sm p-2 rounded bg-[var(--background-tertiary)]"
              >
                <div className="w-6 h-6 rounded-full bg-[var(--accent-red)] flex items-center justify-center text-white text-xs font-bold">
                  {npc.name[0]}
                </div>
                <span>{npc.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function GameHeader({
  campaignName,
  showFrench,
  onToggleFrench,
  onToggleMap,
  sidebarOpen,
  onToggleSidebar,
  onlinePlayers,
  sessionId,
  llmProvider,
}: {
  campaignName: string;
  showFrench: boolean;
  onToggleFrench: () => void;
  onToggleMap: () => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onlinePlayers: Array<{ displayName: string }>;
  sessionId?: Id<"gameSessions">;
  llmProvider?: "deepseek" | "openai";
}) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-[var(--border)] bg-[var(--background-secondary)] px-4">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Users className="h-5 w-5" />
        </Button>
        <span className="font-medium">{campaignName}</span>
        {onlinePlayers.length > 0 && (
          <div className="hidden sm:flex items-center gap-1 text-xs text-[var(--foreground-muted)]">
            <div className="w-2 h-2 rounded-full bg-[var(--accent-green)]" />
            {onlinePlayers.length} online
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        {/* Model selector */}
        {sessionId && (
          <ModelSelector sessionId={sessionId} currentProvider={llmProvider} />
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleFrench}
          className={showFrench ? "text-[var(--accent-blue)]" : ""}
        >
          <Globe className="h-4 w-4 mr-1" />
          FR
        </Button>
        <Button variant="ghost" size="icon" onClick={onToggleMap}>
          <Map className="h-5 w-5" />
        </Button>
        <Link href="/notebook">
          <Button variant="ghost" size="icon" title="Notebook">
            <BookOpen className="h-5 w-5" />
          </Button>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          className="hidden lg:flex"
        >
          <ChevronRight
            className={`h-5 w-5 transition-transform ${
              sidebarOpen ? "rotate-0" : "rotate-180"
            }`}
          />
        </Button>
      </div>
    </header>
  );
}

function GameModeRouter({
  showFrench,
  characterId,
  onSaveEntry,
  savedEntries,
  onNpcNameClick,
}: {
  showFrench: boolean;
  characterId?: Id<"characters">;
  onSaveEntry: (entry: GameLogEntry) => void;
  savedEntries: Set<string>;
  onNpcNameClick?: (npcId: Id<"npcs">) => void;
}) {
  const { gameState } = useGame();

  // Combat mode
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

  // Scene mode
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

  // Exploration / Dialogue mode (default)
  return (
    <ExplorationView
      showFrench={showFrench}
      onSaveEntry={onSaveEntry}
      savedEntries={savedEntries}
      onNpcNameClick={onNpcNameClick}
    />
  );
}

function ExplorationView({
  showFrench,
  onSaveEntry,
  savedEntries,
  onNpcNameClick,
}: {
  showFrench: boolean;
  onSaveEntry: (entry: GameLogEntry) => void;
  savedEntries: Set<string>;
  onNpcNameClick?: (npcId: Id<"npcs">) => void;
}) {
  const { gameState, currentCharacter, campaign } = useGame();
  const [input, setInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  // Pending roll state
  const pendingRoll = gameState.session?.pendingRoll;

  // Calculate modifier for pending roll
  const getRollModifier = () => {
    if (!pendingRoll || !currentCharacter) return { modifier: 0, proficiencyBonus: 0 };

    const abilities = currentCharacter.abilities;
    const abilityKey = pendingRoll.ability.toLowerCase() as keyof typeof abilities;
    const abilityScore = abilities[abilityKey] ?? 10;
    const abilityMod = Math.floor((abilityScore - 10) / 2);

    // Check if character is proficient in the skill
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

  // Build NPC name→ID map for clickable NPC names in log
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
        actionText: { text: label },
      });
    } catch (error) {
      console.error("Failed to submit quick action:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Scroll to bottom when log updates
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
                showFrench={showFrench}
                onSave={() => onSaveEntry(entry)}
                isSaved={savedEntries.has(entry._id)}
                onNpcNameClick={onNpcNameClick && entry.actorType === "npc" && entry.actorName && npcNameToId[entry.actorName]
                  ? () => onNpcNameClick(npcNameToId[entry.actorName!])
                  : undefined}
              />
            ))
          )}

          {/* Pending Roll Prompt */}
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
                <QuickAction key={i} label={action.text} onClick={handleQuickAction} disabled={isSubmitting} />
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

interface GameLogEntry {
  _id: Id<"gameLog">;
  type: "narration" | "dialogue" | "action" | "roll" | "system" | "ooc" | "movement";
  content: string;
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

function LogEntry({
  entry,
  showFrench,
  onSave,
  isSaved,
  onNpcNameClick,
}: {
  entry: GameLogEntry;
  showFrench: boolean;
  onSave?: () => void;
  isSaved?: boolean;
  onNpcNameClick?: () => void;
}) {
  const { gameState } = useGame();

  // Movement log entries get special rendering
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
      {/* Content */}
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
        {/* Roll display */}
        {isRoll && entry.roll && (
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-lg bg-[var(--accent-purple)] flex items-center justify-center text-white font-bold">
                {entry.roll.result}
              </div>
              <div>
                <div className="text-sm font-medium">{entry.content}</div>
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

        {/* Text content */}
        {!isRoll && (
          <div className="space-y-2">
            <p className="text-[var(--foreground)] leading-relaxed">
              {entry.contentEn}
            </p>
            {showFrench && entry.contentFr && (
              <p className="text-[var(--accent-blue)] text-sm leading-relaxed">
                {entry.contentFr}
              </p>
            )}
          </div>
        )}

        {/* Vocabulary annotations (legacy) */}
        {entry.annotations?.vocabulary &&
          entry.annotations.vocabulary.length > 0 &&
          !entry.linguisticAnalysis &&
          showFrench && (
            <div className="mt-3 pt-3 border-t border-[var(--border)]">
              <div className="flex flex-wrap gap-2">
                {entry.annotations.vocabulary.map((v, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[var(--background-tertiary)] text-xs"
                    title={v.note}
                  >
                    <span className="text-[var(--accent-blue)]">{v.word}</span>
                    <span className="text-[var(--foreground-muted)]">=</span>
                    <span>{v.translation}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
      </div>

      {/* Action buttons (on hover) */}
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
      {/* Actor name */}
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

      {/* Side-by-side layout when analysis exists, otherwise just content */}
      {hasAnalysis ? (
        <div className="flex gap-4 items-start">
          <div className="flex-1 min-w-0">
            {contentBlock}
          </div>
          <div className="w-72 flex-shrink-0 hidden xl:block">
            <AnalysisPanel
              analysis={entry.linguisticAnalysis}
              alwaysExpanded
              onSave={!isSaved ? onSave : undefined}
              isSaved={isSaved}
            />
          </div>
        </div>
      ) : (
        contentBlock
      )}

      {/* Fallback: show analysis below on smaller screens */}
      {hasAnalysis && (
        <div className="xl:hidden">
          <AnalysisPanel
            analysis={entry.linguisticAnalysis}
            onSave={!isSaved ? onSave : undefined}
            isSaved={isSaved}
          />
        </div>
      )}
    </div>
  );
}

function QuickAction({
  label,
  labelFr,
  onClick,
  disabled,
}: {
  label: string;
  labelFr: string;
  onClick: (label: string, labelFr: string) => void;
  disabled?: boolean;
}) {
  return (
    <button
      className="group px-3 py-1.5 rounded-full border border-[var(--border)] bg-[var(--card)] hover:border-[var(--accent-gold)] hover:bg-[var(--accent-gold)]/10 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
      onClick={() => onClick(label, labelFr)}
      disabled={disabled}
    >
      <span>{label}</span>
      <span className="hidden group-hover:inline text-[var(--accent-blue)] ml-1">
        / {labelFr}
      </span>
    </button>
  );
}

const SIDEBAR_SLOT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  head: Crown, chest: Shirt, hands: Hand, boots: Footprints,
  cloak: Shield, ring1: CircleDot, ring2: CircleDot, ring: CircleDot,
  necklace: Gem, mainHand: Sword, offHand: Shield, book: BookOpen,
};

// Slot-to-item-type mapping for filtering inventory items that can go in a slot
const SLOT_ITEM_TYPES: Record<string, string[]> = {
  head: ["head"], chest: ["chest"], hands: ["hands"], boots: ["boots"],
  cloak: ["cloak"], mainHand: ["mainHand"], offHand: ["offHand"],
  ring1: ["ring"], ring2: ["ring"], necklace: ["necklace"], book: ["book"],
};

type EquipSlotItem = { name: string; rarity: string; type: string; stats: Record<string, unknown>; id?: string; description?: string };

function EquipmentSlotPopover({
  slot,
  item,
  characterId,
  onClose,
}: {
  slot: string;
  item: EquipSlotItem | null;
  characterId: Id<"characters">;
  onClose: () => void;
}) {
  const inventory = useQuery(api.equipment.getInventory, { characterId });
  const equipItem = useMutation(api.equipment.equipItem);
  const unequipItem = useMutation(api.equipment.unequipItem);

  const compatibleItems = (inventory ?? []).filter((inv: any) => {
    const types = SLOT_ITEM_TYPES[slot] || [];
    return types.includes(inv.type);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative z-10 w-72 rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
          <span className="text-sm font-medium">{getSlotLabel(slot as never)}</span>
          <button onClick={onClose} className="text-[var(--foreground-muted)] hover:text-[var(--foreground)] text-lg leading-none">&times;</button>
        </div>

        {/* Current item details */}
        {item ? (
          <div className="px-4 py-3 border-b border-[var(--border)]">
            <div className="flex items-center gap-2 mb-1">
              {(() => { const Icon = SIDEBAR_SLOT_ICONS[slot] || Scroll; return <div style={{ color: getRarityColor(item.rarity as never) }}><Icon className="h-5 w-5" /></div>; })()}
              <span className="font-medium text-sm" style={{ color: getRarityColor(item.rarity as never) }}>{item.name}</span>
            </div>
            <p className="text-[10px] text-[var(--foreground-muted)] capitalize mb-2">{item.rarity}</p>
            {/* Stats */}
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-[var(--foreground-secondary)]">
              {Object.entries(item.stats).filter(([,v]) => v !== undefined && v !== null).map(([k, v]) => (
                <span key={k}>{formatStatValue(k, v as number)}</span>
              ))}
            </div>
            <button
              onClick={async () => { await unequipItem({ characterId, slot }); onClose(); }}
              className="mt-3 w-full py-1.5 rounded-lg text-xs font-medium bg-[var(--accent-red)]/20 text-[var(--accent-red)] hover:bg-[var(--accent-red)]/30 transition-colors"
            >
              Unequip
            </button>
          </div>
        ) : (
          <div className="px-4 py-3 border-b border-[var(--border)]">
            <p className="text-xs text-[var(--foreground-muted)] italic">Empty slot</p>
          </div>
        )}

        {/* Equippable items from inventory */}
        {compatibleItems.length > 0 && (
          <div className="px-4 py-2">
            <p className="text-[10px] text-[var(--foreground-muted)] mb-2 uppercase tracking-wide">Equip from inventory</p>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {compatibleItems.map((inv: any) => {
                const rc = getRarityColor(inv.rarity);
                return (
                  <button
                    key={inv.id}
                    onClick={async () => { await equipItem({ characterId, itemId: inv.id, targetSlot: slot }); onClose(); }}
                    className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-[var(--background-tertiary)] transition-colors text-left"
                  >
                    {(() => { const I = SIDEBAR_SLOT_ICONS[inv.type] || Scroll; return <div className="shrink-0" style={{ color: rc }}><I className="h-4 w-4" /></div>; })()}
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-medium block truncate" style={{ color: rc }}>{inv.name}</span>
                      <span className="text-[10px] text-[var(--foreground-muted)] capitalize">{inv.rarity}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {compatibleItems.length === 0 && !item && (
          <div className="px-4 py-3">
            <p className="text-xs text-[var(--foreground-muted)]">No items available for this slot</p>
          </div>
        )}
      </div>
    </div>
  );
}

const ABILITY_LABELS_SHORT = ["STR", "DEX", "CON", "INT", "WIS", "CHA"] as const;
const ABILITY_KEYS = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"] as const;

function abilityMod(score: number): number {
  return Math.floor((score - 10) / 2);
}

function modStr(mod: number): string {
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-[var(--background-tertiary)] p-2 text-center">
      <div className="flex justify-center mb-0.5 text-[var(--accent-blue)]">{icon}</div>
      <div className="text-sm font-bold">{value}</div>
      <div className="text-[9px] text-[var(--foreground-muted)]">{label}</div>
    </div>
  );
}

function AbilityCard({ label, score }: { label: string; score: number }) {
  const mod = abilityMod(score);
  return (
    <div className="rounded-lg bg-[var(--background-tertiary)] p-1.5 text-center">
      <div className="text-[9px] text-[var(--foreground-muted)]">{label}</div>
      <div className="text-sm font-bold">{score}</div>
      <div className="text-[10px] text-[var(--accent-gold)]">{modStr(mod)}</div>
    </div>
  );
}

function GameSidebar({
  campaignId,
  onNpcClick,
  onOpenCharSheet,
  onOpenInventory,
}: {
  campaignId: Id<"campaigns">;
  onNpcClick?: (npcId: Id<"npcs">) => void;
  onOpenCharSheet?: () => void;
  onOpenInventory?: () => void;
}) {
  const { currentCharacter, gameState } = useGame();
  const [equipExpanded, setEquipExpanded] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  // Get current location details
  const currentLocation = useQuery(
    api.game.travel.getCurrentLocation,
    gameState.sessionId ? { sessionId: gameState.sessionId } : "skip"
  );

  // Get relationships for current character
  const relationships = useQuery(
    api.relationships.getForCharacter,
    currentCharacter?._id ? { characterId: currentCharacter._id } : "skip"
  );

  // Get equipment
  const equipment = useQuery(
    api.equipment.getEquipment,
    currentCharacter?._id ? { characterId: currentCharacter._id } : "skip"
  );

  const character = currentCharacter;

  // Compute bars
  const hpPct = character ? Math.max(0, (character.hp / character.maxHp) * 100) : 0;
  const xpNeeded = character ? character.level * 1000 : 1000;
  const xpPct = character ? Math.min(100, (character.xp / xpNeeded) * 100) : 0;

  // Build equipped items list
  const equippedSlots: { slot: string; item: { name: string; rarity: string; type: string; stats: Record<string, unknown> } | null }[] = [];
  if (equipment) {
    const eq = equipment as Record<string, { name?: string; rarity?: string; type?: string; stats?: Record<string, unknown> } | null>;
    const slotOrder = ["head", "chest", "hands", "boots", "cloak", "mainHand", "offHand", "ring1", "ring2", "necklace", "book"];
    for (const slot of slotOrder) {
      const val = eq[slot];
      equippedSlots.push({
        slot,
        item: val && val.name ? { name: val.name, rarity: val.rarity ?? "common", type: val.type ?? slot, stats: (val.stats ?? {}) as Record<string, unknown> } : null,
      });
    }
  }

  return (
    <div className="p-4 space-y-4 h-full">
      {/* Character Header Card */}
      {character && (
        <div
          onClick={onOpenCharSheet}
          className="cursor-pointer rounded-xl bg-[var(--card)] p-4 hover:bg-[var(--background-tertiary)] transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 rounded-full border-2 border-[var(--accent-gold)] bg-[var(--background-tertiary)] flex items-center justify-center text-xl font-bold text-[var(--accent-gold)]">
              {character.name[0]}
            </div>
            <div>
              <h2 className="font-bold">{character.name}</h2>
              <p className="text-xs text-[var(--foreground-secondary)]">
                Level {character.level} {character.class || "Character"}
              </p>
            </div>
          </div>

          {/* HP Bar */}
          <div className="mt-3">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-[var(--accent-red)] flex items-center gap-1">
                <Heart className="h-3 w-3" /> HP: {character.hp}/{character.maxHp}
              </span>
            </div>
            <div className="h-2 rounded-full bg-[var(--background-tertiary)]">
              <div className="h-full rounded-full bg-[var(--accent-red)] transition-all" style={{ width: `${hpPct}%` }} />
            </div>
          </div>

          {/* XP Bar */}
          <div className="mt-2">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-[var(--accent-green)]">XP: {character.xp}</span>
              <span className="text-[var(--foreground-muted)] text-[10px]">{xpNeeded - character.xp} until level {character.level + 1}</span>
            </div>
            <div className="h-1.5 rounded-full bg-[var(--background-tertiary)]">
              <div className="h-full rounded-full bg-[var(--accent-green)] transition-all" style={{ width: `${xpPct}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      {character && (
        <div className="rounded-xl bg-[var(--card)] p-3">
          <div className="grid grid-cols-3 gap-2 mb-2">
            <StatCard icon={<Shield className="h-3.5 w-3.5" />} label="AC" value={character.ac} />
            <StatCard icon={<Zap className="h-3.5 w-3.5" />} label="Speed" value={`${character.speed}ft`} />
            <StatCard icon={<Target className="h-3.5 w-3.5" />} label="PB" value={`+${character.proficiencyBonus}`} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {ABILITY_KEYS.map((key, i) => (
              <AbilityCard key={key} label={ABILITY_LABELS_SHORT[i]} score={character.abilities[key]} />
            ))}
          </div>
        </div>
      )}

      {/* Equipment Section */}
      {character && equipment && (
        <div className="rounded-xl bg-[var(--card)] overflow-hidden">
          <button
            onClick={() => setEquipExpanded(!equipExpanded)}
            className="w-full flex items-center justify-between p-3 hover:bg-[var(--background-tertiary)] transition-colors"
          >
            <span className="text-sm font-medium">Equipment</span>
            {equipExpanded ? <ChevronUp className="h-4 w-4 text-[var(--foreground-muted)]" /> : <ChevronDown className="h-4 w-4 text-[var(--foreground-muted)]" />}
          </button>
          {equipExpanded && (
            <div className="px-3 pb-3">
              <div className="grid grid-cols-3 gap-2">
                {equippedSlots.map(({ slot, item }) => {
                  const Icon = SIDEBAR_SLOT_ICONS[slot] || Scroll;
                  if (!item) {
                    return (
                      <button
                        key={slot}
                        onClick={() => setSelectedSlot(slot)}
                        className="rounded-lg border border-[var(--border)] bg-[var(--background-tertiary)] p-2 flex flex-col items-center gap-1 opacity-40 hover:opacity-70 transition-opacity cursor-pointer"
                      >
                        <Icon className="h-5 w-5 text-[var(--foreground-muted)]" />
                        <span className="text-[9px] text-[var(--foreground-muted)] truncate w-full text-center">{getSlotLabel(slot as never)}</span>
                      </button>
                    );
                  }
                  const rarityColor = getRarityColor(item.rarity as never);
                  const borderColor = RARITY_BORDER_COLORS[item.rarity as keyof typeof RARITY_BORDER_COLORS];
                  const bgColor = RARITY_BG_COLORS[item.rarity as keyof typeof RARITY_BG_COLORS];
                  const keyStat = (() => {
                    const s = item.stats;
                    if ((item.type === "mainHand" || item.type === "offHand") && s.damage) return `${s.damage} dmg`;
                    if (s.ac) return `+${s.ac} AC`;
                    const first = Object.entries(s).find(([, v]) => v !== undefined);
                    if (first) return formatStatValue(first[0], first[1] as number);
                    return null;
                  })();
                  return (
                    <button
                      key={slot}
                      onClick={() => setSelectedSlot(slot)}
                      className="rounded-lg border p-2 flex flex-col items-center gap-1 transition-all hover:brightness-110 cursor-pointer text-left"
                      style={{ borderColor, backgroundColor: "rgba(0,0,0,0.3)" }}
                    >
                      <div
                        className="w-8 h-8 rounded flex items-center justify-center"
                        style={{ background: `linear-gradient(135deg, ${bgColor}, transparent)` }}
                      >
                        <div style={{ color: rarityColor }}><Icon className="h-4 w-4" /></div>
                      </div>
                      <span className="text-[9px] truncate w-full text-center font-medium" style={{ color: rarityColor }}>{item.name}</span>
                      {keyStat && <span className="text-[8px] text-[var(--foreground-muted)]">{keyStat}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <button
            onClick={onOpenInventory}
            className="w-full py-2.5 border-t border-[var(--border)] flex items-center justify-center gap-2 text-sm hover:bg-[var(--background-tertiary)] transition-colors text-[var(--foreground-secondary)]"
          >
            <Package className="h-4 w-4" /> View Full Inventory
          </button>
        </div>
      )}

      {/* Equipment Slot Popover */}
      {selectedSlot && character && (
        <EquipmentSlotPopover
          slot={selectedSlot}
          item={equippedSlots.find(s => s.slot === selectedSlot)?.item ?? null}
          characterId={character._id as Id<"characters">}
          onClose={() => setSelectedSlot(null)}
        />
      )}

      {/* Location */}
      <div className="rounded-xl bg-[var(--card)] p-3">
        <div className="flex items-center gap-2 mb-2">
          <Map className="h-4 w-4 text-[var(--foreground-muted)]" />
          <span className="text-sm font-medium">Location</span>
        </div>
        {currentLocation ? (
          <>
            <h3 className="font-medium">{currentLocation.name}</h3>
            <p className="text-xs text-[var(--accent-blue)]">{currentLocation.nameFr}</p>
            <p className="text-xs text-[var(--foreground-secondary)] mt-1 line-clamp-2">{currentLocation.description}</p>
            {currentLocation.npcs && currentLocation.npcs.length > 0 && (
              <div className="mt-2 pt-2 border-t border-[var(--border)]">
                <p className="text-xs text-[var(--foreground-muted)]">{currentLocation.npcs.length} character(s) here</p>
              </div>
            )}
          </>
        ) : (
          <>
            <h3 className="font-medium">Unknown Location</h3>
            <p className="text-xs text-[var(--foreground-secondary)] mt-1">Open the map to explore</p>
          </>
        )}
      </div>

      {/* Relationships */}
      {relationships && relationships.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Heart className="h-4 w-4 text-[var(--foreground-muted)]" />
            <span className="text-sm font-medium">Relationships</span>
          </div>
          <div className="rounded-xl bg-[var(--card)] p-3 space-y-3">
            {relationships.map((rel) => (
              <RelationshipEntry
                key={rel._id}
                name={rel.npc?.name ?? "Unknown"}
                affinity={rel.affinity}
                trust={rel.trust}
                attraction={rel.attraction}
                onClick={onNpcClick ? () => onNpcClick(rel.npcId) : undefined}
              />
            ))}
          </div>
        </div>
      )}

      {/* Game Mode Indicator */}
      <div className="rounded-xl bg-[var(--background-tertiary)] p-3 text-center">
        <span className="text-xs text-[var(--foreground-muted)]">Mode: </span>
        <span className="text-xs font-medium capitalize">{gameState.currentMode}</span>
      </div>
    </div>
  );
}

function RelationshipEntry({
  name,
  affinity,
  trust,
  attraction,
  onClick,
}: {
  name: string;
  affinity: number;
  trust: number;
  attraction: number;
  onClick?: () => void;
}) {
  return (
    <div className={onClick ? "cursor-pointer hover:bg-[var(--background-tertiary)] rounded-lg p-1 -m-1 transition-colors" : ""} onClick={onClick}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">{name}</span>
      </div>
      <div className="space-y-1 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-16 text-[var(--foreground-secondary)]">Affinity</span>
          <div className="flex-1 h-1.5 rounded-full bg-[var(--background-tertiary)]">
            <div
              className="h-full rounded-full bg-[var(--accent-gold)]"
              style={{ width: `${Math.max(0, 50 + affinity / 2)}%` }}
            />
          </div>
          <span className="w-8 text-right">{affinity}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-16 text-[var(--foreground-secondary)]">Trust</span>
          <div className="flex-1 h-1.5 rounded-full bg-[var(--background-tertiary)]">
            <div
              className="h-full rounded-full bg-[var(--accent-blue)]"
              style={{ width: `${trust}%` }}
            />
          </div>
          <span className="w-8 text-right">{trust}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-16 text-[var(--foreground-secondary)]">Attraction</span>
          <div className="flex-1 h-1.5 rounded-full bg-[var(--background-tertiary)]">
            <div
              className="h-full rounded-full bg-[var(--accent-red)]"
              style={{ width: `${attraction}%` }}
            />
          </div>
          <span className="w-8 text-right">{attraction}</span>
        </div>
      </div>
    </div>
  );
}
