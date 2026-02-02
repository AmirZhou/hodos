"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { X, Shield, Zap, Target, Heart } from "lucide-react";
import { useGame } from "@/components/game/engine";
import { InventoryModal } from "./InventoryModal";
import { SkillPanel } from "../skills/SkillPanel";

type Tab = "sheet" | "inventory" | "relationships";

const ABILITY_LABELS = ["STR", "DEX", "CON", "INT", "WIS", "CHA"] as const;
const ABILITY_KEYS = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"] as const;

function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

function modString(mod: number): string {
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

interface CharacterSheetModalProps {
  characterId: Id<"characters">;
  onClose: () => void;
}

export function CharacterSheetModal({ characterId, onClose }: CharacterSheetModalProps) {
  const { currentCharacter } = useGame();
  const [tab, setTab] = useState<Tab>("sheet");
  const [showInventoryModal, setShowInventoryModal] = useState(false);

  const relationships = useQuery(
    api.relationships.getForCharacter,
    characterId ? { characterId } : "skip"
  );

  if (!currentCharacter) return null;

  const { name, level, xp, ac, speed, proficiencyBonus, abilities } = currentCharacter;
  const charClass = currentCharacter.class || "Character";
  const background = currentCharacter.background || "Unknown";
  const xpNeeded = level * 1000;
  const xpPct = Math.min(100, (xp / xpNeeded) * 100);
  const hpPct = Math.max(0, (currentCharacter.hp / currentCharacter.maxHp) * 100);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl max-h-[90vh] rounded-2xl bg-[var(--background-secondary)] border border-[var(--border)] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with portrait */}
        <div className="relative p-6 bg-gradient-to-b from-[var(--background-tertiary)] to-transparent">
          <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-[var(--background-tertiary)] transition-colors">
            <X className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 rounded-full border-3 border-[var(--accent-gold)] bg-[var(--background-tertiary)] flex items-center justify-center text-3xl font-bold text-[var(--accent-gold)] overflow-hidden">
              {currentCharacter.portraitUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={currentCharacter.portraitUrl} alt={name} className="w-full h-full object-cover" />
              ) : (
                name[0]
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold">{name}</h2>
              <p className="text-sm text-[var(--foreground-secondary)]">
                Level {level} {charClass} &mdash; {background}
              </p>
              {/* HP bar */}
              <div className="mt-2 w-48">
                <div className="flex justify-between text-xs mb-0.5">
                  <span className="text-[var(--accent-red)] flex items-center gap-1"><Heart className="h-3 w-3" /> {currentCharacter.hp}/{currentCharacter.maxHp}</span>
                </div>
                <div className="h-2 rounded-full bg-[var(--background-tertiary)]">
                  <div className="h-full rounded-full bg-[var(--accent-red)] transition-all" style={{ width: `${hpPct}%` }} />
                </div>
              </div>
              {/* XP bar */}
              <div className="mt-1.5 w-48">
                <div className="flex justify-between text-xs mb-0.5">
                  <span className="text-[var(--accent-green)]">XP: {xp}/{xpNeeded}</span>
                </div>
                <div className="h-1.5 rounded-full bg-[var(--background-tertiary)]">
                  <div className="h-full rounded-full bg-[var(--accent-green)] transition-all" style={{ width: `${xpPct}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--border)]">
          {(["sheet", "inventory", "relationships"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-sm font-medium capitalize transition-colors ${
                tab === t
                  ? "border-b-2 border-[var(--accent-gold)] text-[var(--accent-gold)]"
                  : "text-[var(--foreground-secondary)] hover:text-[var(--foreground)]"
              }`}
            >
              {t === "sheet" ? "Character Sheet" : t}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {tab === "sheet" && (
            <div className="space-y-4">
              {/* Details */}
              <div className="rounded-xl bg-[var(--card)] p-4">
                <h3 className="text-sm font-medium mb-3 text-[var(--foreground-secondary)]">Details</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-[var(--foreground-muted)]">Class:</span> <span className="font-medium">{charClass}</span></div>
                  <div><span className="text-[var(--foreground-muted)]">Background:</span> <span className="font-medium">{background}</span></div>
                  <div><span className="text-[var(--foreground-muted)]">Level:</span> <span className="font-medium">{level}</span></div>
                  <div><span className="text-[var(--foreground-muted)]">XP:</span> <span className="font-medium">{xp}/{xpNeeded}</span></div>
                </div>
              </div>

              {/* Stats */}
              <div className="rounded-xl bg-[var(--card)] p-4">
                <h3 className="text-sm font-medium mb-3 text-[var(--foreground-secondary)]">Combat Stats</h3>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="rounded-lg bg-[var(--background-tertiary)] p-3 text-center">
                    <Shield className="h-4 w-4 mx-auto mb-1 text-[var(--accent-blue)]" />
                    <div className="text-lg font-bold">{ac}</div>
                    <div className="text-[10px] text-[var(--foreground-muted)]">AC</div>
                  </div>
                  <div className="rounded-lg bg-[var(--background-tertiary)] p-3 text-center">
                    <Zap className="h-4 w-4 mx-auto mb-1 text-[var(--accent-gold)]" />
                    <div className="text-lg font-bold">{speed}ft</div>
                    <div className="text-[10px] text-[var(--foreground-muted)]">Speed</div>
                  </div>
                  <div className="rounded-lg bg-[var(--background-tertiary)] p-3 text-center">
                    <Target className="h-4 w-4 mx-auto mb-1 text-[var(--accent-purple)]" />
                    <div className="text-lg font-bold">+{proficiencyBonus}</div>
                    <div className="text-[10px] text-[var(--foreground-muted)]">Prof. Bonus</div>
                  </div>
                </div>

                <h3 className="text-sm font-medium mb-3 text-[var(--foreground-secondary)]">Ability Scores</h3>
                <div className="grid grid-cols-3 gap-3">
                  {ABILITY_KEYS.map((key, i) => {
                    const score = abilities[key];
                    const mod = abilityModifier(score);
                    return (
                      <div key={key} className="rounded-lg bg-[var(--background-tertiary)] p-3 text-center">
                        <div className="text-[10px] text-[var(--foreground-muted)] mb-1">{ABILITY_LABELS[i]}</div>
                        <div className="text-lg font-bold">{score}</div>
                        <div className="text-xs text-[var(--accent-gold)]">{modString(mod)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {tab === "inventory" && (
            <div>
              <button
                onClick={() => setShowInventoryModal(true)}
                className="w-full py-3 rounded-xl bg-[var(--card)] border border-[var(--border)] text-sm font-medium hover:bg-[var(--background-tertiary)] transition-colors"
              >
                Open Full Inventory
              </button>
              {showInventoryModal && (
                <InventoryModal characterId={characterId} onClose={() => setShowInventoryModal(false)} />
              )}
            </div>
          )}

          {tab === "relationships" && (
            <div className="space-y-3">
              {(!relationships || relationships.length === 0) ? (
                <div className="text-center py-8 text-[var(--foreground-muted)]">No relationships yet</div>
              ) : (
                relationships.map((rel) => (
                  <div key={rel._id} className="rounded-xl bg-[var(--card)] p-3">
                    <div className="font-medium text-sm mb-2">{rel.npc?.name ?? "Unknown"}</div>
                    <div className="space-y-1.5 text-xs">
                      {[
                        { label: "Affinity", value: rel.affinity, color: "var(--accent-gold)", pct: Math.max(0, 50 + rel.affinity / 2) },
                        { label: "Trust", value: rel.trust, color: "var(--accent-blue)", pct: rel.trust },
                        { label: "Attraction", value: rel.attraction, color: "var(--accent-red)", pct: rel.attraction },
                      ].map((stat) => (
                        <div key={stat.label} className="flex items-center gap-2">
                          <span className="w-16 text-[var(--foreground-secondary)]">{stat.label}</span>
                          <div className="flex-1 h-2 rounded-full bg-[var(--background-tertiary)]">
                            <div className="h-full rounded-full transition-all" style={{ width: `${stat.pct}%`, backgroundColor: stat.color }} />
                          </div>
                          <span className="w-8 text-right">{stat.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
