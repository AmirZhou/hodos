"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { useAuth } from "@/components/providers/auth-provider";
import { ReviewSession } from "@/components/learning/ReviewSession";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, BookOpen, CheckCircle } from "lucide-react";
import Link from "next/link";

type Rating = "wrong" | "hard" | "medium" | "easy";

export default function ReviewPage() {
  const [isComplete, setIsComplete] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);

  const { user, isLoading: authLoading } = useAuth();
  const userId = user?._id ?? null;

  const entries = useQuery(
    api.notebook.getDueForReview,
    userId ? { userId } : "skip"
  );

  const recordReview = useMutation(api.notebook.recordReview);

  const handleRate = async (entryId: string, rating: Rating) => {
    await recordReview({
      entryId: entryId as Id<"notebook">,
      rating,
    });
    setReviewedCount((c) => c + 1);
  };

  const handleComplete = () => {
    setIsComplete(true);
  };

  // Loading state
  if (authLoading || (userId && entries === undefined)) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-[var(--accent-gold)]" />
          <p className="text-[var(--foreground-secondary)]">
            Loading review session...
          </p>
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
          <h2 className="text-xl font-medium">Sign in to review</h2>
          <p className="text-[var(--foreground-secondary)]">
            Your saved French sentences will appear here for review.
          </p>
          <Link href="/login">
            <Button>Sign In</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Completed state
  if (isComplete) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="text-center py-16">
          <CheckCircle className="h-20 w-20 mx-auto text-[var(--accent-green)] mb-6" />
          <h2 className="text-2xl font-bold mb-2">Review Complete!</h2>
          <p className="text-[var(--foreground-secondary)] mb-6">
            You reviewed {reviewedCount} {reviewedCount === 1 ? "item" : "items"}.
            Great work keeping up with your French learning!
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/notebook">
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Notebook
              </Button>
            </Link>
            <Link href="/play">
              <Button className="gap-2">
                <BookOpen className="h-4 w-4" />
                Continue Playing
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <Link
          href="/notebook"
          className="inline-flex items-center gap-2 text-[var(--foreground-secondary)] hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Notebook
        </Link>

        {entries && entries.length > 0 && (
          <span className="text-sm text-[var(--foreground-muted)]">
            {entries.length} {entries.length === 1 ? "item" : "items"} due
          </span>
        )}
      </div>

      {/* Review Session */}
      <ReviewSession
        entries={entries ?? []}
        onRate={handleRate}
        onComplete={handleComplete}
      />
    </div>
  );
}
