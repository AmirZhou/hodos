"use client";

import { Button } from "@/components/ui/button";
import { ModelSelector } from "@/components/game/settings";
import { Users, Map, ChevronRight } from "lucide-react";
import { Id } from "../../../../convex/_generated/dataModel";

export function GameHeader({
  campaignName,
  onToggleMap,
  sidebarOpen,
  onToggleSidebar,
  onlinePlayers,
  sessionId,
  llmProvider,
}: {
  campaignName: string;
  onToggleMap: () => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onlinePlayers: Array<{ displayName: string }>;
  sessionId?: Id<"gameSessions">;
  llmProvider?: "deepseek" | "openai";
}) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-[var(--border)] bg-[var(--background-secondary)] px-4">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Users className="h-5 w-5" />
        </Button>
        <span className="font-medium">{campaignName}</span>
        {onlinePlayers.length > 0 && (
          <div className="hidden sm:flex items-center gap-1 text-xs text-[var(--foreground-muted)]">
            <div className="w-2 h-2 rounded-full bg-[var(--accent-green)]" />
            {onlinePlayers.length} online
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        {sessionId && (
          <ModelSelector sessionId={sessionId} currentProvider={llmProvider} />
        )}
        <Button variant="ghost" size="icon" onClick={onToggleMap}>
          <Map className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          className="hidden lg:flex"
        >
          <ChevronRight
            className={`h-5 w-5 transition-transform ${
              sidebarOpen ? "rotate-0" : "rotate-180"
            }`}
          />
        </Button>
      </div>
    </header>
  );
}
