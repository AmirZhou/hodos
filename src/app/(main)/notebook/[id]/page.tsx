"use client";

import { use } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/auth-provider";
import {
  ArrowLeft,
  BookOpen,
  Clock,
  Tag,
  Loader2,
  BookMarked,
} from "lucide-react";
import Link from "next/link";

export default function NotebookDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const entryId = id as Id<"notebook">;

  const { user, isLoading: authLoading } = useAuth();

  const entry = useQuery(
    api.notebook.getById,
    user?._id ? { id: entryId } : "skip"
  );

  // Loading state
  if (authLoading || entry === undefined) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-[var(--accent-gold)]" />
          <p className="text-[var(--foreground-secondary)]">Loading...</p>
        </div>
      </div>
    );
  }

  // Not found
  if (!entry) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center space-y-4">
          <BookOpen className="h-16 w-16 mx-auto text-[var(--foreground-muted)]" />
          <h2 className="text-xl font-medium">Entry not found</h2>
          <Link href="/notebook">
            <Button variant="outline">Back to Notebook</Button>
          </Link>
        </div>
      </div>
    );
  }

  const isDue = entry.nextReviewDate <= Date.now();

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Back Button */}
      <Link
        href="/notebook"
        className="inline-flex items-center gap-2 text-[var(--foreground-secondary)] hover:text-[var(--foreground)] mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Notebook
      </Link>

      {/* Main Content */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-[var(--border)]">
          {/* French Text */}
          <p className="text-2xl font-medium text-[var(--accent-blue)] mb-2">
            {entry.frenchText}
          </p>

          {/* English Text */}
          <p className="text-lg text-[var(--foreground-secondary)]">
            {entry.englishText}
          </p>

          {/* Meta */}
          <div className="flex items-center gap-4 mt-4 text-sm text-[var(--foreground-muted)]">
            {entry.tags.length > 0 && (
              <span className="flex items-center gap-1">
                <Tag className="h-4 w-4" />
                {entry.tags.join(", ")}
              </span>
            )}
            <span
              className={`flex items-center gap-1 ${isDue ? "text-[var(--accent-red)]" : ""}`}
            >
              <Clock className="h-4 w-4" />
              {isDue ? "Due for review" : `Review ${formatRelativeDate(entry.nextReviewDate)}`}
            </span>
          </div>
        </div>

        {/* Grammar Notes */}
        {entry.grammarNotes.length > 0 && (
          <div className="p-6 border-b border-[var(--border)]">
            <h3 className="text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wide mb-3">
              GRAMMAR
            </h3>
            <ul className="space-y-2">
              {entry.grammarNotes.map((note, i) => (
                <li
                  key={i}
                  className="text-[var(--foreground-secondary)] flex items-start gap-2"
                >
                  <span className="text-[var(--accent-blue)]">•</span>
                  {note}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Vocabulary */}
        {entry.vocabularyItems.length > 0 && (
          <div className="p-6 border-b border-[var(--border)]">
            <h3 className="text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wide mb-3">
              VOCABULARY
            </h3>
            <div className="space-y-3">
              {entry.vocabularyItems.map((item, i) => (
                <div key={i} className="flex items-baseline gap-3">
                  <span className="font-medium text-[var(--accent-blue)]">
                    {item.word}
                  </span>
                  <span className="text-sm text-[var(--foreground-muted)]">
                    ({item.partOfSpeech})
                  </span>
                  <span className="text-[var(--foreground-secondary)]">
                    {item.translation}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Usage Note */}
        {entry.usageNote && (
          <div className="p-6 border-b border-[var(--border)]">
            <h3 className="text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wide mb-3">
              USAGE NOTES
            </h3>
            <p className="text-[var(--foreground-secondary)]">
              {entry.usageNote}
            </p>
          </div>
        )}

        {/* Scene Context */}
        {entry.sceneSummary && (
          <div className="p-6 border-b border-[var(--border)]">
            <h3 className="text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wide mb-3">
              STORY CONTEXT
            </h3>
            <p className="text-[var(--foreground-secondary)]">
              {entry.sceneSummary}
            </p>
          </div>
        )}

        {/* User Notes */}
        <div className="p-6">
          <h3 className="text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wide mb-3">
            YOUR NOTES
          </h3>
          {entry.userNotes ? (
            <p className="text-[var(--foreground-secondary)]">
              {entry.userNotes}
            </p>
          ) : (
            <p className="text-[var(--foreground-muted)] italic">
              No notes yet. Click edit to add your own notes.
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 flex gap-4">
        <Link href="/notebook/review">
          <Button className="gap-2">
            <BookMarked className="h-4 w-4" />
            Start Review
          </Button>
        </Link>
      </div>
    </div>
  );
}

function formatRelativeDate(timestamp: number): string {
  const now = Date.now();
  const diff = timestamp - now;
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

  if (days <= 0) return "now";
  if (days === 1) return "tomorrow";
  if (days < 7) return `in ${days} days`;
  if (days < 30) return `in ${Math.ceil(days / 7)} weeks`;
  return `in ${Math.ceil(days / 30)} months`;
}
