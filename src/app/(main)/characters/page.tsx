"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useAuth } from "@/components/providers/auth-provider";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Swords, Heart, Plus } from "lucide-react";
import Link from "next/link";

interface CharacterInfo {
  _id: Id<"characters">;
  name: string;
  level: number;
  class?: string;
  hp: number;
  maxHp: number;
  xp: number;
  campaignName: string;
  campaignId: Id<"campaigns">;
}

export default function CharactersPage() {
  return (
    <RequireAuth>
      <CharactersPageContent />
    </RequireAuth>
  );
}

function CharactersPageContent() {
  const { user } = useAuth();

  const campaigns = useQuery(
    api.campaigns.list,
    user?._id ? { userId: user._id } : "skip"
  );

  // Get all characters for campaigns where user has a character
  const characters = useQuery(
    api.characters.listByUser,
    user?._id ? { userId: user._id } : "skip"
  );

  // Combine character data with campaign names
  const allCharacters: CharacterInfo[] = (characters || []).map((char) => {
    const campaign = campaigns?.find((c) => c !== null && c._id === char.campaignId);
    return {
      _id: char._id,
      name: char.name,
      level: char.level,
      class: char.class,
      hp: char.hp,
      maxHp: char.maxHp,
      xp: char.xp,
      campaignName: campaign?.name || "Unknown Campaign",
      campaignId: char.campaignId,
    };
  });

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="border-b border-[var(--border)] bg-[var(--background-secondary)]">
        <div className="mx-auto max-w-4xl px-4 py-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Swords className="h-6 w-6" />
            My Characters
          </h1>
          <p className="text-sm text-[var(--foreground-secondary)] mt-1">
            All your characters across campaigns
          </p>
        </div>
      </header>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-4 py-6 space-y-6">
        {allCharacters.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Swords className="h-12 w-12 mx-auto text-[var(--foreground-muted)] mb-4" />
              <h3 className="text-lg font-semibold mb-2">No characters yet</h3>
              <p className="text-sm text-[var(--foreground-secondary)] mb-4">
                Join a campaign to create your first character
              </p>
              <Link href="/campaigns">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Browse Campaigns
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {allCharacters.map((character) => (
              <Link
                key={character._id}
                href={`/campaigns/${character.campaignId}`}
              >
                <Card className="hover:border-[var(--border-hover)] transition-colors cursor-pointer">
                  <CardContent className="py-4">
                    <div className="flex items-center gap-4">
                      <div className="h-16 w-16 rounded-full bg-[var(--accent-purple)] flex items-center justify-center text-white text-2xl font-bold">
                        {character.name[0]}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold">{character.name}</h3>
                        <p className="text-sm text-[var(--foreground-secondary)]">
                          Level {character.level} {character.class || "Adventurer"}
                        </p>
                        <p className="text-xs text-[var(--foreground-muted)] mt-1">
                          {character.campaignName}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 justify-end">
                          <Heart className="h-4 w-4 text-[var(--accent-red)]" />
                          <span className="text-sm">
                            {character.hp}/{character.maxHp}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--foreground-muted)]">
                          {character.xp} XP
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
