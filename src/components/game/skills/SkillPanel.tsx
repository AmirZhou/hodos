"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import {
  Swords,
  Sparkles,
  MessageCircle,
  Heart,
  Wrench,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import {
  ALL_SKILLS,
  getSkillById,
  TIER_LABELS,
  SKILL_CATEGORIES,
  type SkillCategory,
} from "../../../../convex/data/skillCatalog";
import { getTechniquesForSkill } from "../../../../convex/data/techniqueCatalog";
import { TechniqueCard } from "./TechniqueCard";

interface SkillPanelProps {
  characterId: Id<"characters">;
  campaignId: Id<"campaigns">;
}

const CATEGORY_ICONS: Record<SkillCategory, React.ReactNode> = {
  combat: <Swords className="h-4 w-4" />,
  magic: <Sparkles className="h-4 w-4" />,
  social: <MessageCircle className="h-4 w-4" />,
  intimate: <Heart className="h-4 w-4" />,
  utility: <Wrench className="h-4 w-4" />,
};

const CATEGORY_COLORS: Record<SkillCategory, string> = {
  combat: "text-[var(--accent-red)]",
  magic: "text-[var(--accent-purple)]",
  social: "text-[var(--accent-blue)]",
  intimate: "text-[var(--accent-red)]",
  utility: "text-[var(--accent-green)]",
};

