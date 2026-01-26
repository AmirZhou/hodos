"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  CheckCircle,
  XCircle,
  ChevronRight,
  Lightbulb,
  BookOpen,
} from "lucide-react";

type Rating = "wrong" | "hard" | "medium" | "easy";

interface ReviewEntry {
  _id: string;
  frenchText: string;
  englishText: string;
  grammarNotes: string[];
  vocabularyItems: Array<{
    word: string;
    translation: string;
    partOfSpeech: string;
  }>;
  usageNote: string;
  sceneSummary: string;
}

interface ReviewSessionProps {
  entries: ReviewEntry[];
  onRate: (entryId: string, rating: Rating) => void;
  onComplete: () => void;
}

export function ReviewSession({
  entries,
  onRate,
  onComplete,
}: ReviewSessionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  // Empty state
  if (entries.length === 0) {
    return (
      <div className="text-center py-16">
        <CheckCircle className="h-16 w-16 mx-auto text-[var(--accent-green)] mb-4" />
        <h2 className="text-xl font-medium mb-2">All caught up!</h2>
        <p className="text-[var(--foreground-secondary)]">
          No items due for review right now.
        </p>
      </div>
    );
  }

  const currentEntry = entries[currentIndex];
  const isLastEntry = currentIndex === entries.length - 1;

  const handleRate = (rating: Rating) => {
    onRate(currentEntry._id, rating);

    if (isLastEntry) {
      onComplete();
    } else {
      setCurrentIndex(currentIndex + 1);
      setShowAnswer(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress */}
      <div className="flex items-center justify-between mb-6">
        <span className="text-sm text-[var(--foreground-muted)]">
          {currentIndex + 1} of {entries.length}
        </span>
        <div className="flex-1 mx-4 h-2 rounded-full bg-[var(--background-tertiary)]">
          <div
            className="h-full rounded-full bg-[var(--accent-gold)] transition-all"
            style={{
              width: `${((currentIndex + 1) / entries.length) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Card */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] overflow-hidden">
        {/* French Text (Question) */}
        <div className="p-8 text-center border-b border-[var(--border)]">
          <p className="text-2xl font-medium text-[var(--accent-blue)]">
            {currentEntry.frenchText}
          </p>

          {currentEntry.sceneSummary && (
            <p className="mt-3 text-xs text-[var(--foreground-muted)] flex items-center justify-center gap-1">
              <BookOpen className="h-3 w-3" />
              {currentEntry.sceneSummary}
            </p>
          )}
        </div>

        {/* Answer Section */}
        {!showAnswer ? (
          <div className="p-6 text-center">
            <Button
              size="lg"
              onClick={() => setShowAnswer(true)}
              className="gap-2"
            >
              <ChevronRight className="h-5 w-5" />
              Show Answer
            </Button>
          </div>
        ) : (
          <div className="p-6">
            {/* English Translation */}
            <div className="text-center mb-6">
              <p className="text-xl text-[var(--foreground)]">
                {currentEntry.englishText}
              </p>
            </div>

            {/* Vocabulary */}
            {currentEntry.vocabularyItems.length > 0 && (
              <div className="mb-4">
                <h4 className="text-xs font-semibold text-[var(--foreground-muted)] uppercase mb-2">
                  Key Vocabulary
                </h4>
                <div className="flex flex-wrap gap-2">
                  {currentEntry.vocabularyItems.map((item, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[var(--background-tertiary)] text-sm"
                    >
                      <span className="text-[var(--accent-blue)]">
                        {item.word}
                      </span>
                      <span className="text-[var(--foreground-muted)]">
                        ({item.partOfSpeech})
                      </span>
                      <span>{item.translation}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Grammar Notes */}
            {currentEntry.grammarNotes.length > 0 && (
              <div className="mb-4">
                <h4 className="text-xs font-semibold text-[var(--foreground-muted)] uppercase mb-2 flex items-center gap-1">
                  <Lightbulb className="h-3 w-3" />
                  Grammar
                </h4>
                <ul className="text-sm text-[var(--foreground-secondary)] space-y-1">
                  {currentEntry.grammarNotes.map((note, i) => (
                    <li key={i}>• {note}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Usage Note */}
            {currentEntry.usageNote && (
              <div className="mb-6 text-sm text-[var(--foreground-muted)] italic">
                {currentEntry.usageNote}
              </div>
            )}

            {/* Rating Buttons */}
            <div className="pt-4 border-t border-[var(--border)]">
              <p className="text-sm text-center text-[var(--foreground-secondary)] mb-3">
                How well did you know this?
              </p>
              <div className="grid grid-cols-4 gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleRate("wrong")}
                  className="flex flex-col items-center gap-1 h-auto py-3 text-[var(--accent-red)] border-[var(--accent-red)]/30 hover:bg-[var(--accent-red)]/10"
                >
                  <XCircle className="h-5 w-5" />
                  <span className="text-xs">Wrong</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleRate("hard")}
                  className="flex flex-col items-center gap-1 h-auto py-3"
                >
                  <span className="text-lg">😓</span>
                  <span className="text-xs">Hard</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleRate("medium")}
                  className="flex flex-col items-center gap-1 h-auto py-3"
                >
                  <span className="text-lg">👍</span>
                  <span className="text-xs">Medium</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleRate("easy")}
                  className="flex flex-col items-center gap-1 h-auto py-3 text-[var(--accent-green)] border-[var(--accent-green)]/30 hover:bg-[var(--accent-green)]/10"
                >
                  <CheckCircle className="h-5 w-5" />
                  <span className="text-xs">Easy</span>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
