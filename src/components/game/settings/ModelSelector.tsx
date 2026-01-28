"use client";

import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { Bot, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";

type LLMProvider = "deepseek" | "openai";

interface ModelSelectorProps {
  sessionId: Id<"gameSessions">;
  currentProvider?: LLMProvider;
}

const PROVIDERS: { id: LLMProvider; name: string; model: string }[] = [
  { id: "deepseek", name: "DeepSeek", model: "deepseek-chat" },
  { id: "openai", name: "OpenAI", model: "GPT-4o" },
];

export function ModelSelector({ sessionId, currentProvider = "deepseek" }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const setProvider = useMutation(api.game.session.setLlmProvider);

  const handleSelect = async (provider: LLMProvider) => {
    await setProvider({ sessionId, provider });
    setIsOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const current = PROVIDERS.find((p) => p.id === currentProvider) || PROVIDERS[0];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--background-tertiary)] hover:bg-[var(--background-secondary)] transition-colors text-sm"
      >
        <Bot className="h-4 w-4 text-[var(--accent-blue)]" />
        <span className="text-[var(--foreground-secondary)]">{current.name}</span>
        <ChevronDown className={`h-3 w-3 text-[var(--foreground-muted)] transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-1 right-0 z-50 min-w-[180px] rounded-lg border border-[var(--border)] bg-[var(--card)] shadow-lg overflow-hidden">
          <div className="px-3 py-2 border-b border-[var(--border)]">
            <span className="text-xs text-[var(--foreground-muted)] uppercase tracking-wider">
              AI Model
            </span>
          </div>
          {PROVIDERS.map((provider) => (
            <button
              key={provider.id}
              onClick={() => handleSelect(provider.id)}
              className={`w-full flex items-center justify-between px-3 py-2 hover:bg-[var(--background-tertiary)] transition-colors ${
                provider.id === currentProvider ? "bg-[var(--accent-blue)]/10" : ""
              }`}
            >
              <div className="text-left">
                <div className="text-sm font-medium">{provider.name}</div>
                <div className="text-xs text-[var(--foreground-muted)]">{provider.model}</div>
              </div>
              {provider.id === currentProvider && (
                <div className="w-2 h-2 rounded-full bg-[var(--accent-green)]" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
