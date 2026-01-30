"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useAuth } from "@/components/providers/auth-provider";
import { RequireAuth } from "@/components/auth/RequireAuth";

const CAMPAIGN_NAME = "Chains of Rivermoot";
const CAMPAIGN_DESCRIPTION =
  "A fantasy city at the confluence of two rivers, where magic and martial arts shape the balance of power. Slavery is woven into the institutions of Rivermoot — alliances shift, debts are called in, and freedom is never guaranteed. Navigate four quadrants, 17 locations, and the dangerous streets between them.";
const COVER_IMAGE = "/campaign-cover.svg";
const SEED_SCENARIO = "rivermoot-city";

export default function NewCampaignPage() {
  return (
    <RequireAuth>
      <NewCampaignContent />
    </RequireAuth>
  );
}

function NewCampaignContent() {
  const router = useRouter();
  const { user } = useAuth();
  const createCampaign = useMutation(api.campaigns.create);

  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!user?._id) {
      setError("You must be logged in to create a campaign");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const result = await createCampaign({
        userId: user._id,
        name: CAMPAIGN_NAME,
        seedScenario: SEED_SCENARIO,
        coverImage: COVER_IMAGE,
      });
      router.push(`/campaigns/${result.campaignId}`);
    } catch (err) {
      console.error("Failed to create campaign:", err);
      setError("Failed to create campaign. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-[var(--border)] bg-[var(--background-secondary)]">
        <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 lg:px-8">
          <Link
            href="/campaigns"
            className="inline-flex items-center gap-2 text-sm text-[var(--foreground-secondary)] hover:text-[var(--foreground)] mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to campaigns
          </Link>
          <h1 className="text-2xl font-bold">New Campaign</h1>
        </div>
      </header>

      {/* Hero Card */}
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <Card className="overflow-hidden">
          {/* Cover Image */}
          <div className="aspect-video bg-[var(--background-tertiary)] relative">
            <img
              src={COVER_IMAGE}
              alt={CAMPAIGN_NAME}
              className="w-full h-full object-cover"
            />
          </div>

          <CardContent className="p-6 space-y-4">
            <h2 className="text-2xl font-bold">{CAMPAIGN_NAME}</h2>
            <p className="text-sm text-[var(--foreground-secondary)] leading-relaxed">
              {CAMPAIGN_DESCRIPTION}
            </p>

            {/* Content Warning */}
            <div className="rounded-lg bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30 p-3">
              <p className="text-sm">
                <strong>Adult Content Notice:</strong> This game contains
                explicit content including violence, romance, and BDSM themes.
                By entering, you confirm you are 18+ years old.
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="rounded-lg bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30 p-3">
                <p className="text-sm text-[var(--accent-red)]">{error}</p>
              </div>
            )}

            {/* Action */}
            <Button
              className="w-full"
              size="lg"
              disabled={isCreating}
              onClick={handleCreate}
            >
              {isCreating ? "Creating..." : "Enter Rivermoot"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
