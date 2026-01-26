"use client";

import { Button } from "@/components/ui/button";
import {
  Swords,
  Shield,
  Wind,
  Users,
  EyeOff,
  Clock,
  Package,
  Sparkles,
  MoveRight,
  SkipForward,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ActionBarProps {
  hasAction: boolean;
  hasBonusAction: boolean;
  hasReaction: boolean;
  movementRemaining: number;
  isMyTurn: boolean;
  onAction: (actionType: string) => void;
  onEndTurn: () => void;
  onMove: () => void;
  isMoving?: boolean;
}

interface ActionButton {
  id: string;
  label: string;
  icon: React.ReactNode;
  requiresAction: boolean;
  description: string;
}

const actions: ActionButton[] = [
  {
    id: "attack",
    label: "Attack",
    icon: <Swords className="h-4 w-4" />,
    requiresAction: true,
    description: "Make a melee or ranged attack",
  },
  {
    id: "spell",
    label: "Cast Spell",
    icon: <Sparkles className="h-4 w-4" />,
    requiresAction: true,
    description: "Cast a spell",
  },
  {
    id: "dodge",
    label: "Dodge",
    icon: <Shield className="h-4 w-4" />,
    requiresAction: true,
    description: "Focus on avoiding attacks",
  },
  {
    id: "dash",
    label: "Dash",
    icon: <Wind className="h-4 w-4" />,
    requiresAction: true,
    description: "Double your movement speed",
  },
  {
    id: "disengage",
    label: "Disengage",
    icon: <MoveRight className="h-4 w-4" />,
    requiresAction: true,
    description: "Move without provoking attacks",
  },
  {
    id: "help",
    label: "Help",
    icon: <Users className="h-4 w-4" />,
    requiresAction: true,
    description: "Aid an ally's next attack or check",
  },
  {
    id: "hide",
    label: "Hide",
    icon: <EyeOff className="h-4 w-4" />,
    requiresAction: true,
    description: "Attempt to hide from enemies",
  },
  {
    id: "ready",
    label: "Ready",
    icon: <Clock className="h-4 w-4" />,
    requiresAction: true,
    description: "Prepare an action for a trigger",
  },
  {
    id: "use_item",
    label: "Use Item",
    icon: <Package className="h-4 w-4" />,
    requiresAction: true,
    description: "Use an item from your inventory",
  },
];

export function ActionBar({
  hasAction,
  hasBonusAction,
  hasReaction,
  movementRemaining,
  isMyTurn,
  onAction,
  onEndTurn,
  onMove,
  isMoving,
}: ActionBarProps) {
  if (!isMyTurn) {
    return (
      <div className="rounded-lg bg-[var(--card)] border border-[var(--border)] p-4">
        <p className="text-center text-[var(--foreground-secondary)]">
          Waiting for other combatants...
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-[var(--card)] border border-[var(--border)] overflow-hidden">
      {/* Resource indicators */}
      <div className="px-4 py-2 bg-[var(--background-secondary)] border-b border-[var(--border)] flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "w-3 h-3 rounded-full",
              hasAction ? "bg-[var(--accent-green)]" : "bg-[var(--foreground-muted)]"
            )}
          />
          <span className="text-xs text-[var(--foreground-secondary)]">Action</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "w-3 h-3 rounded-full",
              hasBonusAction ? "bg-[var(--accent-gold)]" : "bg-[var(--foreground-muted)]"
            )}
          />
          <span className="text-xs text-[var(--foreground-secondary)]">Bonus</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "w-3 h-3 rounded-full",
              hasReaction ? "bg-[var(--accent-purple)]" : "bg-[var(--foreground-muted)]"
            )}
          />
          <span className="text-xs text-[var(--foreground-secondary)]">Reaction</span>
        </div>
        <div className="ml-auto text-xs text-[var(--foreground-secondary)]">
          Movement: <span className="font-mono">{movementRemaining}ft</span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="p-4">
        {/* Movement button */}
        <div className="mb-4">
          <Button
            variant={isMoving ? "default" : "outline"}
            className="w-full justify-start gap-2"
            onClick={onMove}
            disabled={movementRemaining <= 0}
          >
            <MoveRight className="h-4 w-4" />
            {isMoving ? "Cancel Move" : "Move"}
            <span className="ml-auto text-xs opacity-70">{movementRemaining}ft remaining</span>
          </Button>
        </div>

        {/* Action grid */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {actions.map((action) => (
            <Button
              key={action.id}
              variant="outline"
              size="sm"
              className="flex-col h-auto py-2 gap-1"
              disabled={action.requiresAction && !hasAction}
              onClick={() => onAction(action.id)}
              title={action.description}
            >
              {action.icon}
              <span className="text-xs">{action.label}</span>
            </Button>
          ))}
        </div>

        {/* End turn button */}
        <Button
          className="w-full gap-2"
          onClick={onEndTurn}
        >
          <SkipForward className="h-4 w-4" />
          End Turn
        </Button>
      </div>
    </div>
  );
}
