"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  Play,
  UserPlus,
  Copy,
  ArrowLeft,
  Crown,
  Swords,
  Heart,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const campaignId = params.campaignId as Id<"campaigns">;
  const [copied, setCopied] = useState(false);

  const campaign = useQuery(api.campaigns.get, { id: campaignId });
  const characters = useQuery(api.characters.listByCampaign, { campaignId });

  // Redirect to login if not authenticated
  if (!authLoading && !isAuthenticated) {
    router.push("/login");
    return null;
  }

  if (!campaign) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[var(--foreground-secondary)]">Loading campaign...</p>
      </div>
    );
  }

  const currentMember = campaign.members?.find((m) => m.userId === user?._id);
  const myCharacter = characters?.find((c) => c.userId === user?._id);
  const isOwner = currentMember?.role === "owner";

  const copyInviteCode = () => {
    navigator.clipboard.writeText(campaign.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="border-b border-[var(--border)] bg-[var(--background-secondary)]">
        <div className="mx-auto max-w-4xl px-4 py-6">
          <Link
            href="/campaigns"
            className="inline-flex items-center gap-2 text-sm text-[var(--foreground-secondary)] hover:text-[var(--foreground)] mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to campaigns
          </Link>

          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">{campaign.name}</h1>
              <p className="text-sm text-[var(--foreground-secondary)]">
                {campaign.status === "lobby" && "Waiting for players..."}
                {campaign.status === "active" && "Game in progress"}
                {campaign.status === "paused" && "Game paused"}
              </p>
            </div>

            {/* Invite Code */}
            <button
              onClick={copyInviteCode}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--background-tertiary)] hover:bg-[var(--border)] transition-colors"
            >
              <span className="font-mono text-lg tracking-wider">{campaign.inviteCode}</span>
              <Copy className="h-4 w-4" />
              {copied && <span className="text-xs text-[var(--accent-green)]">Copied!</span>}
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-4 py-6 space-y-6">
        {/* Action Buttons */}
        <div className="flex gap-4">
          {myCharacter ? (
            <Link href={`/play/${campaignId}`} className="flex-1">
              <Button className="w-full gap-2" size="lg">
                <Play className="h-5 w-5" />
                {campaign.status === "active" ? "Continue Game" : "Start Game"}
              </Button>
            </Link>
          ) : (
            <Link href={`/campaigns/${campaignId}/characters/new`} className="flex-1">
              <Button className="w-full gap-2" size="lg">
                <UserPlus className="h-5 w-5" />
                Create Character
              </Button>
            </Link>
          )}
        </div>

        {/* My Character */}
        {myCharacter && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Swords className="h-5 w-5" />
                My Character
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-[var(--accent-purple)] flex items-center justify-center text-white text-2xl font-bold">
                  {myCharacter.name[0]}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">{myCharacter.name}</h3>
                  <p className="text-sm text-[var(--foreground-secondary)]">
                    Level {myCharacter.level} {myCharacter.class || "Adventurer"}
                  </p>
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center gap-1">
                      <Heart className="h-4 w-4 text-[var(--accent-red)]" />
                      <span className="text-sm">
                        {myCharacter.hp}/{myCharacter.maxHp}
                      </span>
                    </div>
                    <div className="text-sm text-[var(--foreground-secondary)]">
                      {myCharacter.xp} XP
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Members */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Members ({campaign.members?.length || 0})
            </CardTitle>
            <CardDescription>Players in this campaign</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {campaign.members?.map((member) => {
                const memberCharacter = characters?.find(
                  (c) => c._id === member.characterId
                );
                return (
                  <div
                    key={member._id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-[var(--background-tertiary)]"
                  >
                    <div className="h-10 w-10 rounded-full bg-[var(--accent-blue)] flex items-center justify-center text-white font-medium">
                      {member.user?.displayName?.[0] || "?"}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {member.user?.displayName || "Unknown"}
                        </span>
                        {member.role === "owner" && (
                          <Crown className="h-4 w-4 text-[var(--accent-gold)]" />
                        )}
                      </div>
                      <p className="text-sm text-[var(--foreground-secondary)]">
                        {memberCharacter
                          ? `${memberCharacter.name} - Level ${memberCharacter.level}`
                          : "No character yet"}
                      </p>
                    </div>
                    <div
                      className={`h-2 w-2 rounded-full ${
                        member.isOnline
                          ? "bg-[var(--accent-green)]"
                          : "bg-[var(--foreground-muted)]"
                      }`}
                    />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* World State */}
        {campaign.worldState && (
          <Card>
            <CardHeader>
              <CardTitle>World State</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-[var(--foreground-secondary)]">
                Day {campaign.worldState.currentTime.day},{" "}
                {campaign.worldState.currentTime.hour.toString().padStart(2, "0")}:
                {campaign.worldState.currentTime.minute.toString().padStart(2, "0")}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Danger Zone for Owner */}
        {isOwner && (
          <Card className="border-[var(--accent-red)]/30">
            <CardHeader>
              <CardTitle className="text-[var(--accent-red)]">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="border-[var(--accent-red)] text-[var(--accent-red)]">
                Delete Campaign
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
