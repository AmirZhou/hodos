"use client";

import { Button } from "@/components/ui/button";
import { Heart, Coffee, MessageSquare, Sparkles } from "lucide-react";

interface AftercareViewProps {
  peakIntensity: number;
  safewordUsed: boolean;
  participantNames: string[];
  onComplete: () => void;
}

export function AftercareView({
  peakIntensity,
  safewordUsed,
  participantNames,
  onComplete,
}: AftercareViewProps) {
  // Calculate relationship bonus preview
  const baseBonus = safewordUsed
    ? Math.floor(peakIntensity / 10)
    : Math.floor(peakIntensity / 5);
  const trustBonus = safewordUsed ? baseBonus + 10 : baseBonus;
  const intimacyBonus = baseBonus * 2;

  return (
    <div className="rounded-lg bg-[var(--card)] border border-[var(--border)] overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-gradient-to-r from-[var(--accent-purple)]/20 to-[var(--accent-blue)]/20 border-b border-[var(--border)]">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-[var(--accent-purple)]/20">
            <Coffee className="h-6 w-6 text-[var(--accent-purple)]" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Aftercare</h2>
            <p className="text-sm text-[var(--foreground-secondary)]">
              Take time to reconnect and care for each other
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Scene summary */}
        <div className="space-y-3">
          <h3 className="font-medium flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[var(--accent-gold)]" />
            Scene Summary
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-[var(--background-tertiary)]">
              <div className="text-2xl font-bold text-[var(--accent-purple)]">
                {peakIntensity}%
              </div>
              <div className="text-xs text-[var(--foreground-muted)]">
                Peak Intensity
              </div>
            </div>
            <div className="p-3 rounded-lg bg-[var(--background-tertiary)]">
              <div className="text-2xl font-bold">
                {participantNames.length}
              </div>
              <div className="text-xs text-[var(--foreground-muted)]">
                Participants
              </div>
            </div>
          </div>

          {safewordUsed && (
            <div className="p-3 rounded-lg bg-[var(--accent-green)]/10 border border-[var(--accent-green)]/30">
              <p className="text-sm text-[var(--accent-green)]">
                A safeword was used and respected. This builds extra trust.
              </p>
            </div>
          )}
        </div>

        {/* Relationship bonuses */}
        <div className="space-y-3">
          <h3 className="font-medium flex items-center gap-2">
            <Heart className="h-4 w-4 text-[var(--accent-red)]" />
            Relationship Bonuses
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--background-tertiary)]">
              <span className="text-sm">Trust</span>
              <span className="text-sm font-bold text-[var(--accent-blue)]">
                +{trustBonus}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--background-tertiary)]">
              <span className="text-sm">Intimacy</span>
              <span className="text-sm font-bold text-[var(--accent-purple)]">
                +{intimacyBonus}
              </span>
            </div>
          </div>
          <p className="text-xs text-[var(--foreground-muted)]">
            Bonuses will be applied to relationships between characters and NPCs
            when aftercare is complete.
          </p>
        </div>

        {/* Aftercare suggestions */}
        <div className="space-y-3">
          <h3 className="font-medium flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-[var(--accent-blue)]" />
            Aftercare Activities
          </h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="p-2 rounded bg-[var(--background-tertiary)] text-center">
              Cuddling
            </div>
            <div className="p-2 rounded bg-[var(--background-tertiary)] text-center">
              Hydration
            </div>
            <div className="p-2 rounded bg-[var(--background-tertiary)] text-center">
              Gentle conversation
            </div>
            <div className="p-2 rounded bg-[var(--background-tertiary)] text-center">
              Reassurance
            </div>
            <div className="p-2 rounded bg-[var(--background-tertiary)] text-center">
              Snacks
            </div>
            <div className="p-2 rounded bg-[var(--background-tertiary)] text-center">
              Rest together
            </div>
          </div>
        </div>

        {/* Complete button */}
        <Button
          className="w-full bg-[var(--accent-green)] hover:bg-[var(--accent-green)]/90"
          onClick={onComplete}
        >
          <Heart className="h-4 w-4 mr-2" />
          Complete Aftercare
        </Button>
      </div>
    </div>
  );
}
