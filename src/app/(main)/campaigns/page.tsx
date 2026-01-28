"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Search, Swords, Clock, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth } from "@/components/providers/auth-provider";

function formatLastPlayed(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

function getStatusColor(status: string): string {
  switch (status) {
    case "active": return "bg-[var(--accent-green)]";
    case "lobby": return "bg-[var(--accent-gold)]";
    case "paused": return "bg-[var(--accent-yellow)]";
    default: return "bg-[var(--foreground-muted)]";
  }
}

export default function CampaignsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const campaigns = useQuery(
    api.campaigns.list,
    user?._id ? { userId: user._id } : "skip"
  );

  // Redirect to login if not authenticated
  if (!authLoading && !isAuthenticated) {
    router.push("/login");
    return null;
  }

  const isLoading = authLoading || campaigns === undefined;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-[var(--border)] bg-[var(--background-secondary)]">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold">Campaigns</h1>
              <p className="text-sm text-[var(--foreground-secondary)]">
                Your adventures await
              </p>
            </div>
            <Link href="/campaigns/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Campaign
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Search & Filters */}
      <div className="border-b border-[var(--border)] bg-[var(--background)]">
        <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--foreground-muted)]" />
              <Input
                placeholder="Search campaigns..."
                className="pl-10"
              />
            </div>
            <Button variant="outline">Filters</Button>
          </div>
        </div>
      </div>

      {/* Campaign List */}
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-[var(--foreground-secondary)]">Loading campaigns...</p>
          </div>
        ) : campaigns && campaigns.filter(c => c !== null).length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {campaigns.filter((c): c is NonNullable<typeof c> => c !== null).map((campaign) => (
              <Link key={campaign._id} href={`/campaigns/${campaign._id}`}>
                <CampaignCard
                  name={campaign.name}
                  status={campaign.status}
                  lastPlayed={formatLastPlayed(campaign.lastPlayedAt)}
                  playerCount={campaign.memberCount}
                />
              </Link>
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="h-16 w-16 rounded-full bg-[var(--background-tertiary)] flex items-center justify-center mb-4">
                <Swords className="h-8 w-8 text-[var(--foreground-muted)]" />
              </div>
              <h3 className="text-lg font-medium mb-2">No campaigns yet</h3>
              <p className="text-sm text-[var(--foreground-secondary)] mb-6 text-center max-w-md">
                Create your first campaign to start your adventure, or join an existing one with an invite code.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/campaigns/new">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Campaign
                  </Button>
                </Link>
                <Button variant="outline">
                  Enter Invite Code
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// Component for campaign cards
function CampaignCard({
  name,
  status,
  lastPlayed,
  playerCount,
  characterName,
  imageUrl,
}: {
  name: string;
  status: string;
  lastPlayed: string;
  playerCount: number;
  characterName?: string;
  imageUrl?: string;
}) {
  const statusLabel = status === "lobby" ? "Lobby" : status === "active" ? "Active" : status === "paused" ? "Paused" : status;

  return (
    <Card className="overflow-hidden cursor-pointer hover:border-[var(--accent-gold)] transition-colors">
      {/* Campaign Image */}
      <div className="aspect-video bg-[var(--background-tertiary)] relative">
        {imageUrl ? (
          <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Swords className="h-12 w-12 text-[var(--foreground-muted)]" />
          </div>
        )}
        {/* Status badge */}
        <div className={`absolute top-2 right-2 px-2 py-1 rounded text-xs text-white ${getStatusColor(status)}`}>
          {statusLabel}
        </div>
      </div>

      <CardContent className="p-4">
        <h3 className="font-medium mb-1 truncate">{name}</h3>
        {characterName && (
          <p className="text-sm text-[var(--accent-gold)] mb-2">
            Playing as {characterName}
          </p>
        )}
        <div className="flex items-center gap-4 text-xs text-[var(--foreground-muted)]">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {lastPlayed}
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {playerCount}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
