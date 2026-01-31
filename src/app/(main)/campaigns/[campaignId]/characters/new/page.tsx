"use client";

import { useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "../../../../../../../convex/_generated/api";
import { Id } from "../../../../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Camera, ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/components/providers/auth-provider";
import { RequireAuth } from "@/components/auth/RequireAuth";

const ABILITY_NAMES = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"] as const;
type AbilityName = (typeof ABILITY_NAMES)[number];

const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];

const CLASSES = [
  { id: "warrior", name: "Warrior", description: "Skilled in combat and physical prowess" },
  { id: "rogue", name: "Rogue", description: "Master of stealth, deception, and precision" },
  { id: "scholar", name: "Scholar", description: "Knowledgeable and analytical, solves problems with intellect" },
  { id: "socialite", name: "Socialite", description: "Charming and persuasive, excels in social situations" },
  { id: "artist", name: "Artist", description: "Creative and expressive, sees beauty in everything" },
  { id: "healer", name: "Healer", description: "Compassionate and nurturing, cares for others" },
];

const BACKGROUNDS = [
  { id: "student", name: "Student", description: "Recently arrived to study, eager to learn" },
  { id: "professional", name: "Professional", description: "Established career, seeking new experiences" },
  { id: "traveler", name: "Traveler", description: "Wanderer seeking adventure and connection" },
  { id: "local", name: "Local", description: "Born and raised here, knows the area well" },
  { id: "refugee", name: "Refugee", description: "Fled from elsewhere, starting fresh" },
  { id: "artist", name: "Artist", description: "Creative soul following their passion" },
];

const ORIENTATIONS = [
  "Heterosexual",
  "Homosexual",
  "Bisexual",
  "Pansexual",
  "Asexual",
  "Demisexual",
  "Queer",
  "Questioning",
];

const KINK_CATEGORIES = {
  "Bondage & Restraint": ["rope", "cuffs", "spreaderBars", "shibari", "predicament"],
  "Impact": ["spanking", "flogging", "caning", "paddling", "bareHand"],
  "Sensation": ["wax", "ice", "pinwheels", "tickling", "scratching"],
  "Power Exchange": ["protocols", "titles", "orgasmControl", "chastity", "punishmentReward"],
  "Service": ["domesticService", "bodyWorship", "grooming", "devotion"],
  "Role Play": ["petPlay", "authorityFigures", "strangerScenarios", "preyPredator"],
  "Exhibition": ["beingWatched", "watching", "publicPlay", "photography"],
};

interface CharacterData {
  name: string;
  pronouns: string;
  abilities: Record<AbilityName, number>;
  class: string;
  background: string;
  adultStats: {
    composure: number;
    arousal: number;
    dominance: number;
    submission: number;
  };
  kinkPreferences: Record<string, number>;
  hardLimits: string[];
  orientation: string;
}

export default function NewCharacterPage() {
  return (
    <RequireAuth>
      <NewCharacterPageContent />
    </RequireAuth>
  );
}

