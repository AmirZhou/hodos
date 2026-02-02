"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Sparkles, X } from "lucide-react";

interface TechniqueResultToastProps {
  techniqueName: string;
  potency: string;
  narration?: string;
  xpAwarded: number;
  onDismiss: () => void;
}

const POTENCY_COLORS: Record<string, string> = {
  critical: "text-[var(--accent-gold)]",
  overwhelming: "text-[var(--accent-gold)]",
  full: "text-[var(--foreground)]",
  standard: "text-[var(--foreground)]",
  reduced: "text-orange-400",
  negated: "text-[var(--accent-red)]",
  resisted: "text-[var(--accent-red)]",
};

const POTENCY_BG: Record<string, string> = {
  critical: "bg-[var(--accent-gold)]/20 border-[var(--accent-gold)]/40",
  overwhelming: "bg-[var(--accent-gold)]/20 border-[var(--accent-gold)]/40",
  full: "bg-[var(--foreground)]/10 border-[var(--foreground)]/20",
  standard: "bg-[var(--foreground)]/10 border-[var(--foreground)]/20",
  reduced: "bg-orange-400/15 border-orange-400/30",
  negated: "bg-[var(--accent-red)]/15 border-[var(--accent-red)]/30",
  resisted: "bg-[var(--accent-red)]/15 border-[var(--accent-red)]/30",
};

export function TechniqueResultToast({
  techniqueName,
  potency,
  narration,
  xpAwarded,
  onDismiss,
}: TechniqueResultToastProps) {
  const [visible, setVisible] = useState(false);

  // Fade in on mount
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // Auto-dismiss after 6 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      // Wait for fade-out transition before calling onDismiss
      setTimeout(onDismiss, 300);
    }, 6000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const handleClick = () => {
    setVisible(false);
    setTimeout(onDismiss, 300);
  };

  const potencyKey = potency.toLowerCase();
  const potencyColor = POTENCY_COLORS[potencyKey] ?? "text-[var(--foreground)]";
  const potencyBg =
    POTENCY_BG[potencyKey] ??
    "bg-[var(--foreground)]/10 border-[var(--foreground)]/20";

  return (
    <div
      className={cn(
        "fixed bottom-6 right-6 z-50 max-w-sm w-full",
        "rounded-lg bg-[var(--card)] border border-[var(--border)] shadow-lg",
        "transition-all duration-300 ease-in-out cursor-pointer",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2",
      )}
      onClick={handleClick}
      role="status"
      aria-live="polite"
    >
      <div className="p-4 space-y-2">
        {/* Header: technique name + potency badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[var(--accent-gold)]" />
            <span className="text-sm font-semibold text-[var(--foreground)]">
              {techniqueName}
            </span>
            <span
              className={cn(
                "text-[10px] font-medium px-1.5 py-0.5 rounded border capitalize",
                potencyBg,
                potencyColor,
              )}
            >
              {potency}
            </span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleClick();
            }}
            className="text-[var(--foreground-secondary)] hover:text-[var(--foreground)] transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Narration */}
        {narration && (
          <p className="text-xs text-[var(--foreground-secondary)] italic leading-relaxed line-clamp-3">
            {narration}
          </p>
        )}

        {/* XP awarded */}
        {xpAwarded > 0 && (
          <p className="text-xs font-medium text-[var(--accent-gold)]">
            +{xpAwarded} XP
          </p>
        )}
      </div>
    </div>
  );
}
