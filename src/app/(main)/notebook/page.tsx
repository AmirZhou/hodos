"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/providers/auth-provider";
import {
  BookOpen,
  Search,
  Clock,
  Tag,
  ChevronRight,
  Loader2,
  GraduationCap,
} from "lucide-react";
import Link from "next/link";

export default function NotebookPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const { user, isLoading: authLoading } = useAuth();
  const userId = user?._id ?? null;

  // For now, show a placeholder that doesn't require auth
  const entries = useQuery(
    api.notebook.getAll,
    userId ? { userId } : "skip"
  );

  const dueCount = useQuery(
    api.notebook.getDueCount,
    userId ? { userId } : "skip"
  );

  // Filter entries based on search and tags
  const filteredEntries = useMemo(() => {
    if (!entries) return [];

    return entries.filter((entry) => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesFrench = entry.frenchText.toLowerCase().includes(searchLower);
        const matchesEnglish = entry.englishText.toLowerCase().includes(searchLower);
        const matchesScene = entry.sceneSummary.toLowerCase().includes(searchLower);
        if (!matchesFrench && !matchesEnglish && !matchesScene) {
          return false;
        }
      }

      // Tag filter
      if (selectedTag && !entry.tags.includes(selectedTag)) {
        return false;
      }

      return true;
    });
  }, [entries, searchTerm, selectedTag]);

  // Get unique tags
  const allTags = useMemo(() => {
    if (!entries) return [];
    const tags = new Set<string>();
    entries.forEach((entry) => entry.tags.forEach((tag) => tags.add(tag)));
    return Array.from(tags).sort();
  }, [entries]);

  // Loading state
  if (authLoading || (userId && entries === undefined)) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-[var(--accent-gold)]" />
          <p className="text-[var(--foreground-secondary)]">Loading notebook...</p>
        </div>
      </div>
    );
  }

  // Not logged in
  if (!userId) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center space-y-4">
          <BookOpen className="h-16 w-16 mx-auto text-[var(--foreground-muted)]" />
          <h2 className="text-xl font-medium">Sign in to view your notebook</h2>
          <p className="text-[var(--foreground-secondary)]">
            Your saved French sentences will appear here.
          </p>
          <Link href="/login">
            <Button>Sign In</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <BookOpen className="h-8 w-8 text-[var(--accent-blue)]" />
          <div>
            <h1 className="text-2xl font-bold">French Notebook</h1>
            <p className="text-[var(--foreground-secondary)] text-sm">
              Your saved sentences and vocabulary
            </p>
          </div>
        </div>

        {/* Review Button */}
        {entries && entries.length > 0 && (
          <Link href="/notebook/review">
            <Button className="gap-2">
              <GraduationCap className="h-4 w-4" />
              Start Review
              {dueCount && dueCount > 0 && (
                <span className="ml-1 px-2 py-0.5 rounded-full bg-[var(--accent-red)] text-white text-xs">
                  {dueCount} due
                </span>
              )}
            </Button>
          </Link>
        )}
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--foreground-muted)]" />
          <Input
            placeholder="Search sentences..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {allTags.length > 0 && (
          <select
            value={selectedTag ?? ""}
            onChange={(e) => setSelectedTag(e.target.value || null)}
            className="px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--background)] text-sm"
          >
            <option value="">All tags</option>
            {allTags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Empty State */}
      {entries.length === 0 && (
        <div className="text-center py-16">
          <BookOpen className="h-16 w-16 mx-auto text-[var(--foreground-muted)] mb-4" />
          <h2 className="text-xl font-medium mb-2">No saved sentences yet</h2>
          <p className="text-[var(--foreground-secondary)] max-w-md mx-auto">
            While playing, click &quot;Save to Notebook&quot; on any French text
            to add it here for review.
          </p>
        </div>
      )}

      {/* Entries List */}
      {filteredEntries.length > 0 && (
        <div className="space-y-4">
          {filteredEntries.map((entry) => (
            <NotebookEntryCard key={entry._id} entry={entry} />
          ))}
        </div>
      )}

      {/* No results from search */}
      {entries.length > 0 && filteredEntries.length === 0 && (
        <div className="text-center py-8 text-[var(--foreground-secondary)]">
          No entries match your search.
        </div>
      )}
    </div>
  );
}

interface NotebookEntry {
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
  tags: string[];
  nextReviewDate: number;
  createdAt: number;
}

function NotebookEntryCard({ entry }: { entry: NotebookEntry }) {
  const isDue = entry.nextReviewDate <= Date.now();

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] overflow-hidden">
      <div className="p-4">
        {/* French Text */}
        <p className="text-lg font-medium text-[var(--accent-blue)] mb-1">
          {entry.frenchText}
        </p>

        {/* English Text */}
        <p className="text-[var(--foreground-secondary)] mb-3">
          {entry.englishText}
        </p>

        {/* Vocabulary Items */}
        {entry.vocabularyItems.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {entry.vocabularyItems.map((item, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[var(--background-tertiary)] text-xs"
              >
                <span className="text-[var(--accent-blue)]">{item.word}</span>
                <span className="text-[var(--foreground-muted)]">
                  ({item.partOfSpeech})
                </span>
                <span>{item.translation}</span>
              </span>
            ))}
          </div>
        )}

        {/* Meta Info */}
        <div className="flex items-center gap-4 text-xs text-[var(--foreground-muted)]">
          {entry.sceneSummary && (
            <span className="flex items-center gap-1">
              <ChevronRight className="h-3 w-3" />
              {entry.sceneSummary}
            </span>
          )}

          {entry.tags.length > 0 && (
            <span className="flex items-center gap-1">
              <Tag className="h-3 w-3" />
              {entry.tags.join(", ")}
            </span>
          )}

          <span
            className={`flex items-center gap-1 ${isDue ? "text-[var(--accent-red)]" : ""}`}
          >
            <Clock className="h-3 w-3" />
            {isDue
              ? "Due for review"
              : `Review ${formatRelativeDate(entry.nextReviewDate)}`}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 py-2 bg-[var(--background-secondary)] flex justify-end gap-2">
        <Link href={`/notebook/${entry._id}`}>
          <Button variant="ghost" size="sm">
            View Details
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
