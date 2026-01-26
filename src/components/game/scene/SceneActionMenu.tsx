"use client";

import { Button } from "@/components/ui/button";
import {
  Flame,
  Link,
  Zap,
  Target,
  MessageSquare,
  Heart,
  Hand,
  TrendingUp,
  Ban,
  Gift,
  Coffee,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SceneAction {
  type: string;
  label: string;
  intensityRange: [number, number];
  forRoles: string[];
}

interface SceneActionMenuProps {
  availableActions: SceneAction[];
  currentIntensity: number;
  role: string;
  isMyTurn: boolean;
  onAction: (actionType: string) => void;
}

const actionIcons: Record<string, React.ReactNode> = {
  tease: <Flame className="h-4 w-4" />,
  restrain: <Link className="h-4 w-4" />,
  sensation: <Zap className="h-4 w-4" />,
  impact: <Target className="h-4 w-4" />,
  verbal: <MessageSquare className="h-4 w-4" />,
  service: <Heart className="h-4 w-4" />,
  worship: <Hand className="h-4 w-4" />,
  edge: <TrendingUp className="h-4 w-4" />,
  deny: <Ban className="h-4 w-4" />,
  reward: <Gift className="h-4 w-4" />,
  aftercare: <Coffee className="h-4 w-4" />,
  check_in: <HelpCircle className="h-4 w-4" />,
};

const actionDescriptions: Record<string, string> = {
  tease: "Light, playful teasing to build anticipation",
  restrain: "Restrict movement or apply bondage",
  sensation: "Apply varied sensations (temperature, texture)",
  impact: "Striking actions (spanking, flogging)",
  verbal: "Commands, praise, degradation, or dirty talk",
  service: "Perform an act of service or devotion",
  worship: "Show devotion through worship",
  edge: "Build arousal toward the edge",
  deny: "Withhold pleasure or release",
  reward: "Grant pleasure as a reward",
  aftercare: "Begin winding down and aftercare",
  check_in: "Pause to check in with partner",
};

const actionIntensityDeltas: Record<string, number> = {
  tease: 5,
  restrain: 8,
  sensation: 7,
  impact: 10,
  verbal: 3,
  service: 4,
  worship: 6,
  edge: 12,
  deny: 8,
  reward: -5,
  aftercare: -15,
  check_in: -2,
};

export function SceneActionMenu({
  availableActions,
  currentIntensity,
  role,
  isMyTurn,
  onAction,
}: SceneActionMenuProps) {
  // Group actions by intensity effect
  const increasingActions = availableActions.filter(
    (a) => (actionIntensityDeltas[a.type] ?? 0) > 0
  );
  const neutralActions = availableActions.filter(
    (a) => (actionIntensityDeltas[a.type] ?? 0) === 0
  );
  const decreasingActions = availableActions.filter(
    (a) => (actionIntensityDeltas[a.type] ?? 0) < 0
  );

  if (!isMyTurn) {
    return (
      <div className="rounded-lg bg-[var(--card)] border border-[var(--border)] p-6">
        <p className="text-center text-[var(--foreground-secondary)]">
          Waiting for your turn...
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-[var(--card)] border border-[var(--border)] overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-[var(--background-secondary)] border-b border-[var(--border)]">
        <div className="flex items-center justify-between">
          <span className="font-medium">Your Turn</span>
          <span className="text-sm text-[var(--foreground-secondary)]">
            Role: <span className="capitalize">{role}</span>
          </span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Increasing intensity actions */}
        {increasingActions.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-[var(--foreground-muted)] mb-2 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Increase Intensity
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {increasingActions.map((action) => (
                <Button
                  key={action.type}
                  variant="outline"
                  className="justify-start gap-2 h-auto py-2 px-3"
                  onClick={() => onAction(action.type)}
                >
                  {actionIcons[action.type]}
                  <div className="text-left">
                    <div className="text-sm">{action.label}</div>
                    <div className="text-xs text-[var(--foreground-muted)]">
                      +{actionIntensityDeltas[action.type]}
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Decreasing/control actions */}
        {decreasingActions.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-[var(--foreground-muted)] mb-2 flex items-center gap-1">
              <Coffee className="h-3 w-3" />
              Cool Down
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {decreasingActions.map((action) => (
                <Button
                  key={action.type}
                  variant="outline"
                  className={cn(
                    "justify-start gap-2 h-auto py-2 px-3",
                    action.type === "aftercare" && "border-[var(--accent-green)] text-[var(--accent-green)]",
                    action.type === "check_in" && "border-[var(--accent-blue)] text-[var(--accent-blue)]"
                  )}
                  onClick={() => onAction(action.type)}
                >
                  {actionIcons[action.type]}
                  <div className="text-left">
                    <div className="text-sm">{action.label}</div>
                    <div className="text-xs text-[var(--foreground-muted)]">
                      {actionIntensityDeltas[action.type]}
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Intensity warning */}
        {currentIntensity >= 80 && (
          <div className="p-3 rounded-lg bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30 text-sm">
            <p className="text-[var(--accent-red)]">
              High intensity! Consider checking in or beginning aftercare.
            </p>
          </div>
        )}

        {/* Action descriptions on hover would be nice, but for now show as tooltip */}
        <p className="text-xs text-[var(--foreground-muted)] text-center">
          Hover over actions for descriptions
        </p>
      </div>
    </div>
  );
}
