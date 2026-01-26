"use client";

import { X, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ContextLog {
  _id: string;
  type: "narration" | "dialogue" | "action" | "roll" | "system" | "ooc";
  contentEn: string;
  contentFr: string;
  actorType?: "dm" | "character" | "npc";
  actorName?: string;
  createdAt: number;
}

interface StoryContextPanelProps {
  contextLogs: ContextLog[];
  highlightedLogId: string;
  sceneSummary?: string;
  onClose: () => void;
}

export function StoryContextPanel({
  contextLogs,
  highlightedLogId,
  sceneSummary,
  onClose,
}: StoryContextPanelProps) {
  if (contextLogs.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium">Story Context</h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-[var(--foreground-secondary)] text-center py-8">
          No context available for this entry.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[var(--background-secondary)] border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-[var(--accent-blue)]" />
          <h3 className="font-medium">
            {sceneSummary ? `Story: ${sceneSummary}` : "Story Context"}
          </h3>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Context Logs */}
      <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
        {contextLogs.map((log) => (
          <ContextLogEntry
            key={log._id}
            log={log}
            isHighlighted={log._id === highlightedLogId}
          />
        ))}
      </div>
    </div>
  );
}

function ContextLogEntry({
  log,
  isHighlighted,
}: {
  log: ContextLog;
  isHighlighted: boolean;
}) {
  const isDialogue = log.type === "dialogue";

  return (
    <div
      className={`rounded-lg p-3 ${
        isHighlighted
          ? "ring-2 ring-[var(--accent-gold)] bg-[var(--accent-gold)]/10"
          : "bg-[var(--background-tertiary)]"
      }`}
    >
      {/* Actor name for dialogue */}
      {isDialogue && log.actorName && (
        <div className="text-xs font-medium text-[var(--foreground-secondary)] mb-1">
          {log.actorName}
        </div>
      )}

      {/* English content */}
      <p className="text-sm text-[var(--foreground)]">{log.contentEn}</p>

      {/* French content */}
      <p className="text-sm text-[var(--accent-blue)] mt-1">{log.contentFr}</p>
    </div>
  );
}
