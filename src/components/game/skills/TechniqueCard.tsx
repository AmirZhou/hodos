"use client";

import { cn } from "@/lib/utils";
import { getTechniqueById } from "../../../../convex/data/techniqueCatalog";
import { Lock, AlertTriangle, Zap } from "lucide-react";

interface TechniqueCardProps {
  techniqueId: string;
  isLearned: boolean;
  timesUsed?: number;
  skillTier: number;
  skillCeiling: number;
  learnedTechniques: Set<string>;
  onActivate?: (techniqueId: string) => void;
}

const CONTEXT_COLORS: Record<string, string> = {
  combat: "bg-[var(--accent-red)]/20 text-[var(--accent-red)]",
  scene: "bg-[var(--accent-purple)]/20 text-[var(--accent-purple)]",
  social: "bg-[var(--accent-blue)]/20 text-[var(--accent-blue)]",
  exploration: "bg-[var(--accent-green)]/20 text-[var(--accent-green)]",
};

export function TechniqueCard({
  techniqueId,
  isLearned,
  timesUsed = 0,
  skillTier,
  skillCeiling,
  learnedTechniques,
  onActivate,
}: TechniqueCardProps) {
  const technique = getTechniqueById(techniqueId);
  if (!technique) return null;

  const { name, tierRequired, description, contexts, cooldown, rollBonus, prerequisites } =
    technique;

  // Determine lock state
  const lockedByTier = !isLearned && skillTier < tierRequired;
  const lockedByCeiling = !isLearned && skillCeiling < tierRequired;
  const missingPrereqs = prerequisites.filter((p) => !learnedTechniques.has(p));
  const lockedByPrereq = !isLearned && missingPrereqs.length > 0;
  const isLocked = !isLearned;

  return (
    <div
      className={cn(
        "rounded-lg border p-3 transition-colors",
        isLearned
          ? "border-[var(--border)] bg-[var(--card)] hover:border-[var(--accent-gold)]/50 cursor-pointer"
          : "border-[var(--border)] bg-[var(--card)]/50 opacity-60",
      )}
      onClick={isLearned && onActivate ? () => onActivate(techniqueId) : undefined}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          {isLearned ? (
            <Zap className="h-3.5 w-3.5 text-[var(--accent-gold)]" />
          ) : (
            <Lock className="h-3.5 w-3.5 text-[var(--foreground-muted)]" />
          )}
          <span
            className={cn(
              "text-sm font-medium",
              isLocked && "text-[var(--foreground-muted)]",
            )}
          >
            {name}
          </span>
        </div>
        <span
          className={cn(
            "text-xs",
            isLocked
              ? "text-[var(--foreground-muted)]"
              : "text-[var(--foreground-secondary)]",
          )}
        >
          Tier {tierRequired}
        </span>
      </div>

      {/* Description */}
      <p
        className={cn(
          "text-xs mb-2",
          isLocked
            ? "text-[var(--foreground-muted)]"
            : "text-[var(--foreground-secondary)]",
        )}
      >
        {description}
      </p>

      {/* Context badges */}
      <div className="flex flex-wrap gap-1.5 mb-2">
        {contexts.map((ctx) => (
          <span
            key={ctx}
            className={cn(
              "px-1.5 py-0.5 rounded text-[10px] font-medium",
              CONTEXT_COLORS[ctx] ?? "bg-[var(--background-secondary)] text-[var(--foreground-secondary)]",
            )}
          >
            {ctx}
          </span>
        ))}
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-3 text-xs text-[var(--foreground-secondary)]">
        {rollBonus > 0 && (
          <span>
            Bonus: <span className="text-[var(--accent-gold)]">+{rollBonus}</span>
          </span>
        )}
        {cooldown > 0 && <span>Cooldown: {cooldown}</span>}
        {isLearned && timesUsed > 0 && (
          <span className="ml-auto text-[var(--foreground-muted)]">
            Used {timesUsed} time{timesUsed !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Lock reasons */}
      {isLocked && (
        <div className="mt-2 space-y-1">
          {lockedByCeiling && (
            <div className="flex items-center gap-1.5 text-[10px] text-[var(--accent-red)]">
              <AlertTriangle className="h-3 w-3" />
              <span>Ceiling too low — seek training</span>
            </div>
          )}
          {lockedByTier && !lockedByCeiling && (
            <div className="flex items-center gap-1.5 text-[10px] text-[var(--foreground-muted)]">
              <Lock className="h-3 w-3" />
              <span>Requires Tier {tierRequired}</span>
            </div>
          )}
          {lockedByPrereq && (
            <div className="flex items-center gap-1.5 text-[10px] text-[var(--foreground-muted)]">
              <Lock className="h-3 w-3" />
              <span>
                Requires:{" "}
                {missingPrereqs
                  .map((p) => getTechniqueById(p)?.name ?? p)
                  .join(", ")}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
