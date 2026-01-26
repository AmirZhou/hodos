"use client";

import { cn } from "@/lib/utils";

interface IntensityMeterProps {
  intensity: number;
  peakIntensity?: number;
  mood?: string;
  showPeak?: boolean;
  size?: "sm" | "md" | "lg";
}

export function IntensityMeter({
  intensity,
  peakIntensity,
  mood,
  showPeak = true,
  size = "md",
}: IntensityMeterProps) {
  // Get color based on intensity level
  const getIntensityColor = (value: number) => {
    if (value < 20) return "var(--accent-blue)";
    if (value < 40) return "var(--accent-green)";
    if (value < 60) return "var(--accent-gold)";
    if (value < 80) return "var(--accent-purple)";
    return "var(--accent-red)";
  };

  const moodLabels: Record<string, string> = {
    anticipation: "Building Anticipation",
    warming: "Warming Up",
    building: "Building Intensity",
    intense: "Intense",
    peak: "Peak Intensity",
    aftercare: "Aftercare",
    care: "Caring",
    checking_in: "Checking In",
  };

  const heights = {
    sm: "h-2",
    md: "h-4",
    lg: "h-6",
  };

  return (
    <div className="space-y-2">
      {/* Mood label */}
      {mood && (
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-[var(--foreground-secondary)]">
            {moodLabels[mood] ?? mood}
          </span>
          <span
            className="text-sm font-mono font-bold"
            style={{ color: getIntensityColor(intensity) }}
          >
            {intensity}%
          </span>
        </div>
      )}

      {/* Meter bar */}
      <div className="relative">
        <div
          className={cn(
            "w-full rounded-full bg-[var(--background-tertiary)] overflow-hidden",
            heights[size]
          )}
        >
          {/* Current intensity */}
          <div
            className={cn(
              "h-full rounded-full transition-all duration-300 ease-out",
              heights[size]
            )}
            style={{
              width: `${intensity}%`,
              backgroundColor: getIntensityColor(intensity),
            }}
          />
        </div>

        {/* Peak marker */}
        {showPeak && peakIntensity !== undefined && peakIntensity > intensity && (
          <div
            className="absolute top-0 h-full w-1 bg-white/50 rounded-full"
            style={{ left: `${peakIntensity}%`, transform: "translateX(-50%)" }}
            title={`Peak: ${peakIntensity}%`}
          />
        )}

        {/* Intensity markers */}
        <div className="absolute top-full mt-1 w-full flex justify-between text-xs text-[var(--foreground-muted)]">
          <span>0</span>
          <span>25</span>
          <span>50</span>
          <span>75</span>
          <span>100</span>
        </div>
      </div>

      {/* Intensity zone labels */}
      <div className="flex gap-1 mt-4 text-xs">
        <div
          className="flex-1 text-center py-1 rounded"
          style={{
            backgroundColor: intensity < 20 ? "var(--accent-blue)" : "transparent",
            color: intensity < 20 ? "white" : "var(--foreground-muted)",
            opacity: intensity < 20 ? 1 : 0.5,
          }}
        >
          Gentle
        </div>
        <div
          className="flex-1 text-center py-1 rounded"
          style={{
            backgroundColor: intensity >= 20 && intensity < 40 ? "var(--accent-green)" : "transparent",
            color: intensity >= 20 && intensity < 40 ? "white" : "var(--foreground-muted)",
            opacity: intensity >= 20 && intensity < 40 ? 1 : 0.5,
          }}
        >
          Warm
        </div>
        <div
          className="flex-1 text-center py-1 rounded"
          style={{
            backgroundColor: intensity >= 40 && intensity < 60 ? "var(--accent-gold)" : "transparent",
            color: intensity >= 40 && intensity < 60 ? "white" : "var(--foreground-muted)",
            opacity: intensity >= 40 && intensity < 60 ? 1 : 0.5,
          }}
        >
          Medium
        </div>
        <div
          className="flex-1 text-center py-1 rounded"
          style={{
            backgroundColor: intensity >= 60 && intensity < 80 ? "var(--accent-purple)" : "transparent",
            color: intensity >= 60 && intensity < 80 ? "white" : "var(--foreground-muted)",
            opacity: intensity >= 60 && intensity < 80 ? 1 : 0.5,
          }}
        >
          Intense
        </div>
        <div
          className="flex-1 text-center py-1 rounded"
          style={{
            backgroundColor: intensity >= 80 ? "var(--accent-red)" : "transparent",
            color: intensity >= 80 ? "white" : "var(--foreground-muted)",
            opacity: intensity >= 80 ? 1 : 0.5,
          }}
        >
          Peak
        </div>
      </div>
    </div>
  );
}
