"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Sparkles, Globe, Users, Footprints, Heart, Crown, Flame, Map } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useAuth } from "@/components/providers/auth-provider";
import { RequireAuth } from "@/components/auth/RequireAuth";

const settings = [
  {
    id: "quebec-modern",
    name: "Modern Quebec",
    description: "Contemporary Montreal with hidden supernatural elements",
    icon: Globe,
  },
  {
    id: "quebec-fantasy",
    name: "Quebec Fantasy",
    description: "A magical version of Quebec with full fantasy elements",
    icon: Sparkles,
  },
  {
    id: "custom",
    name: "Custom Setting",
    description: "Define your own world with the AI DM",
    icon: Users,
  },
  {
    id: "rivermoot-city",
    name: "Rivermoot City",
    description: "A fantasy city at the confluence of two rivers — explore four quadrants, 17 locations, and the streets between them",
    icon: Map,
    seedScenario: "rivermoot-city",
  },
  {
    id: "foot-fetish-spa",
    name: "Foot Fetish Spa",
    description: "A private spa suite with two NPCs who share a love of feet — massage, worship, and pampering",
    icon: Footprints,
    seedScenario: "foot-fetish-spa",
  },
  {
    id: "bdsm-dungeon",
    name: "BDSM Dungeon",
    description: "A velvet-draped dungeon with a dominant mistress and a submissive servant",
    icon: Heart,
    seedScenario: "bdsm-dungeon",
  },
  {
    id: "servant-serving",
    name: "Devoted Servant",
    description: "Your personal servant is already kneeling at your feet, mid-service — an established dynamic you command",
    icon: Crown,
    seedScenario: "servant-serving",
  },
  {
    id: "mid-scene",
    name: "In Medias Res",
    description: "You're already deep in an intense, passionate encounter — pick up right in the heat of the moment",
    icon: Flame,
    seedScenario: "mid-scene",
  },
];

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

  const [campaignName, setCampaignName] = useState("");
  const [setting, setSetting] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!user?._id) {
      setError("You must be logged in to create a campaign");
      return;
    }

    if (!campaignName.trim()) {
      setError("Please enter a campaign name");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const selectedSetting = settings.find((s) => s.id === setting);
      const result = await createCampaign({
        userId: user._id,
        name: campaignName.trim(),
        seedScenario: selectedSetting && "seedScenario" in selectedSetting ? (selectedSetting as any).seedScenario : undefined,
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
          <h1 className="text-2xl font-bold">Create Campaign</h1>
          <p className="text-sm text-[var(--foreground-secondary)]">
            Start a new adventure
          </p>
        </div>
      </header>

      {/* Form */}
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-8">
          {/* Campaign Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Campaign Name</label>
            <Input
              placeholder="Enter a name for your campaign..."
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
            />
          </div>

          {/* Setting Selection */}
          <div className="space-y-4">
            <label className="text-sm font-medium">Choose a Setting</label>
            <div className="grid gap-4">
              {settings.map((s) => (
                <Card
                  key={s.id}
                  className={`cursor-pointer transition-colors ${
                    setting === s.id
                      ? "border-[var(--accent-gold)] bg-[var(--accent-gold)]/5"
                      : "hover:border-[var(--border-hover)]"
                  }`}
                  onClick={() => setSetting(s.id)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                          setting === s.id
                            ? "bg-[var(--accent-gold)] text-[var(--background)]"
                            : "bg-[var(--background-tertiary)]"
                        }`}
                      >
                        <s.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{s.name}</CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>{s.description}</CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Content Warning */}
          <Card className="bg-[var(--accent-red)]/10 border-[var(--accent-red)]/30">
            <CardContent className="py-4">
              <p className="text-sm">
                <strong>Adult Content Notice:</strong> This game contains explicit content
                including violence, romance, and BDSM themes. By creating this campaign,
                you confirm you are 18+ years old.
              </p>
            </CardContent>
          </Card>

          {/* Error Message */}
          {error && (
            <Card className="bg-[var(--accent-red)]/10 border-[var(--accent-red)]/30">
              <CardContent className="py-4">
                <p className="text-sm text-[var(--accent-red)]">{error}</p>
              </CardContent>
            </Card>
          )}

          {/* Submit */}
          <div className="flex gap-4">
            <Link href="/campaigns" className="flex-1">
              <Button variant="outline" className="w-full">
                Cancel
              </Button>
            </Link>
            <Button
              className="flex-1"
              disabled={!campaignName.trim() || isCreating}
              onClick={handleCreate}
            >
              {isCreating ? "Creating..." : "Create Campaign"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
