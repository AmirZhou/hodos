"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { Zap, Clock, Loader2 } from "lucide-react";
import { getTechniqueById } from "../../../../convex/data/techniqueCatalog";
import type { TechniqueContext } from "../../../../convex/data/techniqueCatalog";

interface TechniqueBarProps {
  characterId: Id<"characters">;
  campaignId: Id<"campaigns">;
  context: TechniqueContext;
  onActivate: (techniqueId: string) => void;
}

export function TechniqueBar({
  characterId,
  campaignId,
  context,
  onActivate,
}: TechniqueBarProps) {
  const entityTechniques = useQuery(
    api.skills.getEntityTechniques,
    characterId
      ? { entityId: characterId, entityType: "character" as const, campaignId }
      : "skip",
  );

  // Filter to techniques valid for the current context
  const contextTechniques = useMemo(() => {
    if (!entityTechniques) return [];
    return entityTechniques
      .map((et) => {
        const def = getTechniqueById(et.techniqueId);
        if (!def) return null;
        if (!def.contexts.includes(context)) return null;
        return { entity: et, def };
      })
      .filter(
        (item): item is NonNullable<typeof item> => item !== null,
      );
  }, [entityTechniques, context]);

  if (!entityTechniques) {
    return null;
  }

  if (contextTechniques.length === 0) {
    return (
      <div className="rounded-lg bg-[var(--card)] border border-[var(--border)] px-4 py-3">
        <p className="text-center text-xs text-[var(--foreground-muted)]">
          No techniques available for {context}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-[var(--card)] border border-[var(--border)] p-2">
      <div className="flex items-center gap-2 overflow-x-auto">
        {contextTechniques.map(({ entity, def }) => {
          // Simple cooldown check: if cooldown > 0 and usesToday >= 1,
          // the technique is "on cooldown" for display purposes
          const isOnCooldown = def.cooldown > 0 && entity.usesToday >= def.cooldown;

          return (
            <button
              key={def.id}
              onClick={() => {
                if (!isOnCooldown) {
                  onActivate(def.id);
                }
              }}
              disabled={isOnCooldown}
              className={cn(
                "flex-shrink-0 flex flex-col items-center justify-center gap-1",
                "w-20 h-16 rounded-lg border transition-colors text-center",
                isOnCooldown
                  ? "border-[var(--border)] bg-[var(--background-secondary)] opacity-50 cursor-not-allowed"
                  : "border-[var(--border)] bg-[var(--background-secondary)] hover:border-[var(--accent-gold)]/50 hover:bg-[var(--card)] cursor-pointer",
              )}
            >
              {isOnCooldown ? (
                <>
                  <Clock className="h-3.5 w-3.5 text-[var(--foreground-muted)]" />
                  <span className="text-[10px] text-[var(--foreground-muted)] leading-tight px-1 truncate max-w-full">
                    {def.name}
                  </span>
                  <span className="text-[9px] text-[var(--accent-red)]">
                    CD: {def.cooldown}
                  </span>
                </>
              ) : (
                <>
                  <Zap className="h-3.5 w-3.5 text-[var(--accent-gold)]" />
                  <span className="text-[10px] text-[var(--foreground)] leading-tight px-1 truncate max-w-full">
                    {def.name}
                  </span>
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
