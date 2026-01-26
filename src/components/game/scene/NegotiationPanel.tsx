"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, X, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface NegotiationPanelProps {
  participantName: string;
  availableActivities: string[];
  onSubmit: (consent: {
    consentGiven: boolean;
    limits: string[];
    activities: string[];
  }) => void;
}

const activityCategories = {
  gentle: {
    label: "Gentle",
    activities: ["tease", "verbal", "service"],
  },
  moderate: {
    label: "Moderate",
    activities: ["restrain", "sensation", "worship"],
  },
  intense: {
    label: "Intense",
    activities: ["impact", "edge", "deny"],
  },
};

const activityLabels: Record<string, { label: string; description: string }> = {
  tease: { label: "Teasing", description: "Light, playful teasing" },
  verbal: { label: "Verbal Play", description: "Dirty talk, commands, praise/degradation" },
  service: { label: "Service", description: "Performing tasks for pleasure" },
  restrain: { label: "Restraint", description: "Bondage, restriction of movement" },
  sensation: { label: "Sensation Play", description: "Temperature, texture, tickling" },
  worship: { label: "Worship", description: "Body worship, devotion" },
  impact: { label: "Impact Play", description: "Spanking, flogging, etc." },
  edge: { label: "Edging", description: "Building arousal without release" },
  deny: { label: "Denial", description: "Withholding pleasure or release" },
  reward: { label: "Rewards", description: "Providing pleasure as reward" },
};

export function NegotiationPanel({
  participantName,
  availableActivities,
  onSubmit,
}: NegotiationPanelProps) {
  const [selectedActivities, setSelectedActivities] = useState<Set<string>>(new Set());
  const [limits, setLimits] = useState<Set<string>>(new Set());

  const toggleActivity = (activity: string) => {
    const newSelected = new Set(selectedActivities);
    const newLimits = new Set(limits);

    if (newSelected.has(activity)) {
      newSelected.delete(activity);
    } else if (newLimits.has(activity)) {
      // If it's a limit, remove from limits
      newLimits.delete(activity);
    } else {
      newSelected.add(activity);
    }

    setSelectedActivities(newSelected);
    setLimits(newLimits);
  };

  const toggleLimit = (activity: string) => {
    const newSelected = new Set(selectedActivities);
    const newLimits = new Set(limits);

    if (newLimits.has(activity)) {
      newLimits.delete(activity);
    } else {
      // Remove from selected if it was there
      newSelected.delete(activity);
      newLimits.add(activity);
    }

    setSelectedActivities(newSelected);
    setLimits(newLimits);
  };

  const handleConsent = () => {
    onSubmit({
      consentGiven: true,
      limits: Array.from(limits),
      activities: Array.from(selectedActivities),
    });
  };

  const handleDecline = () => {
    onSubmit({
      consentGiven: false,
      limits: [],
      activities: [],
    });
  };

  return (
    <div className="rounded-lg bg-[var(--card)] border border-[var(--border)] overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-[var(--background-secondary)] border-b border-[var(--border)]">
        <h2 className="text-lg font-bold">Scene Negotiation</h2>
        <p className="text-sm text-[var(--foreground-secondary)] mt-1">
          {participantName}, select activities you&apos;re comfortable with.
          Mark any hard limits.
        </p>
      </div>

      {/* Activity selection */}
      <div className="p-6 space-y-6">
        {Object.entries(activityCategories).map(([categoryKey, category]) => (
          <div key={categoryKey}>
            <h3 className="text-sm font-medium text-[var(--foreground-secondary)] mb-3">
              {category.label} Activities
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {category.activities.map((activity) => {
                const info = activityLabels[activity];
                const isSelected = selectedActivities.has(activity);
                const isLimit = limits.has(activity);
                const isAvailable = availableActivities.includes(activity);

                return (
                  <div
                    key={activity}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                      isSelected && "border-[var(--accent-green)] bg-[var(--accent-green)]/10",
                      isLimit && "border-[var(--accent-red)] bg-[var(--accent-red)]/10",
                      !isSelected && !isLimit && "border-[var(--border)] hover:bg-[var(--background-tertiary)]"
                    )}
                  >
                    <div className="flex-1">
                      <div className="font-medium text-sm">{info?.label ?? activity}</div>
                      <div className="text-xs text-[var(--foreground-muted)] mt-0.5">
                        {info?.description}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        className={cn(
                          "p-1.5 rounded-full transition-colors",
                          isSelected
                            ? "bg-[var(--accent-green)] text-white"
                            : "bg-[var(--background-tertiary)] text-[var(--foreground-muted)] hover:bg-[var(--accent-green)]/20"
                        )}
                        onClick={() => toggleActivity(activity)}
                        title="Add to scene"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button
                        className={cn(
                          "p-1.5 rounded-full transition-colors",
                          isLimit
                            ? "bg-[var(--accent-red)] text-white"
                            : "bg-[var(--background-tertiary)] text-[var(--foreground-muted)] hover:bg-[var(--accent-red)]/20"
                        )}
                        onClick={() => toggleLimit(activity)}
                        title="Mark as limit"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Summary */}
        <div className="pt-4 border-t border-[var(--border)]">
          <div className="flex flex-wrap gap-2 mb-4">
            {selectedActivities.size > 0 && (
              <div className="text-sm">
                <span className="text-[var(--foreground-muted)]">Consenting to: </span>
                {Array.from(selectedActivities).map((a) => (
                  <span
                    key={a}
                    className="inline-block px-2 py-0.5 rounded bg-[var(--accent-green)]/20 text-[var(--accent-green)] text-xs mr-1"
                  >
                    {activityLabels[a]?.label ?? a}
                  </span>
                ))}
              </div>
            )}
            {limits.size > 0 && (
              <div className="text-sm">
                <span className="text-[var(--foreground-muted)]">Hard limits: </span>
                {Array.from(limits).map((l) => (
                  <span
                    key={l}
                    className="inline-block px-2 py-0.5 rounded bg-[var(--accent-red)]/20 text-[var(--accent-red)] text-xs mr-1"
                  >
                    {activityLabels[l]?.label ?? l}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Warning */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-[var(--accent-gold)]/10 border border-[var(--accent-gold)]/30 mb-4">
            <AlertTriangle className="h-4 w-4 text-[var(--accent-gold)] flex-shrink-0 mt-0.5" />
            <p className="text-xs text-[var(--foreground-secondary)]">
              You can use the safeword at any time during the scene.
              <strong> Yellow</strong> pauses and reduces intensity.
              <strong> Red</strong> stops immediately and begins aftercare.
            </p>
          </div>

          {/* Consent buttons */}
          <div className="flex gap-3">
            <Button
              className="flex-1 bg-[var(--accent-green)] hover:bg-[var(--accent-green)]/90"
              onClick={handleConsent}
              disabled={selectedActivities.size === 0}
            >
              <Check className="h-4 w-4 mr-2" />
              I Consent
            </Button>
            <Button
              variant="outline"
              className="border-[var(--accent-red)] text-[var(--accent-red)] hover:bg-[var(--accent-red)]/10"
              onClick={handleDecline}
            >
              <X className="h-4 w-4 mr-2" />
              Decline
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
