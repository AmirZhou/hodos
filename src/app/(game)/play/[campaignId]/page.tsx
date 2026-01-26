"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Send,
  Mic,
  Settings,
  Users,
  Map,
  BookOpen,
  Heart,
  Swords,
  ChevronRight,
  Globe,
  MoreHorizontal,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  Edit3,
} from "lucide-react";

// Mock data for demonstration
const mockLog = [
  {
    id: "1",
    type: "narration" as const,
    actorName: "DM",
    contentEn:
      "The autumn wind cuts through the narrow streets of Old Montreal. You stand before a weathered door, its paint peeling like old secrets. The address matches the one scrawled on the napkin in your pocket. Inside, they say, is someone who can help you find what you've lost.",
    contentFr:
      "Le vent d'automne coupe à travers les rues étroites du Vieux-Montréal. Vous vous tenez devant une porte usée, sa peinture s'écaillant comme de vieux secrets. L'adresse correspond à celle griffonnée sur la serviette dans votre poche. À l'intérieur, dit-on, se trouve quelqu'un qui peut vous aider à retrouver ce que vous avez perdu.",
    annotations: {
      vocabulary: [
        { word: "s'écaillant", translation: "peeling", note: "from s'écailler - to peel/flake" },
        { word: "griffonnée", translation: "scrawled", note: "from griffonner - to scribble" },
      ],
    },
  },
  {
    id: "2",
    type: "action" as const,
    actorName: "You",
    contentEn: "I knock on the door three times and wait.",
    contentFr: "Je frappe à la porte trois fois et j'attends.",
  },
  {
    id: "3",
    type: "roll" as const,
    actorName: "System",
    contentEn: "Perception check",
    contentFr: "Test de perception",
    roll: {
      type: "skill",
      dice: "1d20+3",
      result: 17,
      dc: 12,
      success: true,
    },
  },
  {
    id: "4",
    type: "narration" as const,
    actorName: "DM",
    contentEn:
      "You hear movement inside—soft footsteps approaching, then pausing. A shadow passes behind the frosted glass. The door opens a crack, revealing a sliver of a face: one dark eye, a strand of silver hair, the edge of lips pressed thin with suspicion.",
    contentFr:
      "Vous entendez du mouvement à l'intérieur—des pas légers qui s'approchent, puis s'arrêtent. Une ombre passe derrière le verre dépoli. La porte s'ouvre d'un trait, révélant une parcelle de visage : un œil sombre, une mèche de cheveux argentés, le bord de lèvres pincées de méfiance.",
    annotations: {
      vocabulary: [
        { word: "dépoli", translation: "frosted (glass)", note: "lit. 'unpolished'" },
        { word: "méfiance", translation: "suspicion/distrust" },
      ],
    },
  },
  {
    id: "5",
    type: "dialogue" as const,
    actorName: "Mysterious Woman",
    contentEn: '"You\'re not from around here. What do you want?"',
    contentFr: '"Vous n\'êtes pas d\'ici. Qu\'est-ce que vous voulez ?"',
  },
];

export default function GameplayPage({
  params,
}: {
  params: { campaignId: string };
}) {
  const [input, setInput] = useState("");
  const [showFrench, setShowFrench] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  return (
    <div className="flex h-screen bg-[var(--background)]">
      {/* Main Game Area */}
      <div className="flex flex-1 flex-col">
        {/* Top Bar */}
        <header className="flex h-14 items-center justify-between border-b border-[var(--border)] bg-[var(--background-secondary)] px-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="lg:hidden">
              <Users className="h-5 w-5" />
            </Button>
            <span className="font-medium">Montreal Mysteries</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFrench(!showFrench)}
              className={showFrench ? "text-[var(--accent-blue)]" : ""}
            >
              <Globe className="h-4 w-4 mr-1" />
              FR
            </Button>
            <Button variant="ghost" size="icon">
              <Map className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon">
              <BookOpen className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
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

        {/* Game Log */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="mx-auto max-w-3xl space-y-6">
            {mockLog.map((entry) => (
              <LogEntry
                key={entry.id}
                entry={entry}
                showFrench={showFrench}
              />
            ))}
            <div ref={logEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t border-[var(--border)] bg-[var(--background-secondary)] p-4">
          <div className="mx-auto max-w-3xl">
            {/* Quick Actions */}
            <div className="mb-3 flex flex-wrap gap-2">
              <QuickAction label="Look around" labelFr="Regarder autour" />
              <QuickAction label="Talk to her" labelFr="Lui parler" />
              <QuickAction label="Show the napkin" labelFr="Montrer la serviette" />
              <QuickAction label="Leave" labelFr="Partir" />
            </div>

            {/* Input */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  placeholder="What do you do? / Que faites-vous ?"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className="pr-20"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && input.trim()) {
                      // Submit action
                      setInput("");
                    }
                  }}
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <Mic className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <Button disabled={!input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>

            <p className="mt-2 text-xs text-[var(--foreground-muted)] text-center">
              Type anything or choose a quick action. The AI DM will respond.
            </p>
          </div>
        </div>
      </div>

      {/* Right Sidebar - Character & World Info */}
      {sidebarOpen && (
        <aside className="hidden w-80 flex-shrink-0 border-l border-[var(--border)] bg-[var(--background-secondary)] lg:block overflow-y-auto">
          <CharacterSidebar />
        </aside>
      )}
    </div>
  );
}