function NewCharacterPageContent() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const campaignId = params.campaignId as Id<"campaigns">;
  const createCharacter = useMutation(api.characters.create);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [portraitStorageId, setPortraitStorageId] = useState<Id<"_storage"> | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showKinks, setShowKinks] = useState(false);

  const [character, setCharacter] = useState<CharacterData>({
    name: "",
    pronouns: "they/them",
    abilities: {
      strength: 10,
      dexterity: 10,
      constitution: 10,
      intelligence: 10,
      wisdom: 10,
      charisma: 10,
    },
    class: "",
    background: "",
    adultStats: {
      composure: 75,
      arousal: 0,
      dominance: 50,
      submission: 50,
    },
    kinkPreferences: {},
    hardLimits: [],
    orientation: "Bisexual",
  });

  const [abilityAssignments, setAbilityAssignments] = useState<Record<AbilityName, number | null>>({
    strength: null,
    dexterity: null,
    constitution: null,
    intelligence: null,
    wisdom: null,
    charisma: null,
  });

  const assignAbility = (ability: AbilityName, value: number) => {
    if (abilityAssignments[ability] === value) {
      setAbilityAssignments((prev) => ({ ...prev, [ability]: null }));
      setCharacter((prev) => ({
        ...prev,
        abilities: { ...prev.abilities, [ability]: 10 },
      }));
      return;
    }

    const existingAbility = Object.entries(abilityAssignments).find(
      ([_, v]) => v === value
    )?.[0] as AbilityName | undefined;

    const currentValue = abilityAssignments[ability];

    setAbilityAssignments((prev) => ({
      ...prev,
      [ability]: value,
      ...(existingAbility && existingAbility !== ability ? { [existingAbility]: currentValue } : {}),
    }));

    setCharacter((prev) => ({
      ...prev,
      abilities: {
        ...prev.abilities,
        [ability]: value,
        ...(existingAbility && existingAbility !== ability ? { [existingAbility]: currentValue || 10 } : {}),
      },
    }));
  };

  const getAvailableScores = () => {
    const assigned = Object.values(abilityAssignments).filter((v) => v !== null) as number[];
    return STANDARD_ARRAY.filter((s) => !assigned.includes(s));
  };

  const updateKink = (kink: string, level: number) => {
    setCharacter((prev) => ({
      ...prev,
      kinkPreferences: { ...prev.kinkPreferences, [kink]: level },
    }));
  };

  const calculateModifier = (score: number) => {
    const mod = Math.floor((score - 10) / 2);
    return mod >= 0 ? `+${mod}` : `${mod}`;
  };

  const handleAvatarUpload = async (file: File) => {
    setIsUploading(true);
    try {
      // Local preview
      const previewUrl = URL.createObjectURL(file);
      setAvatarPreview(previewUrl);

      // Upload to Convex
      const uploadUrl = await generateUploadUrl();
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await result.json();
      setPortraitStorageId(storageId as Id<"_storage">);
    } catch (err) {
      console.error("Failed to upload avatar:", err);
      setError("Failed to upload image. Please try again.");
      setAvatarPreview(null);
      setPortraitStorageId(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreate = async () => {
    if (!user?._id) {
      setError("You must be logged in to create a character");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      await createCharacter({
        campaignId,
        name: character.name,
        pronouns: character.pronouns,
        portrait: portraitStorageId ?? undefined,
        abilities: character.abilities,
        class: character.class || undefined,
        background: character.background || undefined,
        adultStats: character.adultStats,
        kinkPreferences: character.kinkPreferences,
        hardLimits: character.hardLimits,
      });
      router.push(`/campaigns/${campaignId}`);
    } catch (err) {
      console.error("Failed to create character:", err);
      setError("Failed to create character. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="border-b border-[var(--border)] bg-[var(--background-secondary)] sticky top-0 z-10">
        <div className="mx-auto max-w-4xl px-4 py-4">
          <Link
            href={`/campaigns/${campaignId}`}
            className="inline-flex items-center gap-2 text-sm text-[var(--foreground-secondary)] hover:text-[var(--foreground)] mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to campaign
          </Link>
          <h1 className="text-xl font-bold">Create Character</h1>
        </div>
      </header>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-4 py-6 space-y-10">

        {/* ── Section 1: Identity ── */}
        <section className="space-y-6">
          <h2 className="text-lg font-semibold">Identity</h2>

          {/* Avatar Upload */}
          <div className="flex items-start gap-6">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="relative w-[120px] h-[120px] shrink-0 rounded-full border-2 border-dashed border-[var(--border)] hover:border-[var(--accent-gold)] transition-colors overflow-hidden flex items-center justify-center bg-[var(--background-tertiary)]"
            >
              {avatarPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarPreview}
                  alt="Avatar preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center gap-1 text-[var(--foreground-muted)]">
                  <Camera className="h-6 w-6" />
                  <span className="text-xs">Upload</span>
                </div>
              )}
              {isUploading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleAvatarUpload(file);
              }}
            />

            <div className="flex-1 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium mb-2">Character Name</label>
                <Input
                  placeholder="Enter your character's name..."
                  value={character.name}
                  onChange={(e) => setCharacter({ ...character, name: e.target.value })}
                />
              </div>

              {/* Pronouns */}
              <div>
                <label className="block text-sm font-medium mb-2">Pronouns</label>
                <div className="flex flex-wrap gap-2">
                  {["he/him", "she/her", "they/them", "other"].map((p) => (
                    <button
                      key={p}
                      onClick={() => setCharacter({ ...character, pronouns: p })}
                      className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                        character.pronouns === p
                          ? "bg-[var(--accent-gold)] text-[var(--background)]"
                          : "bg-[var(--background-tertiary)] hover:bg-[var(--border)]"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <hr className="border-[var(--border)]" />

        {/* ── Section 2: Ability Scores ── */}
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold mb-1">Ability Scores</h2>
            <p className="text-sm text-[var(--foreground-secondary)]">
              Assign the standard array: {STANDARD_ARRAY.join(", ")}
            </p>
          </div>

          <div className="grid grid-cols-6 gap-3">
            {ABILITY_NAMES.map((ability) => (
              <div key={ability} className="flex flex-col items-center gap-2">
                <span className="text-xs uppercase font-medium text-[var(--foreground-secondary)]">
                  {ability.slice(0, 3)}
                </span>
                <select
                  value={abilityAssignments[ability] ?? ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "") {
                      // Deselect
                      if (abilityAssignments[ability] !== null) {
                        setAbilityAssignments((prev) => ({ ...prev, [ability]: null }));
                        setCharacter((prev) => ({
                          ...prev,
                          abilities: { ...prev.abilities, [ability]: 10 },
                        }));
                      }
                    } else {
                      assignAbility(ability, parseInt(val));
                    }
                  }}
                  className="w-full bg-[var(--background-tertiary)] border border-[var(--border)] rounded-lg px-2 py-2 text-center text-lg font-bold appearance-none cursor-pointer focus:border-[var(--accent-gold)] focus:outline-none"
                >
                  <option value="">—</option>
                  {STANDARD_ARRAY.map((score) => {
                    const isAvailable = getAvailableScores().includes(score) || abilityAssignments[ability] === score;
                    return (
                      <option key={score} value={score} disabled={!isAvailable}>
                        {score}
                      </option>
                    );
                  })}
                </select>
                <span className="text-sm font-mono text-[var(--foreground-muted)]">
                  {abilityAssignments[ability] !== null
                    ? calculateModifier(abilityAssignments[ability]!)
                    : "—"}
                </span>
              </div>
            ))}
          </div>
        </section>

        <hr className="border-[var(--border)]" />

        {/* ── Section 3: Class & Background ── */}
        <section className="space-y-6">
          <h2 className="text-lg font-semibold">Class & Background</h2>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Class */}
            <div>
              <label className="block text-sm font-medium mb-3">Class</label>
              <div className="grid gap-3">
                {CLASSES.map((c) => (
                  <Card
                    key={c.id}
                    className={`cursor-pointer transition-colors ${
                      character.class === c.id
                        ? "border-[var(--accent-gold)] bg-[var(--accent-gold)]/5"
                        : "hover:border-[var(--border-hover)]"
                    }`}
                    onClick={() => setCharacter({
                      ...character,
                      class: character.class === c.id ? "" : c.id,
                    })}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">{c.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription>{c.description}</CardDescription>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Background */}
            <div>
              <label className="block text-sm font-medium mb-3">Background</label>
              <div className="grid gap-3">
                {BACKGROUNDS.map((b) => (
                  <Card
                    key={b.id}
                    className={`cursor-pointer transition-colors ${
                      character.background === b.id
                        ? "border-[var(--accent-gold)] bg-[var(--accent-gold)]/5"
                        : "hover:border-[var(--border-hover)]"
                    }`}
                    onClick={() => setCharacter({
                      ...character,
                      background: character.background === b.id ? "" : b.id,
                    })}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">{b.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription>{b.description}</CardDescription>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        <hr className="border-[var(--border)]" />

        {/* ── Section 4: Intimacy Profile ── */}
        <section className="space-y-6">
          <h2 className="text-lg font-semibold">Intimacy Profile</h2>

          {/* Orientation */}
          <div>
            <label className="block text-sm font-medium mb-3">Orientation</label>
            <div className="flex flex-wrap gap-2">
              {ORIENTATIONS.map((o) => (
                <button
                  key={o}
                  onClick={() => setCharacter({ ...character, orientation: o })}
                  className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                    character.orientation === o
                      ? "bg-[var(--accent-gold)] text-[var(--background)]"
                      : "bg-[var(--background-tertiary)] hover:bg-[var(--border)]"
                  }`}
                >
                  {o}
                </button>
              ))}
            </div>
          </div>

          {/* Power Dynamics */}
          <div className="space-y-4">
            <label className="block text-sm font-medium">Power Dynamics</label>
            <p className="text-xs text-[var(--foreground-secondary)]">
              Both dominance and submission are separate axes — you can be high in both (switch), low in both (vanilla), or lean one way.
            </p>

            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { key: "dominance", label: "Dominance", description: "Desire to lead, control, or top" },
                { key: "submission", label: "Submission", description: "Desire to follow, yield, or bottom" },
              ].map(({ key, label, description }) => (
                <div key={key} className="space-y-1">
                  <div className="flex justify-between text-xs text-[var(--foreground-secondary)]">
                    <span>{label}: {character.adultStats[key as keyof typeof character.adultStats]}</span>
                    <span className="text-[var(--foreground-muted)]">{description}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={character.adultStats[key as keyof typeof character.adultStats]}
                    onChange={(e) =>
                      setCharacter({
                        ...character,
                        adultStats: {
                          ...character.adultStats,
                          [key]: parseInt(e.target.value),
                        },
                      })
                    }
                    className="w-full accent-[var(--accent-gold)]"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Kink Preferences — Collapsible */}
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setShowKinks(!showKinks)}
              className="flex items-center gap-2 text-sm font-medium hover:text-[var(--accent-gold)] transition-colors"
            >
              {showKinks ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              {showKinks ? "Hide Preferences" : "Show Preferences"}
            </button>

            {showKinks && (
              <div className="space-y-4">
                <p className="text-xs text-[var(--foreground-secondary)]">
                  Click to cycle: Neutral → Curious → Enthusiast → Expert → Hard Limit → Soft Limit → Neutral
                </p>

                {Object.entries(KINK_CATEGORIES).map(([category, kinks]) => (
                  <div key={category} className="space-y-2">
                    <h4 className="text-sm text-[var(--foreground-secondary)]">{category}</h4>
                    <div className="flex flex-wrap gap-2">
                      {kinks.map((kink) => {
                        const level = character.kinkPreferences[kink] || 0;
                        const colors: Record<string, string> = {
                          "-2": "bg-[var(--accent-red)] text-white",
                          "-1": "bg-[var(--accent-red)]/30",
                          "0": "bg-[var(--background-tertiary)]",
                          "1": "bg-[var(--accent-blue)]/30",
                          "2": "bg-[var(--accent-green)]/30",
                          "3": "bg-[var(--accent-gold)] text-[var(--background)]",
                        };
                        const labels: Record<string, string> = {
                          "-2": "Hard Limit",
                          "-1": "Soft Limit",
                          "0": "Neutral",
                          "1": "Curious",
                          "2": "Enthusiast",
                          "3": "Expert",
                        };
                        return (
                          <button
                            key={kink}
                            onClick={() => {
                              const newLevel = level >= 3 ? -2 : level + 1;
                              updateKink(kink, newLevel);
                            }}
                            className={`px-3 py-1.5 rounded text-xs transition-colors ${colors[level.toString()] ?? colors["0"]}`}
                            title={labels[level.toString()] ?? "Neutral"}
                          >
                            {kink.replace(/([A-Z])/g, " $1").trim()}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Error Message */}
        {error && (
          <div className="rounded-lg bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30 px-4 py-3">
            <p className="text-sm text-[var(--accent-red)]">{error}</p>
          </div>
        )}
      </div>

      {/* Sticky Footer */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-[var(--border)] bg-[var(--background-secondary)] p-4 lg:pl-60">
        <div className="mx-auto max-w-4xl">
          <Button
            onClick={handleCreate}
            disabled={isCreating || isUploading}
            className="w-full"
          >
            {isCreating ? "Creating..." : "Create Character"}
          </Button>
        </div>
      </div>
    </div>
  );
}
