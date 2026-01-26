"use client";

import { cn } from "@/lib/utils";
import { Crown, User, Eye, RefreshCw, AlertTriangle } from "lucide-react";

interface Participant {
  entityId: string;
  entityType: "character" | "npc";
  role: "dominant" | "submissive" | "switch" | "observer";
  consentGiven: boolean;
  currentComfort: number;
  safewordUsed?: "yellow" | "red";
  entity: {
    name: string;
    portrait?: string;
  } | null;
}

interface ParticipantListProps {
  participants: Participant[];
  currentActorIndex: number;
  phase: "negotiation" | "active" | "aftercare" | "ended";
}

const roleIcons = {
  dominant: Crown,
  submissive: User,
  switch: RefreshCw,
  observer: Eye,
};

const roleLabels = {
  dominant: "Dominant",
  submissive: "Submissive",
  switch: "Switch",
  observer: "Observer",
};

const roleColors = {
  dominant: "var(--accent-purple)",
  submissive: "var(--accent-blue)",
  switch: "var(--accent-gold)",
  observer: "var(--foreground-muted)",
};

export function ParticipantList({
  participants,
  currentActorIndex,
  phase,
}: ParticipantListProps) {
  return (
    <div className="rounded-lg bg-[var(--card)] border border-[var(--border)] overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2 bg-[var(--background-secondary)] border-b border-[var(--border)]">
        <span className="font-medium text-sm">Participants</span>
      </div>

      {/* Participant List */}
      <div className="divide-y divide-[var(--border)]">
        {participants.map((participant, index) => {
          const isCurrent = index === currentActorIndex && phase === "active";
          const RoleIcon = roleIcons[participant.role];
          const comfortPercent = participant.currentComfort;

          return (
            <div
              key={participant.entityId}
              className={cn(
                "flex items-center gap-3 px-4 py-3",
                isCurrent && "bg-[var(--accent-gold)]/10"
              )}
            >
              {/* Turn/consent indicator */}
              <div className="flex-shrink-0">
                {phase === "negotiation" ? (
                  <div
                    className={cn(
                      "w-3 h-3 rounded-full",
                      participant.consentGiven
                        ? "bg-[var(--accent-green)]"
                        : "bg-[var(--foreground-muted)]"
                    )}
                    title={participant.consentGiven ? "Consented" : "Awaiting consent"}
                  />
                ) : (
                  <div
                    className={cn(
                      "w-3 h-3 rounded-full",
                      isCurrent ? "bg-[var(--accent-gold)]" : "bg-transparent"
                    )}
                  />
                )}
              </div>

              {/* Portrait */}
              <div
                className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: roleColors[participant.role] }}
              >
                {participant.entity?.name?.[0] ?? "?"}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">
                    {participant.entity?.name ?? "Unknown"}
                  </span>
                  {participant.entityType === "npc" && (
                    <span className="text-xs text-[var(--foreground-muted)]">NPC</span>
                  )}
                  {participant.safewordUsed && (
                    <span
                      className={cn(
                        "text-xs px-1 rounded",
                        participant.safewordUsed === "red"
                          ? "bg-[var(--accent-red)]/20 text-[var(--accent-red)]"
                          : "bg-[var(--accent-gold)]/20 text-[var(--accent-gold)]"
                      )}
                    >
                      {participant.safewordUsed.toUpperCase()}
                    </span>
                  )}
                </div>

                {/* Role */}
                <div className="flex items-center gap-1 mt-0.5">
                  <RoleIcon
                    className="h-3 w-3"
                    style={{ color: roleColors[participant.role] }}
                  />
                  <span
                    className="text-xs"
                    style={{ color: roleColors[participant.role] }}
                  >
                    {roleLabels[participant.role]}
                  </span>
                </div>

                {/* Comfort bar (only in active phase) */}
                {phase === "active" && (
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1.5 rounded-full bg-[var(--background-tertiary)]">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          comfortPercent > 60
                            ? "bg-[var(--accent-green)]"
                            : comfortPercent > 30
                            ? "bg-[var(--accent-gold)]"
                            : "bg-[var(--accent-red)]"
                        )}
                        style={{ width: `${comfortPercent}%` }}
                      />
                    </div>
                    <span className="text-xs text-[var(--foreground-muted)] w-8 text-right">
                      {comfortPercent}%
                    </span>
                  </div>
                )}
              </div>

              {/* Warning if comfort is low */}
              {phase === "active" && comfortPercent < 40 && (
                <span title="Comfort is getting low - consider checking in">
                  <AlertTriangle
                    className="h-4 w-4 text-[var(--accent-gold)] flex-shrink-0"
                  />
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Phase indicator */}
      <div className="px-4 py-2 bg-[var(--background-secondary)] border-t border-[var(--border)] text-center">
        <span
          className={cn(
            "text-xs font-medium px-2 py-1 rounded",
            phase === "negotiation" && "bg-[var(--accent-blue)]/20 text-[var(--accent-blue)]",
            phase === "active" && "bg-[var(--accent-purple)]/20 text-[var(--accent-purple)]",
            phase === "aftercare" && "bg-[var(--accent-green)]/20 text-[var(--accent-green)]",
            phase === "ended" && "bg-[var(--foreground-muted)]/20 text-[var(--foreground-muted)]"
          )}
        >
          {phase === "negotiation" && "Negotiating"}
          {phase === "active" && "Scene Active"}
          {phase === "aftercare" && "Aftercare"}
          {phase === "ended" && "Scene Ended"}
        </span>
      </div>
    </div>
  );
}