function LogEntry({
  entry,
  showFrench,
}: {
  entry: (typeof mockLog)[0];
  showFrench: boolean;
}) {
  const isPlayerAction = entry.actorName === "You";
  const isRoll = entry.type === "roll";
  const isDialogue = entry.type === "dialogue";

  return (
    <div className={`group ${isPlayerAction ? "pl-8" : ""}`}>
      {/* Actor name */}
      {!isPlayerAction && (
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
                  {entry.roll.dice} vs DC {entry.roll.dc}
                </div>
              </div>
            </div>
            <span
              className={`ml-auto px-2 py-1 rounded text-xs font-medium ${
                entry.roll.success
                  ? "bg-[var(--accent-green)]/20 text-[var(--accent-green)]"
                  : "bg-[var(--accent-red)]/20 text-[var(--accent-red)]"
              }`}
            >
              {entry.roll.success ? "Success" : "Failure"}
            </span>
          </div>
        )}

        {/* Text content */}
        {!isRoll && (
          <div className="space-y-2">
            <p className="text-[var(--foreground)] leading-relaxed">
              {entry.contentEn}
            </p>
            {showFrench && (
              <p className="text-[var(--accent-blue)] text-sm leading-relaxed">
                {entry.contentFr}
              </p>
            )}
          </div>
        )}

        {/* Vocabulary annotations */}
        {entry.annotations?.vocabulary && entry.annotations.vocabulary.length > 0 && showFrench && (
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
    </div>
  );
}

function QuickAction({ label, labelFr }: { label: string; labelFr: string }) {
  return (
    <button className="group px-3 py-1.5 rounded-full border border-[var(--border)] bg-[var(--card)] hover:border-[var(--accent-gold)] hover:bg-[var(--accent-gold)]/10 transition-colors text-sm">
      <span>{label}</span>
      <span className="hidden group-hover:inline text-[var(--accent-blue)] ml-1">
        / {labelFr}
      </span>
    </button>
  );
}

function CharacterSidebar() {
  return (
    <div className="p-4 space-y-6">
      {/* Location */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Map className="h-4 w-4 text-[var(--foreground-muted)]" />
          <span className="text-sm font-medium">Location</span>
        </div>
        <div className="rounded-lg bg-[var(--card)] p-3">
          <h3 className="font-medium">Old Montreal</h3>
          <p className="text-xs text-[var(--accent-blue)]">Vieux-Montréal</p>
          <p className="text-xs text-[var(--foreground-secondary)] mt-1">
            Historic district, narrow cobblestone streets
          </p>
        </div>
      </div>

      {/* Character */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Users className="h-4 w-4 text-[var(--foreground-muted)]" />
          <span className="text-sm font-medium">Character</span>
        </div>
        <div className="rounded-lg bg-[var(--card)] p-3">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-12 w-12 rounded-full bg-[var(--accent-purple)] flex items-center justify-center text-white font-bold">
              A
            </div>
            <div>
              <h3 className="font-medium">Alex Dubois</h3>
              <p className="text-xs text-[var(--foreground-secondary)]">
                Level 3 Investigator
              </p>
            </div>
          </div>

          {/* HP Bar */}
          <div className="mb-3">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-[var(--accent-red)]">HP</span>
              <span>24/24</span>
            </div>
            <div className="h-2 rounded-full hp-bar-bg">
              <div className="h-full rounded-full hp-bar" style={{ width: "100%" }} />
            </div>
          </div>

          {/* XP Bar */}
          <div className="mb-3">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-[var(--accent-blue)]">XP</span>
              <span>650/900</span>
            </div>
            <div className="h-2 rounded-full bg-[var(--background-tertiary)]">
              <div className="h-full rounded-full xp-bar" style={{ width: "72%" }} />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded bg-[var(--background-tertiary)] p-2">
              <div className="font-medium">STR</div>
              <div className="text-[var(--foreground-secondary)]">10</div>
            </div>
            <div className="rounded bg-[var(--background-tertiary)] p-2">
              <div className="font-medium">DEX</div>
              <div className="text-[var(--foreground-secondary)]">14</div>
            </div>
            <div className="rounded bg-[var(--background-tertiary)] p-2">
              <div className="font-medium">CON</div>
              <div className="text-[var(--foreground-secondary)]">12</div>
            </div>
            <div className="rounded bg-[var(--background-tertiary)] p-2">
              <div className="font-medium">INT</div>
              <div className="text-[var(--foreground-secondary)]">16</div>
            </div>
            <div className="rounded bg-[var(--background-tertiary)] p-2">
              <div className="font-medium">WIS</div>
              <div className="text-[var(--foreground-secondary)]">13</div>
            </div>
            <div className="rounded bg-[var(--background-tertiary)] p-2">
              <div className="font-medium">CHA</div>
              <div className="text-[var(--foreground-secondary)]">15</div>
            </div>
          </div>
        </div>
      </div>

      {/* Relationships */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Heart className="h-4 w-4 text-[var(--foreground-muted)]" />
          <span className="text-sm font-medium">Relationships</span>
        </div>
        <div className="rounded-lg bg-[var(--card)] p-3 space-y-3">
          <RelationshipEntry
            name="Mysterious Woman"
            affinity={0}
            trust={5}
            attraction={15}
          />
        </div>
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
        <span className="text-xs text-[var(--foreground-muted)]">Just met</span>
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
