"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SafewordButtonProps {
  onSafeword: (level: "yellow" | "red") => void;
  variant?: "floating" | "inline";
  disabled?: boolean;
}

export function SafewordButton({
  onSafeword,
  variant = "floating",
  disabled = false,
}: SafewordButtonProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [confirming, setConfirming] = useState<"yellow" | "red" | null>(null);

  const handleClick = (level: "yellow" | "red") => {
    if (confirming === level) {
      // Second click - confirm
      onSafeword(level);
      setConfirming(null);
      setIsExpanded(false);
    } else {
      // First click - ask for confirmation
      setConfirming(level);
    }
  };

  const handleCancel = () => {
    setConfirming(null);
    setIsExpanded(false);
  };

  if (variant === "inline") {
    return (
      <div className="flex gap-2">
        <Button
          variant="outline"
          className={cn(
            "flex-1 border-2",
            confirming === "yellow"
              ? "border-[var(--accent-gold)] bg-[var(--accent-gold)]/20 text-[var(--accent-gold)]"
              : "border-[var(--accent-gold)] text-[var(--accent-gold)] hover:bg-[var(--accent-gold)]/10"
          )}
          onClick={() => handleClick("yellow")}
          disabled={disabled}
        >
          <AlertTriangle className="h-4 w-4 mr-2" />
          {confirming === "yellow" ? "Click to Confirm" : "Yellow"}
        </Button>
        <Button
          variant="outline"
          className={cn(
            "flex-1 border-2",
            confirming === "red"
              ? "border-[var(--accent-red)] bg-[var(--accent-red)]/20 text-[var(--accent-red)]"
              : "border-[var(--accent-red)] text-[var(--accent-red)] hover:bg-[var(--accent-red)]/10"
          )}
          onClick={() => handleClick("red")}
          disabled={disabled}
        >
          <AlertTriangle className="h-4 w-4 mr-2" />
          {confirming === "red" ? "Click to Confirm" : "Red"}
        </Button>
        {confirming && (
          <Button variant="ghost" size="icon" onClick={handleCancel}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }

  // Floating variant
  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isExpanded ? (
        <div className="flex flex-col gap-2 items-end animate-in slide-in-from-bottom-2">
          {/* Cancel button */}
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full bg-[var(--card)] border border-[var(--border)]"
            onClick={handleCancel}
          >
            <X className="h-4 w-4" />
          </Button>

          {/* Red safeword */}
          <Button
            className={cn(
              "rounded-full shadow-lg border-2",
              confirming === "red"
                ? "bg-[var(--accent-red)] border-white text-white"
                : "bg-[var(--card)] border-[var(--accent-red)] text-[var(--accent-red)] hover:bg-[var(--accent-red)] hover:text-white"
            )}
            onClick={() => handleClick("red")}
            disabled={disabled}
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            {confirming === "red" ? "CONFIRM RED" : "RED - Full Stop"}
          </Button>

          {/* Yellow safeword */}
          <Button
            className={cn(
              "rounded-full shadow-lg border-2",
              confirming === "yellow"
                ? "bg-[var(--accent-gold)] border-white text-white"
                : "bg-[var(--card)] border-[var(--accent-gold)] text-[var(--accent-gold)] hover:bg-[var(--accent-gold)] hover:text-white"
            )}
            onClick={() => handleClick("yellow")}
            disabled={disabled}
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            {confirming === "yellow" ? "CONFIRM YELLOW" : "YELLOW - Slow Down"}
          </Button>

          {/* Info text */}
          <div className="text-xs text-[var(--foreground-muted)] text-right max-w-48 bg-[var(--card)] rounded-lg p-2 border border-[var(--border)]">
            <p><strong>Yellow:</strong> Pause, reduce intensity</p>
            <p><strong>Red:</strong> Stop immediately, go to aftercare</p>
          </div>
        </div>
      ) : (
        <Button
          className="rounded-full shadow-lg h-14 w-14 bg-[var(--accent-red)] hover:bg-[var(--accent-red)]/90 text-white"
          onClick={() => setIsExpanded(true)}
          disabled={disabled}
          title="Safeword"
        >
          <AlertTriangle className="h-6 w-6" />
        </Button>
      )}
    </div>
  );
}
