"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, BookmarkPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VocabularyItem {
  word: string;
  translation: string;
  partOfSpeech: string;
  usage?: string;
}

interface LinguisticAnalysis {
  grammar: string[];
  vocabulary: VocabularyItem[];
  usageNotes: string[];
}

interface AnalysisPanelProps {
  analysis: LinguisticAnalysis | undefined;
  defaultExpanded?: boolean;
  onSave?: () => void;
}

export function AnalysisPanel({
  analysis,
  defaultExpanded = false,
  onSave,
}: AnalysisPanelProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  if (!analysis) {
    return null;
  }

  return (
    <div className="mt-2 border border-[var(--border)] rounded-lg overflow-hidden">
      {/* Toggle Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-2 bg-[var(--background-tertiary)] hover:bg-[var(--background-secondary)] transition-colors text-sm"
      >
        <span className="text-[var(--foreground-secondary)]">
          {isExpanded ? "Hide Analysis" : "Show Analysis"}
        </span>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-[var(--foreground-muted)]" />
        ) : (
          <ChevronDown className="h-4 w-4 text-[var(--foreground-muted)]" />
        )}
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-3 space-y-4 bg-[var(--background-secondary)]">
          {/* Grammar Section */}
          {analysis.grammar.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wide mb-2">
                GRAMMAR
              </h4>
              <ul className="space-y-1">
                {analysis.grammar.map((note, i) => (
                  <li
                    key={i}
                    className="text-sm text-[var(--foreground-secondary)] flex items-start gap-2"
                  >
                    <span className="text-[var(--accent-blue)]">•</span>
                    {note}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Vocabulary Section */}
          {analysis.vocabulary.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wide mb-2">
                VOCABULARY
              </h4>
              <div className="space-y-2">
                {analysis.vocabulary.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-baseline gap-2 text-sm"
                  >
                    <span className="font-medium text-[var(--accent-blue)]">
                      {item.word}
                    </span>
                    <span className="text-[var(--foreground-muted)]">
                      ({item.partOfSpeech})
                    </span>
                    <span className="text-[var(--foreground-secondary)]">
                      {item.translation}
                    </span>
                    {item.usage && (
                      <span className="text-xs text-[var(--foreground-muted)] italic">
                        — {item.usage}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Usage Notes Section */}
          {analysis.usageNotes.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wide mb-2">
                USAGE NOTES
              </h4>
              <ul className="space-y-1">
                {analysis.usageNotes.map((note, i) => (
                  <li
                    key={i}
                    className="text-sm text-[var(--foreground-secondary)] flex items-start gap-2"
                  >
                    <span className="text-[var(--accent-gold)]">•</span>
                    {note}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          {onSave && (
            <div className="pt-2 border-t border-[var(--border)] flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onSave}
                className="gap-1"
              >
                <BookmarkPlus className="h-3 w-3" />
                Save to Notebook
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
