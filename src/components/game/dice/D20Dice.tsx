"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface D20DiceProps {
  onRoll: (result: number) => void;
  disabled?: boolean;
  size?: number;
}

export function D20Dice({ onRoll, disabled, size = 120 }: D20DiceProps) {
  const [isRolling, setIsRolling] = useState(false);
  const [displayNumber, setDisplayNumber] = useState<number | null>(null);
  const [finalResult, setFinalResult] = useState<number | null>(null);

  const handleClick = () => {
    if (disabled || isRolling) return;

    setIsRolling(true);
    setFinalResult(null);

    // Generate the actual result
    const result = Math.floor(Math.random() * 20) + 1;

    // Animate through random numbers
    let count = 0;
    const interval = setInterval(() => {
      setDisplayNumber(Math.floor(Math.random() * 20) + 1);
      count++;
      if (count > 15) {
        clearInterval(interval);
        setDisplayNumber(result);
        setFinalResult(result);
        setIsRolling(false);
        onRoll(result);
      }
    }, 80);
  };

  const isCrit = finalResult === 20;
  const isCritFail = finalResult === 1;

  return (
    <button
      onClick={handleClick}
      disabled={disabled || isRolling}
      className={cn(
        "relative transition-transform",
        !disabled && !isRolling && "hover:scale-105 cursor-pointer",
        isRolling && "animate-bounce",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        className={cn(
          "transition-all duration-300",
          isRolling && "animate-spin"
        )}
      >
        {/* D20 shape - icosahedron face */}
        <defs>
          <linearGradient id="diceGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={isCrit ? "#22c55e" : isCritFail ? "#ef4444" : "#3b82f6"} />
            <stop offset="100%" stopColor={isCrit ? "#16a34a" : isCritFail ? "#dc2626" : "#1d4ed8"} />
          </linearGradient>
          <filter id="diceShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="2" dy="4" stdDeviation="3" floodOpacity="0.4" />
          </filter>
        </defs>

        {/* Outer glow for crits */}
        {(isCrit || isCritFail) && (
          <polygon
            points="50,5 95,35 80,90 20,90 5,35"
            fill="none"
            stroke={isCrit ? "#22c55e" : "#ef4444"}
            strokeWidth="3"
            className="animate-pulse"
            opacity="0.6"
          />
        )}

        {/* Main D20 shape */}
        <polygon
          points="50,5 95,35 80,90 20,90 5,35"
          fill="url(#diceGradient)"
          stroke="#d4af37"
          strokeWidth="2"
          filter="url(#diceShadow)"
        />

        {/* Inner lines for 3D effect */}
        <line x1="50" y1="5" x2="50" y2="55" stroke="#d4af37" strokeWidth="1" opacity="0.5" />
        <line x1="50" y1="55" x2="5" y2="35" stroke="#d4af37" strokeWidth="1" opacity="0.5" />
        <line x1="50" y1="55" x2="95" y2="35" stroke="#d4af37" strokeWidth="1" opacity="0.5" />
        <line x1="50" y1="55" x2="20" y2="90" stroke="#d4af37" strokeWidth="1" opacity="0.5" />
        <line x1="50" y1="55" x2="80" y2="90" stroke="#d4af37" strokeWidth="1" opacity="0.5" />

        {/* Number display */}
        <text
          x="50"
          y="58"
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#d4af37"
          fontSize={displayNumber && displayNumber >= 10 ? "24" : "28"}
          fontWeight="bold"
          fontFamily="serif"
        >
          {displayNumber ?? "?"}
        </text>
      </svg>

      {/* Click to roll hint */}
      {!isRolling && !finalResult && !disabled && (
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-[var(--foreground-muted)] whitespace-nowrap">
          Click to roll
        </div>
      )}
    </button>
  );
}
