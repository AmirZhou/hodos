"use client";

import { useState, useRef, useEffect, use, useCallback } from "react";
import { useQuery, useAction, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GameProvider, useGame } from "@/components/game/engine";
import { CombatView } from "@/components/game/combat";
import { SceneView, SafewordButton } from "@/components/game/scene";
import { LocationGraph } from "@/components/game/map";
import { AnalysisPanel } from "@/components/learning";
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
} from "lucide-react";

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

  const [showFrench, setShowFrench] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showMap, setShowMap] = useState(false);
  const [savedEntries, setSavedEntries] = useState<Set<string>>(new Set());

  const saveToNotebook = useMutation(api.notebook.save);

  const handleSaveEntry = useCallback(
    async (entry: GameLogEntry) => {
      if (!userId || !entry.linguisticAnalysis) return;

      try {
        await saveToNotebook({
          userId,
          frenchText: entry.contentFr || "",
          englishText: entry.contentEn,
          grammarNotes: entry.linguisticAnalysis.grammar,
          vocabularyItems: entry.linguisticAnalysis.vocabulary.map((v) => ({
            word: v.word,
            translation: v.translation,
            partOfSpeech: v.partOfSpeech,
          })),
          usageNote: entry.linguisticAnalysis.usageNotes.join(" "),
          gameLogId: entry._id,
          campaignId,
          sceneSummary: entry.actorName
            ? `${entry.actorName}: ${entry.contentEn.slice(0, 100)}`
            : entry.contentEn.slice(0, 100),
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
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[var(--background)]">
      {/* Main Game Area */}
      <div className="flex flex-1 flex-col">
        {/* Top Bar */}
        <GameHeader
          campaignName={campaign?.name ?? "Game"}
          showFrench={showFrench}
          onToggleFrench={() => setShowFrench(!showFrench)}
          onToggleMap={() => setShowMap(!showMap)}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onlinePlayers={gameState.onlinePlayers}
        />

        {/* Map Modal */}
        {showMap && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="max-w-4xl w-full max-h-[90vh] overflow-auto">
              <LocationGraph
                campaignId={campaignId}
                sessionId={gameState.sessionId}
                currentLocationId={gameState.locationId}
                onLocationSelect={() => setShowMap(false)}
                onClose={() => setShowMap(false)}
              />
            </div>
          </div>
        )}

        {/* Main Content - Mode Router */}
        <GameModeRouter
          showFrench={showFrench}
          characterId={currentCharacter?._id}
        />
      </div>

      {/* Right Sidebar - Character & World Info */}
      {sidebarOpen && (
        <aside className="hidden w-80 flex-shrink-0 border-l border-[var(--border)] bg-[var(--background-secondary)] lg:block overflow-y-auto">
          <GameSidebar campaignId={campaignId} />
        </aside>
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

function GameHeader({
  campaignName,
  showFrench,
  onToggleFrench,
  onToggleMap,
  sidebarOpen,
  onToggleSidebar,
  onlinePlayers,
}: {
  campaignName: string;
  showFrench: boolean;
  onToggleFrench: () => void;
  onToggleMap: () => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onlinePlayers: Array<{ displayName: string }>;
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
        <Button variant="ghost" size="icon">
          <BookOpen className="h-5 w-5" />
        </Button>
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
}: {
  showFrench: boolean;
  characterId?: Id<"characters">;
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
  return <ExplorationView showFrench={showFrench} />;
}

function ExplorationView({ showFrench }: { showFrench: boolean }) {
  const { gameState, currentCharacter, campaign } = useGame();
  const [input, setInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  const submitAction = useAction(api.game.actions.submitAction);
  const submitQuickAction = useAction(api.game.actions.submitQuickAction);

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

  const handleQuickAction = async (label: string, labelFr: string) => {
    if (!currentCharacter || !campaign || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await submitQuickAction({
        campaignId: campaign._id,
        characterId: currentCharacter._id,
        actionType: label.toLowerCase().replace(/\s+/g, "_"),
        actionText: { en: label, fr: labelFr },
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
        <div className="mx-auto max-w-3xl space-y-6">
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
              />
            ))
          )}
          <div ref={logEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-[var(--border)] bg-[var(--background-secondary)] p-4">
        <div className="mx-auto max-w-3xl">
          {/* Quick Actions */}
          <div className="mb-3 flex flex-wrap gap-2">
            <QuickAction label="Look around" labelFr="Regarder autour" onClick={handleQuickAction} disabled={isSubmitting} />
            <QuickAction label="Talk to..." labelFr="Parler à..." onClick={handleQuickAction} disabled={isSubmitting} />
            <QuickAction label="Investigate" labelFr="Enquêter" onClick={handleQuickAction} disabled={isSubmitting} />
            <QuickAction label="Rest" labelFr="Se reposer" onClick={handleQuickAction} disabled={isSubmitting} />
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
  type: "narration" | "dialogue" | "action" | "roll" | "system" | "ooc";
  contentEn: string;
  contentFr: string;
  actorName?: string;
  actorType?: "dm" | "character" | "npc";
  roll?: {
    type: string;
    dice: string;
    result: number;
    dc?: number;
    success?: boolean;
  };
  annotations?: {
    vocabulary: Array<{
      word: string;
      translation: string;
      note?: string;
    }>;
    grammar?: string;
  };
  linguisticAnalysis?: {
    grammar: string[];
    vocabulary: Array<{
      word: string;
      translation: string;
      partOfSpeech: string;
      usage?: string;
    }>;
    usageNotes: string[];
  };
}

function LogEntry({
  entry,
  showFrench,
  onSave,
  isSaved,
}: {
  entry: GameLogEntry;
  showFrench: boolean;
  onSave?: () => void;
  isSaved?: boolean;
}) {
  const isPlayerAction = entry.actorType === "character";
  const isRoll = entry.type === "roll";
  const isDialogue = entry.type === "dialogue";

  return (
    <div className={`group ${isPlayerAction ? "pl-8" : ""}`}>
      {/* Actor name */}
      {!isPlayerAction && entry.actorName && (
        <div className="mb-1 flex items-center gap-2">
          <span className="text-sm font-medium text-[var(--foreground-secondary)]">
            {entry.actorName}
          </span>
          {entry.type === "narration" && (
            <span className="text-xs text-[var(--foreground-muted)]">
              Narration
            </span>
          )}
        </div>
      )}

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
                <div className="text-sm font-medium">{entry.contentEn}</div>
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

      {/* French Learning Analysis Panel */}
      {showFrench && entry.linguisticAnalysis && (
        <AnalysisPanel
          analysis={entry.linguisticAnalysis}
          onSave={!isSaved ? onSave : undefined}
        />
      )}
      {isSaved && showFrench && entry.linguisticAnalysis && (
        <div className="mt-1 text-xs text-[var(--accent-green)]">
          ✓ Saved to notebook
        </div>
      )}

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

function GameSidebar({ campaignId }: { campaignId: Id<"campaigns"> }) {
  const { currentCharacter, gameState } = useGame();

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

  return (
    <div className="p-4 space-y-6">
      {/* Online Players */}
      {gameState.onlinePlayers.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-[var(--foreground-muted)]" />
            <span className="text-sm font-medium">Online Players</span>
          </div>
          <div className="rounded-lg bg-[var(--card)] p-3 space-y-2">
            {gameState.onlinePlayers.map((player) => (
              <div key={player.userId} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[var(--accent-green)]" />
                <span className="text-sm">{player.displayName}</span>
                {player.character && (
                  <span className="text-xs text-[var(--foreground-muted)]">
                    ({player.character.name})
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Location */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Map className="h-4 w-4 text-[var(--foreground-muted)]" />
          <span className="text-sm font-medium">Location</span>
        </div>
        <div className="rounded-lg bg-[var(--card)] p-3">
          {currentLocation ? (
            <>
              <h3 className="font-medium">{currentLocation.name}</h3>
              <p className="text-xs text-[var(--accent-blue)]">
                {currentLocation.nameFr}
              </p>
              <p className="text-xs text-[var(--foreground-secondary)] mt-1 line-clamp-2">
                {currentLocation.description}
              </p>
              {currentLocation.npcs && currentLocation.npcs.length > 0 && (
                <div className="mt-2 pt-2 border-t border-[var(--border)]">
                  <p className="text-xs text-[var(--foreground-muted)]">
                    {currentLocation.npcs.length} character(s) here
                  </p>
                </div>
              )}
            </>
          ) : (
            <>
              <h3 className="font-medium">Unknown Location</h3>
              <p className="text-xs text-[var(--foreground-secondary)] mt-1">
                Open the map to explore
              </p>
            </>
          )}
        </div>
      </div>

      {/* Character */}
      {currentCharacter && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-[var(--foreground-muted)]" />
            <span className="text-sm font-medium">Character</span>
          </div>
          <div className="rounded-lg bg-[var(--card)] p-3">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-12 w-12 rounded-full bg-[var(--accent-purple)] flex items-center justify-center text-white font-bold">
                {currentCharacter.name[0]}
              </div>
              <div>
                <h3 className="font-medium">{currentCharacter.name}</h3>
                <p className="text-xs text-[var(--foreground-secondary)]">
                  Level {/* TODO: Add level */} Character
                </p>
              </div>
            </div>

            {/* HP Bar */}
            <div className="mb-3">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[var(--accent-red)]">HP</span>
                <span>
                  {currentCharacter.hp}/{currentCharacter.maxHp}
                </span>
              </div>
              <div className="h-2 rounded-full bg-[var(--background-tertiary)]">
                <div
                  className="h-full rounded-full bg-[var(--accent-red)]"
                  style={{
                    width: `${(currentCharacter.hp / currentCharacter.maxHp) * 100}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Relationships */}
      {relationships && relationships.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Heart className="h-4 w-4 text-[var(--foreground-muted)]" />
            <span className="text-sm font-medium">Relationships</span>
          </div>
          <div className="rounded-lg bg-[var(--card)] p-3 space-y-3">
            {relationships.map((rel) => (
              <RelationshipEntry
                key={rel._id}
                name={rel.npc?.name ?? "Unknown"}
                affinity={rel.affinity}
                trust={rel.trust}
                attraction={rel.attraction}
              />
            ))}
          </div>
        </div>
      )}

      {/* Game Mode Indicator */}
      <div className="rounded-lg bg-[var(--background-tertiary)] p-3 text-center">
        <span className="text-xs text-[var(--foreground-muted)]">Mode: </span>
        <span className="text-xs font-medium capitalize">
          {gameState.currentMode}
        </span>
      </div>
    </div>
  );
}

function RelationshipEntry({
  name,
  affinity,
  trust,
  attraction,
}: {
  name: string;
  affinity: number;
  trust: number;
  attraction: number;
}) {
  return (
    <div>
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
