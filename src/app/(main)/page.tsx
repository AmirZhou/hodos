"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Play, Users, Swords, Heart, BookOpen, Clock } from "lucide-react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
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

export default function HomePage() {
  const { user, isAuthenticated } = useAuth();

  const campaigns = useQuery(
    api.campaigns.list,
    user?._id ? { userId: user._id } : "skip"
  );

  // Get up to 4 most recent campaigns
  const recentCampaigns = campaigns
    ?.filter((c): c is NonNullable<typeof c> => c !== null)
    .sort((a, b) => b.lastPlayedAt - a.lastPlayedAt)
    .slice(0, 4) || [];
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-[var(--border)] bg-gradient-to-br from-[var(--background)] via-[var(--background-secondary)] to-[var(--background)]">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5" />
        <div className="relative mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Create & Play
              <span className="block text-[var(--accent-gold)]">AI RPGs</span>
            </h1>
            <p className="mt-6 text-lg text-[var(--foreground-secondary)] max-w-2xl mx-auto">
              Immersive tabletop adventures powered by AI. Full D&D mechanics,
              deep relationships, and seamless French learning built right in.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/campaigns/new">
                <Button size="lg" className="w-full sm:w-auto">
                  <Plus className="mr-2 h-5 w-5" />
                  Start Your Adventure
                </Button>
              </Link>
              <Link href="/discover">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  Browse Campaigns
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Recent Campaigns */}
      <section className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Recent Campaigns</h2>
            <Link href="/campaigns" className="text-sm text-[var(--accent-gold)] hover:underline">
              View all
            </Link>
          </div>

          {/* Empty state */}
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="h-12 w-12 rounded-full bg-[var(--background-tertiary)] flex items-center justify-center mb-4">
                <Swords className="h-6 w-6 text-[var(--foreground-muted)]" />
              </div>
              <h3 className="font-medium mb-1">No campaigns yet</h3>
              <p className="text-sm text-[var(--foreground-secondary)] mb-4">
                Start your first adventure
              </p>
              <Link href="/campaigns/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Campaign
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Features */}
      <section className="px-4 py-12 sm:px-6 lg:px-8 border-t border-[var(--border)]">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-xl font-semibold mb-6">What Makes Hodos Special</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <FeatureCard
              icon={Swords}
              title="Full D&D Mechanics"
              description="Real ability scores, skill checks, tactical combat, and leveling"
            />
            <FeatureCard
              icon={Heart}
              title="Deep Relationships"
              description="Romance, trust, and intimate dynamics with meaningful consequences"
            />
            <FeatureCard
              icon={Users}
              title="Multiplayer Ready"
              description="Play with friends, video chat, persistent campaign state"
            />
            <FeatureCard
              icon={BookOpen}
              title="Learn French"
              description="Bilingual display with tap-to-translate and vocabulary tracking"
            />
          </div>
        </div>
      </section>

      {/* Age Verification Notice */}
      <section className="px-4 py-8 sm:px-6 lg:px-8 border-t border-[var(--border)] bg-[var(--background-secondary)]">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-sm text-[var(--foreground-muted)]">
            Hodos contains explicit adult content. By playing, you confirm you are 18+ years old.
          </p>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <Card className="bg-[var(--background-secondary)]">
      <CardHeader className="pb-2">
        <div className="h-10 w-10 rounded-lg bg-[var(--background-tertiary)] flex items-center justify-center mb-2">
          <Icon className="h-5 w-5 text-[var(--accent-gold)]" />
        </div>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription>{description}</CardDescription>
      </CardContent>
    </Card>
  );
}
