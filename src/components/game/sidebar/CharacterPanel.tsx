"use client";

import { Heart, Shield, Zap, Target } from "lucide-react";

const ABILITY_LABELS_SHORT = ["STR", "DEX", "CON", "INT", "WIS", "CHA"] as const;
const ABILITY_KEYS = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"] as const;

function abilityMod(score: number): number {
  return Math.floor((score - 10) / 2);
}

function modStr(mod: number): string {
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

function AbilityCard({ label, score }: { label: string; score: number }) {
  const mod = abilityMod(score);
  const modColor = mod > 0 ? "text-[var(--accent-gold)]" : mod < 0 ? "text-[var(--accent-red)]" : "text-[var(--foreground-muted)]";
  return (
    <div className="rounded-md bg-[var(--background-tertiary)] py-1.5 px-1 text-center">
      <div className="text-[8px] text-[var(--foreground-muted)] leading-none">{label}</div>
      <div className="text-xs font-bold mt-0.5">{score}</div>
      <div className={`text-[9px] leading-none mt-0.5 ${modColor}`}>{modStr(mod)}</div>
    </div>
  );
}

interface CharacterPanelProps {
  character: {
    name: string;
    portraitUrl?: string;
    level: number;
    class?: string;
    hp: number;
    maxHp: number;
    xp: number;
    ac: number;
    speed: number;
    proficiencyBonus: number;
    abilities: Record<string, number>;
  };
  onOpenCharSheet?: () => void;
}

export function CharacterPanel({ character, onOpenCharSheet }: CharacterPanelProps) {
  const hpPct = Math.max(0, (character.hp / character.maxHp) * 100);
  const xpNeeded = character.level * 1000;
  const xpPct = Math.min(100, (character.xp / xpNeeded) * 100);

  return (
    <div className="rounded-xl bg-[var(--card)] overflow-hidden">
      {/* Header */}
      <div
        onClick={onOpenCharSheet}
        className="cursor-pointer p-3 hover:bg-[var(--background-tertiary)] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-full border-2 border-[var(--accent-gold)] bg-[var(--background-tertiary)] flex items-center justify-center text-lg font-bold text-[var(--accent-gold)] overflow-hidden">
            {character.portraitUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={character.portraitUrl} alt={character.name} className="w-full h-full object-cover" />
            ) : (
              character.name[0]
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-sm">{character.name}</h2>
              <span className="text-[10px] text-[var(--foreground-muted)]">Lv {character.level}</span>
            </div>
            <p className="text-[11px] text-[var(--foreground-secondary)]">
              {character.class || "Character"}
            </p>
          </div>
        </div>

        {/* HP + XP compact bars */}
        <div className="mt-2.5 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[var(--accent-red)] w-16 flex items-center gap-1 shrink-0">
              <Heart className="h-2.5 w-2.5" /> {character.hp}/{character.maxHp}
            </span>
            <div className="flex-1 h-1.5 rounded-full bg-[var(--background-tertiary)]">
              <div className="h-full rounded-full bg-[var(--accent-red)] transition-all" style={{ width: `${hpPct}%` }} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[var(--accent-green)] w-16 shrink-0">
              XP {character.xp}
            </span>
            <div className="flex-1 h-1.5 rounded-full bg-[var(--background-tertiary)]">
              <div className="h-full rounded-full bg-[var(--accent-green)] transition-all" style={{ width: `${xpPct}%` }} />
            </div>
            <span className="text-[9px] text-[var(--foreground-muted)] shrink-0">{xpNeeded - character.xp} to Lv {character.level + 1}</span>
          </div>
        </div>

        {/* Inline AC / Speed / PB */}
        <div className="mt-2.5 flex items-center gap-3 text-[11px]">
          <span className="flex items-center gap-1 text-[var(--accent-blue)]">
            <Shield className="h-3 w-3" /> {character.ac}
          </span>
          <span className="flex items-center gap-1 text-[var(--accent-blue)]">
            <Zap className="h-3 w-3" /> {character.speed}ft
          </span>
          <span className="flex items-center gap-1 text-[var(--accent-blue)]">
            <Target className="h-3 w-3" /> +{character.proficiencyBonus}
          </span>
        </div>
      </div>

      {/* Ability Scores */}
      <div className="px-3 pb-3 pt-2 border-t border-[var(--border)]">
        <div className="grid grid-cols-6 gap-1.5">
          {ABILITY_KEYS.map((key, i) => (
            <AbilityCard key={key} label={ABILITY_LABELS_SHORT[i]} score={character.abilities[key]} />
          ))}
        </div>
      </div>
    </div>
  );
}
