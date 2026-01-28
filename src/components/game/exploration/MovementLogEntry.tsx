"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MovementLogEntryProps {
  sessionId: Id<"gameSessions">;
  characterId: string;
  actorName?: string;
  movementData: {
    from: { x: number; y: number };
    to: { x: number; y: number };
  };
}

export function MovementLogEntry({
  sessionId,
  characterId,
  actorName,
  movementData,
}: MovementLogEntryProps) {
  const undoMovement = useMutation(api.game.exploration.undoMovement);
  const [isUndoing, setIsUndoing] = useState(false);

  const handleUndo = async () => {
    setIsUndoing(true);
    try {
      await undoMovement({ sessionId, characterId });
    } catch (e) {
      console.error("Undo failed:", e);
    } finally {
      setIsUndoing(false);
    }
  };

  return (
    <div className="flex items-center gap-2 rounded-lg bg-[var(--background-tertiary)] px-3 py-2 text-sm">
      <span className="text-[var(--foreground-muted)]">
        {actorName ?? "Character"}:
      </span>
      <span className="text-[var(--foreground-secondary)]">
        ({movementData.from.x + 1}, {movementData.from.y + 1})
      </span>
      <span className="text-[var(--foreground-muted)]">→</span>
      <span className="font-medium text-[var(--foreground)]">
        ({movementData.to.x + 1}, {movementData.to.y + 1})
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 ml-auto"
        onClick={handleUndo}
        disabled={isUndoing}
        title="Undo movement"
      >
        <Undo2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
