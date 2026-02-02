"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Lock,
  Check,
  GraduationCap,
  Loader2,
  AlertTriangle,
  Scroll,
  ShieldCheck,
} from "lucide-react";
import {
  getTechniqueById,
  type TechniqueDefinition,
} from "../../../../convex/data/techniqueCatalog";
import {
  getSkillById,
  TIER_LABELS,
} from "../../../../convex/data/skillCatalog";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TrainingStatus = "idle" | "training" | "success" | "error";

interface TeachingOptionView {
  _id: string;
  techniqueId: string;
  skillId: string;
  trustRequired: number;
  ceilingGrant: number;
  questPrerequisite?: string;
  technique: TechniqueDefinition;
  skillName: string;
  isAlreadyLearned: boolean;
  hasSufficientTrust: boolean;
  needsCeilingRaise: boolean;
  isQuestLocked: boolean;
  canTrain: boolean;
}

// ---------------------------------------------------------------------------
// TrainingPanel — inline content (no modal overlay)
// ---------------------------------------------------------------------------

interface TrainingPanelProps {
  npcId: Id<"npcs">;
  npcName: string;
  characterId: Id<"characters">;
  campaignId: Id<"campaigns">;
}

export function TrainingPanel({
  npcId,
  npcName,
  characterId,
  campaignId,
}: TrainingPanelProps) {
  // ---- State ----
  const [trainingStatus, setTrainingStatus] = useState<TrainingStatus>("idle");
  const [trainingTarget, setTrainingTarget] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // ---- Data queries ----
  const teachingOptions = useQuery(api.skills.getTeachingOptions, { npcId });
  const entitySkills = useQuery(api.skills.getEntitySkills, {
    entityId: characterId,
    entityType: "character" as const,
    campaignId,
  });
  const entityTechniques = useQuery(api.skills.getEntityTechniques, {
    entityId: characterId,
    entityType: "character" as const,
    campaignId,
  });
  const relationship = useQuery(api.relationships.get, {
    characterId,
    npcId,
  });

  // ---- Mutations ----
  const raiseCeiling = useMutation(api.skills.raiseCeiling);
  const learnTechnique = useMutation(api.skills.learnTechnique);

  // ---- Derived data ----
  const currentTrust = relationship?.trust ?? 0;

  const skillMap = useMemo(() => {
    if (!entitySkills) return new Map<string, { currentTier: number; ceiling: number }>();
    const m = new Map<string, { currentTier: number; ceiling: number }>();
    for (const es of entitySkills) {
      m.set(es.skillId, { currentTier: es.currentTier, ceiling: es.ceiling });
    }
    return m;
  }, [entitySkills]);

  const learnedTechniqueIds = useMemo(() => {
    if (!entityTechniques) return new Set<string>();
    return new Set(entityTechniques.map((et) => et.techniqueId));
  }, [entityTechniques]);

  // Build enriched view models for each teaching option
  const options: TeachingOptionView[] = useMemo(() => {
    if (!teachingOptions) return [];

    const result: TeachingOptionView[] = [];

    for (const opt of teachingOptions) {
      const technique = getTechniqueById(opt.techniqueId);
      if (!technique) continue;

      const skillDef = getSkillById(opt.skillId);
      const skillName = skillDef?.name ?? opt.skillId;

      const isAlreadyLearned = learnedTechniqueIds.has(opt.techniqueId);
      const hasSufficientTrust = currentTrust >= opt.trustRequired;
      const isQuestLocked = !!opt.questPrerequisite;

      // Check if ceiling needs to be raised for this technique
      const currentSkill = skillMap.get(opt.skillId);
      const currentCeiling = currentSkill?.ceiling ?? 0;
      const needsCeilingRaise = currentCeiling < opt.ceilingGrant;

      // Can train if: not already learned, trust sufficient, no quest lock
      const canTrain =
        !isAlreadyLearned && hasSufficientTrust && !isQuestLocked;

      result.push({
        _id: opt._id as string,
        techniqueId: opt.techniqueId,
        skillId: opt.skillId,
        trustRequired: opt.trustRequired,
        ceilingGrant: opt.ceilingGrant,
        questPrerequisite: opt.questPrerequisite,
        technique,
        skillName,
        isAlreadyLearned,
        hasSufficientTrust,
        needsCeilingRaise,
        isQuestLocked,
        canTrain,
      });
    }

    return result;
  }, [teachingOptions, learnedTechniqueIds, currentTrust, skillMap]);

  // Auto-clear success message after 3 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // ---- Handlers ----
  const handleTrain = useCallback(
    async (option: TeachingOptionView) => {
      if (!option.canTrain) return;

      setTrainingStatus("training");
      setTrainingTarget(option.techniqueId);
      setErrorMessage(null);
      setSuccessMessage(null);

      try {
        // Step 1: Raise ceiling if needed
        if (option.needsCeilingRaise) {
          await raiseCeiling({
            characterId,
            campaignId,
            skillId: option.skillId,
            newCeiling: option.ceilingGrant,
            source: "npc_training",
            sourceId: npcId,
          });
        }

        // Step 2: Learn the technique
        await learnTechnique({
          entityId: characterId,
          entityType: "character" as const,
          campaignId,
          techniqueId: option.techniqueId,
        });

        setTrainingStatus("success");
        setSuccessMessage(
          `Learned ${option.technique.name}!`,
        );
      } catch (err) {
        setTrainingStatus("error");
        setErrorMessage(
          err instanceof Error
            ? err.message
            : "Training failed. Please try again.",
        );
      } finally {
        setTrainingTarget(null);
        // Reset status to idle after a brief delay (for success/error display)
        setTimeout(() => {
          setTrainingStatus((prev) =>
            prev === "training" ? "idle" : prev,
          );
        }, 300);
      }
    },
    [characterId, campaignId, npcId, raiseCeiling, learnTechnique],
  );

  // ---- Loading state ----
  const isLoading =
    teachingOptions === undefined ||
    entitySkills === undefined ||
    entityTechniques === undefined;

  // ---- Render ----
  return (
    <div>
      {/* Trust bar */}
      {relationship !== undefined && (
        <div className="py-2 mb-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-[var(--foreground-secondary)]">
              Your trust with {npcName}
            </span>
            <span className="font-medium text-[var(--foreground)]">
              {currentTrust}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-[var(--background)] border border-[var(--border)]">
            <div
              className="h-full rounded-full bg-[var(--accent-green)] transition-all"
              style={{ width: `${Math.min(100, currentTrust)}%` }}
            />
          </div>
        </div>
      )}

      {/* Success / Error messages */}
      {successMessage && (
        <div className="mb-3 flex items-center gap-2 rounded-lg bg-[var(--accent-green)]/15 border border-[var(--accent-green)]/30 px-3 py-2 text-sm text-[var(--accent-green)]">
          <Check className="h-4 w-4 shrink-0" />
          {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="mb-3 flex items-center gap-2 rounded-lg bg-[var(--accent-red)]/15 border border-[var(--accent-red)]/30 px-3 py-2 text-sm text-[var(--accent-red)]">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {errorMessage}
        </div>
      )}

      {/* Content */}
      <div className="space-y-3">
        {isLoading ? (
          <LoadingSkeleton />
        ) : options.length === 0 ? (
          <div className="text-center py-8 text-[var(--foreground-secondary)]">
            <GraduationCap className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">
              {npcName} has nothing to teach right now.
            </p>
          </div>
        ) : (
          options.map((option) => (
            <TeachingOptionCard
              key={option._id}
              option={option}
              currentTrust={currentTrust}
              isTraining={
                trainingStatus === "training" &&
                trainingTarget === option.techniqueId
              }
              onTrain={() => handleTrain(option)}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TrainingDialog — standalone modal wrapper around TrainingPanel
// ---------------------------------------------------------------------------

export function TrainingDialog({
  npcId,
  npcName,
  characterId,
  campaignId,
  onClose,
}: TrainingDialogProps) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl bg-[var(--card)] border border-[var(--border)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-[var(--accent-gold)]" />
            <h2 className="font-bold text-lg text-[var(--foreground)]">
              Train with {npcName}
            </h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Panel content */}
        <div className="p-4 max-h-[60vh] overflow-y-auto">
          <TrainingPanel
            npcId={npcId}
            npcName={npcName}
            characterId={characterId}
            campaignId={campaignId}
          />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Teaching Option Card
// ---------------------------------------------------------------------------

function TeachingOptionCard({
  option,
  currentTrust,
  isTraining,
  onTrain,
}: {
  option: TeachingOptionView;
  currentTrust: number;
  isTraining: boolean;
  onTrain: () => void;
}) {
  const {
    technique,
    skillName,
    ceilingGrant,
    trustRequired,
    isAlreadyLearned,
    hasSufficientTrust,
    isQuestLocked,
    questPrerequisite,
    canTrain,
    needsCeilingRaise,
  } = option;

  const tierLabel = TIER_LABELS[ceilingGrant] ?? `Tier ${ceilingGrant}`;

  return (
    <div
      className={cn(
        "rounded-lg border p-4 transition-colors",
        isAlreadyLearned
          ? "border-[var(--accent-green)]/30 bg-[var(--accent-green)]/5"
          : canTrain
            ? "border-[var(--border)] bg-[var(--card)] hover:border-[var(--accent-gold)]/40"
            : "border-[var(--border)] bg-[var(--card)]/50 opacity-70",
      )}
    >
      {/* Title row */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          {isAlreadyLearned ? (
            <Check className="h-4 w-4 text-[var(--accent-green)]" />
          ) : canTrain ? (
            <GraduationCap className="h-4 w-4 text-[var(--accent-gold)]" />
          ) : (
            <Lock className="h-4 w-4 text-[var(--foreground-secondary)]" />
          )}
          <span
            className={cn(
              "text-sm font-semibold",
              isAlreadyLearned && "text-[var(--accent-green)]",
            )}
          >
            {technique.name}
          </span>
          <span className="text-xs text-[var(--foreground-secondary)]">
            ({skillName})
          </span>
        </div>
        {isAlreadyLearned && (
          <span className="text-xs text-[var(--accent-green)] font-medium">
            Learned
          </span>
        )}
      </div>

      {/* Description */}
      <p className="text-xs text-[var(--foreground-secondary)] mb-2 ml-6">
        {technique.description}
      </p>

      {/* Details row */}
      <div className="ml-6 space-y-1.5">
        {/* Ceiling grant */}
        {needsCeilingRaise && !isAlreadyLearned && (
          <div className="flex items-center gap-1.5 text-xs text-[var(--foreground-secondary)]">
            <ShieldCheck className="h-3.5 w-3.5 text-[var(--accent-purple)]" />
            <span>
              Ceiling raised to:{" "}
              <span className="text-[var(--accent-purple)] font-medium">
                {ceilingGrant} ({tierLabel})
              </span>
            </span>
          </div>
        )}

        {/* Trust requirement */}
        {!isAlreadyLearned && (
          <div
            className={cn(
              "flex items-center gap-1.5 text-xs",
              hasSufficientTrust
                ? "text-[var(--accent-green)]"
                : "text-[var(--accent-red)]",
            )}
          >
            {hasSufficientTrust ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Lock className="h-3.5 w-3.5" />
            )}
            <span>
              Trust: {trustRequired} required (you: {currentTrust})
            </span>
          </div>
        )}

        {/* Quest prerequisite */}
        {isQuestLocked && !isAlreadyLearned && (
          <div className="flex items-center gap-1.5 text-xs text-[var(--accent-red)]">
            <Scroll className="h-3.5 w-3.5" />
            <span>Requires quest: {questPrerequisite}</span>
          </div>
        )}
      </div>

      {/* Train button */}
      {!isAlreadyLearned && (
        <div className="mt-3 ml-6">
          <Button
            size="sm"
            disabled={!canTrain || isTraining}
            onClick={onTrain}
            className={cn(
              !canTrain && "opacity-50 cursor-not-allowed",
            )}
          >
            {isTraining ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                Training...
              </>
            ) : (
              "Train"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loading Skeleton
// ---------------------------------------------------------------------------

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 animate-pulse"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="h-4 w-4 rounded bg-[var(--background)] " />
            <div className="h-4 w-32 rounded bg-[var(--background)]" />
            <div className="h-3 w-20 rounded bg-[var(--background)]" />
          </div>
          <div className="ml-6 space-y-1.5">
            <div className="h-3 w-full rounded bg-[var(--background)]" />
            <div className="h-3 w-3/4 rounded bg-[var(--background)]" />
          </div>
          <div className="mt-3 ml-6">
            <div className="h-8 w-16 rounded bg-[var(--background)]" />
          </div>
        </div>
      ))}
    </div>
  );
}