export function SkillPanel({ characterId, campaignId }: SkillPanelProps) {
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(
    new Set(),
  );
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null);

  // Fetch entity skills and techniques from Convex
  const entitySkills = useQuery(
    api.skills.getEntitySkills,
    characterId
      ? { entityId: characterId, entityType: "character" as const, campaignId }
      : "skip",
  );
  const entityTechniques = useQuery(
    api.skills.getEntityTechniques,
    characterId
      ? { entityId: characterId, entityType: "character" as const, campaignId }
      : "skip",
  );

  // Build lookup maps
  const skillMap = useMemo(() => {
    if (!entitySkills) return new Map<string, { currentTier: number; ceiling: number; practiceXp: number; xpToNextTier: number }>();
    const m = new Map<string, { currentTier: number; ceiling: number; practiceXp: number; xpToNextTier: number }>();
    for (const es of entitySkills) {
      m.set(es.skillId, {
        currentTier: es.currentTier,
        ceiling: es.ceiling,
        practiceXp: es.practiceXp,
        xpToNextTier: es.xpToNextTier,
      });
    }
    return m;
  }, [entitySkills]);

  const techniqueMap = useMemo(() => {
    if (!entityTechniques) return new Map<string, { timesUsed: number }>();
    const m = new Map<string, { timesUsed: number }>();
    for (const et of entityTechniques) {
      m.set(et.techniqueId, { timesUsed: et.timesUsed });
    }
    return m;
  }, [entityTechniques]);

  const learnedTechniqueIds = useMemo(() => {
    return new Set(techniqueMap.keys());
  }, [techniqueMap]);

  // Group skills by category
  const skillsByCategory = useMemo(() => {
    const grouped = new Map<SkillCategory, typeof ALL_SKILLS>();
    for (const cat of SKILL_CATEGORIES) {
      grouped.set(cat, ALL_SKILLS.filter((s) => s.category === cat));
    }
    return grouped;
  }, []);

  const toggleCategory = (cat: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  };

  const toggleSkill = (skillId: string) => {
    setExpandedSkill((prev) => (prev === skillId ? null : skillId));
  };

  if (!entitySkills || !entityTechniques) {
    return (
      <div className="flex items-center justify-center py-12 text-[var(--foreground-muted)]">
        Loading skills...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {SKILL_CATEGORIES.map((category) => {
        const skills = skillsByCategory.get(category) ?? [];
        const isCollapsed = collapsedCategories.has(category);

        return (
          <div key={category}>
            {/* Category header */}
            <button
              onClick={() => toggleCategory(category)}
              className="flex items-center gap-2 w-full py-2 px-1 text-left hover:bg-[var(--background-secondary)]/50 rounded-lg transition-colors"
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4 text-[var(--foreground-muted)]" />
              ) : (
                <ChevronDown className="h-4 w-4 text-[var(--foreground-muted)]" />
              )}
              <span className={cn("flex items-center gap-1.5", CATEGORY_COLORS[category])}>
                {CATEGORY_ICONS[category]}
              </span>
              <span className="text-sm font-medium capitalize">
                {category}
              </span>
              <span className="text-xs text-[var(--foreground-muted)] ml-auto">
                {skills.length} skill{skills.length !== 1 ? "s" : ""}
              </span>
            </button>

            {/* Skills in this category */}
            {!isCollapsed && (
              <div className="space-y-2 pl-2">
                {skills.map((skillDef) => {
                  const entity = skillMap.get(skillDef.id);
                  const currentTier = entity?.currentTier ?? 0;
                  const ceiling = entity?.ceiling ?? 0;
                  const practiceXp = entity?.practiceXp ?? 0;
                  const xpToNextTier = entity?.xpToNextTier ?? 50;
                  const isMuted = currentTier === 0 && ceiling === 0;
                  const isExpanded = expandedSkill === skillDef.id;

                  // Count learned techniques for this skill
                  const allSkillTechniques = getTechniquesForSkill(skillDef.id);
                  const learnedCount = allSkillTechniques.filter((t) =>
                    learnedTechniqueIds.has(t.id),
                  ).length;

                  const xpPct =
                    xpToNextTier > 0
                      ? Math.min(100, (practiceXp / xpToNextTier) * 100)
                      : 0;

                  return (
                    <div key={skillDef.id}>
                      <button
                        onClick={() => toggleSkill(skillDef.id)}
                        className={cn(
                          "w-full rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 text-left transition-colors hover:border-[var(--accent-gold)]/30",
                          isMuted && "opacity-50",
                        )}
                      >
                        {/* Skill name and tier */}
                        <div className="flex items-center justify-between mb-1.5">
                          <span
                            className={cn(
                              "text-sm font-medium",
                              isMuted && "text-[var(--foreground-muted)]",
                            )}
                          >
                            {skillDef.name}
                          </span>
                          <span
                            className={cn(
                              "text-xs",
                              isMuted
                                ? "text-[var(--foreground-muted)]"
                                : "text-[var(--foreground-secondary)]",
                            )}
                          >
                            Tier {currentTier}{" "}
                            <span className="text-[var(--foreground-muted)]">
                              / {ceiling}
                            </span>
                            {TIER_LABELS[currentTier] && (
                              <span className="ml-1 text-[var(--accent-gold)]">
                                {TIER_LABELS[currentTier]}
                              </span>
                            )}
                          </span>
                        </div>

                        {/* XP progress bar */}
                        <div className="mb-1.5">
                          <div className="h-1.5 rounded-full bg-[var(--background-secondary)]">
                            <div
                              className="h-full rounded-full bg-[var(--accent-gold)] transition-all"
                              style={{ width: `${xpPct}%` }}
                            />
                          </div>
                          <div className="flex justify-between mt-0.5">
                            <span className="text-[10px] text-[var(--foreground-muted)]">
                              {practiceXp}/{xpToNextTier} XP
                            </span>
                          </div>
                        </div>

                        {/* Technique count */}
                        <div className="text-xs text-[var(--foreground-muted)]">
                          {learnedCount} technique{learnedCount !== 1 ? "s" : ""} learned
                          {allSkillTechniques.length > 0 && (
                            <span>
                              {" "}
                              / {allSkillTechniques.length} total
                            </span>
                          )}
                        </div>
                      </button>

                      {/* Expanded technique list */}
                      {isExpanded && allSkillTechniques.length > 0 && (
                        <div className="mt-2 ml-3 space-y-2">
                          {allSkillTechniques.map((tech) => (
                            <TechniqueCard
                              key={tech.id}
                              techniqueId={tech.id}
                              isLearned={learnedTechniqueIds.has(tech.id)}
                              timesUsed={
                                techniqueMap.get(tech.id)?.timesUsed ?? 0
                              }
                              skillTier={currentTier}
                              skillCeiling={ceiling}
                              learnedTechniques={learnedTechniqueIds}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
