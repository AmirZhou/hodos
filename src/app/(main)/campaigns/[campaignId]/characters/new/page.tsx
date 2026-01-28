"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "../../../../../../../convex/_generated/api";
import { Id } from "../../../../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, Check, User, Dices, Heart, Sparkles } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/components/providers/auth-provider";

type Step = "basics" | "abilities" | "class" | "intimacy" | "review";

const STEPS: { id: Step; title: string; icon: React.ElementType }[] = [
  { id: "basics", title: "Basics", icon: User },
  { id: "abilities", title: "Abilities", icon: Dices },
  { id: "class", title: "Class", icon: Sparkles },
  { id: "intimacy", title: "Intimacy", icon: Heart },
  { id: "review", title: "Review", icon: Check },
];

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
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const campaignId = params.campaignId as Id<"campaigns">;
  const createCharacter = useMutation(api.characters.create);

  const [currentStep, setCurrentStep] = useState<Step>("basics");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // Redirect to login if not authenticated
  if (!authLoading && !isAuthenticated) {
    router.push("/login");
    return null;
  }

  const currentStepIndex = STEPS.findIndex((s) => s.id === currentStep);

  const goNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      setCurrentStep(STEPS[nextIndex].id);
    }
  };

  const goPrev = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex].id);
    }
  };

  const assignAbility = (ability: AbilityName, value: number) => {
    // If clicking on already-assigned value for this ability, deselect it
    if (abilityAssignments[ability] === value) {
      setAbilityAssignments((prev) => ({
        ...prev,
        [ability]: null,
      }));
      setCharacter((prev) => ({
        ...prev,
        abilities: {
          ...prev.abilities,
          [ability]: 10, // Reset to default
        },
      }));
      return;
    }

    // Find if this value is already assigned elsewhere
    const existingAbility = Object.entries(abilityAssignments).find(
      ([_, v]) => v === value
    )?.[0] as AbilityName | undefined;

    // If the ability already has a value, swap them
    const currentValue = abilityAssignments[ability];

    setAbilityAssignments((prev) => ({
      ...prev,
      [ability]: value,
      ...(existingAbility && existingAbility !== ability ? { [existingAbility]: currentValue } : {}),
    }));

    // Update character abilities
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
      kinkPreferences: {
        ...prev.kinkPreferences,
        [kink]: level,
      },
    }));
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
        userId: user._id,
        campaignId,
        name: character.name,
        pronouns: character.pronouns,
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

  const calculateModifier = (score: number) => {
    const mod = Math.floor((score - 10) / 2);
    return mod >= 0 ? `+${mod}` : `${mod}`;
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

          {/* Step Indicator */}
          <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-2">
            {STEPS.map((step, index) => (
              <button
                key={step.id}
                onClick={() => setCurrentStep(step.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                  currentStep === step.id
                    ? "bg-[var(--accent-gold)] text-[var(--background)]"
                    : index < currentStepIndex
                      ? "bg-[var(--accent-green)]/20 text-[var(--accent-green)]"
                      : "bg-[var(--background-tertiary)] text-[var(--foreground-secondary)]"
                }`}
              >
                <step.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{step.title}</span>
                <span className="sm:hidden">{index + 1}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-4 py-6">
        {/* Step: Basics */}
        {currentStep === "basics" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-1">Basic Information</h2>
              <p className="text-sm text-[var(--foreground-secondary)]">
                Who is your character?
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Character Name</label>
                <Input
                  placeholder="Enter your character's name..."
                  value={character.name}
                  onChange={(e) => setCharacter({ ...character, name: e.target.value })}
                />
              </div>

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
        )}

        {/* Step: Abilities */}
        {currentStep === "abilities" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-1">Ability Scores</h2>
              <p className="text-sm text-[var(--foreground-secondary)]">
                Assign the standard array: {STANDARD_ARRAY.join(", ")}
              </p>
            </div>

            <div className="grid gap-4">
              {ABILITY_NAMES.map((ability) => (
                <div key={ability} className="flex items-center gap-4">
                  <div className="w-28 capitalize font-medium">{ability}</div>
                  <div className="flex gap-2 flex-wrap flex-1">
                    {STANDARD_ARRAY.map((score) => {
                      const isAssigned = abilityAssignments[ability] === score;
                      const isAvailable = getAvailableScores().includes(score) || isAssigned;
                      return (
                        <button
                          key={score}
                          onClick={() => assignAbility(ability, score)}
                          disabled={!isAvailable}
                          className={`w-12 h-12 rounded-lg text-lg font-bold transition-colors ${
                            isAssigned
                              ? "bg-[var(--accent-gold)] text-[var(--background)]"
                              : isAvailable
                                ? "bg-[var(--background-tertiary)] hover:bg-[var(--border)]"
                                : "bg-[var(--background-secondary)] text-[var(--foreground-muted)] opacity-50"
                          }`}
                        >
                          {score}
                        </button>
                      );
                    })}
                  </div>
                  <div className="w-16 text-center">
                    <span className="text-lg font-mono">
                      {abilityAssignments[ability]
                        ? calculateModifier(abilityAssignments[ability]!)
                        : "--"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step: Class */}
        {currentStep === "class" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-1">Class & Background</h2>
              <p className="text-sm text-[var(--foreground-secondary)]">
                Choose your character's archetype and history
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-3">Class</label>
              <div className="grid sm:grid-cols-2 gap-3">
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
                      class: character.class === c.id ? "" : c.id
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

            <div>
              <label className="block text-sm font-medium mb-3">Background</label>
              <div className="grid sm:grid-cols-2 gap-3">
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
                      background: character.background === b.id ? "" : b.id
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
        )}

        {/* Step: Intimacy */}
        {currentStep === "intimacy" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-1">Intimacy Profile</h2>
              <p className="text-sm text-[var(--foreground-secondary)]">
                Define your character's intimate preferences. This affects available interactions.
              </p>
            </div>

            {/* Orientation */}
            <div>
              <label className="block text-sm font-medium mb-3">Orientation</label>
              <div className="flex flex-wrap gap-2">
                {ORIENTATIONS.map((o) => (
                  <button
                    key={o}
                    onClick={() =>
                      setCharacter({
                        ...character,
                        orientation: o,
                      })
                    }
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

            {/* Power Dynamics (Two-Axis) */}
            <div className="space-y-4">
              <label className="block text-sm font-medium">Power Dynamics</label>
              <p className="text-xs text-[var(--foreground-secondary)]">
                Both dominance and submission are separate axes — you can be high in both (switch), low in both (vanilla), or lean one way.
              </p>

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

            {/* Kink Selection */}
            <div className="space-y-4">
              <label className="block text-sm font-medium">Kink Preferences</label>
              <p className="text-xs text-[var(--foreground-secondary)]">
                Click to cycle: Neutral → Curious → Enthusiast → Limit
              </p>

              {Object.entries(KINK_CATEGORIES).map(([category, kinks]) => (
                <div key={category} className="space-y-2">
                  <h4 className="text-sm text-[var(--foreground-secondary)]">{category}</h4>
                  <div className="flex flex-wrap gap-2">
                    {kinks.map((kink) => {
                      const level = character.kinkPreferences[kink] || 0;
                      const colors = {
                        "-2": "bg-[var(--accent-red)] text-white",
                        "-1": "bg-[var(--accent-red)]/30",
                        "0": "bg-[var(--background-tertiary)]",
                        "1": "bg-[var(--accent-blue)]/30",
                        "2": "bg-[var(--accent-green)]/30",
                        "3": "bg-[var(--accent-gold)] text-[var(--background)]",
                      };
                      const labels = {
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
                          className={`px-3 py-1.5 rounded text-xs transition-colors ${colors[level.toString() as keyof typeof colors]}`}
                          title={labels[level.toString() as keyof typeof labels]}
                        >
                          {kink.replace(/([A-Z])/g, " $1").trim()}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Aftercare & Trust */}
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Aftercare Need</span>
                  <span className="text-[var(--foreground-secondary)]">
                    {character.intimacyProfile.aftercareNeed}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={character.intimacyProfile.aftercareNeed}
                  onChange={(e) =>
                    setCharacter({
                      ...character,
                      intimacyProfile: {
                        ...character.intimacyProfile,
                        aftercareNeed: parseInt(e.target.value),
                      },
                    })
                  }
                  className="w-full accent-[var(--accent-gold)]"
                />
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Trust Threshold (before intimacy)</span>
                  <span className="text-[var(--foreground-secondary)]">
                    {character.intimacyProfile.trustThreshold}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={character.intimacyProfile.trustThreshold}
                  onChange={(e) =>
                    setCharacter({
                      ...character,
                      intimacyProfile: {
                        ...character.intimacyProfile,
                        trustThreshold: parseInt(e.target.value),
                      },
                    })
                  }
                  className="w-full accent-[var(--accent-gold)]"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step: Review */}
        {currentStep === "review" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-1">Review Character</h2>
              <p className="text-sm text-[var(--foreground-secondary)]">
                Make sure everything looks good before creating your character
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>{character.name || "Unnamed Character"}</CardTitle>
                <CardDescription>{character.pronouns}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Abilities */}
                <div>
                  <h4 className="text-sm font-medium mb-2">Ability Scores</h4>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {ABILITY_NAMES.map((ability) => (
                      <div key={ability} className="text-center p-2 bg-[var(--background-tertiary)] rounded">
                        <div className="text-xs uppercase text-[var(--foreground-secondary)]">
                          {ability.slice(0, 3)}
                        </div>
                        <div className="text-lg font-bold">{character.abilities[ability]}</div>
                        <div className="text-xs text-[var(--foreground-muted)]">
                          {calculateModifier(character.abilities[ability])}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Class & Background */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium mb-1">Class</h4>
                    <p className="text-[var(--foreground-secondary)]">
                      {CLASSES.find((c) => c.id === character.class)?.name || "Not selected"}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-1">Background</h4>
                    <p className="text-[var(--foreground-secondary)]">
                      {BACKGROUNDS.find((b) => b.id === character.background)?.name || "Not selected"}
                    </p>
                  </div>
                </div>

                {/* Intimacy Summary */}
                <div>
                  <h4 className="text-sm font-medium mb-2">Intimacy Profile</h4>
                  <div className="space-y-1 text-sm text-[var(--foreground-secondary)]">
                    <p>Orientation: {character.intimacyProfile.orientation}</p>
                    <p>
                      Role:{" "}
                      {character.intimacyProfile.roleIdentity.power > 60
                        ? "Dominant-leaning"
                        : character.intimacyProfile.roleIdentity.power < 40
                          ? "Submissive-leaning"
                          : "Switch"}
                    </p>
                    <p>
                      Active kinks:{" "}
                      {Object.entries(character.intimacyProfile.kinks)
                        .filter(([_, v]) => v > 0)
                        .map(([k]) => k)
                        .slice(0, 5)
                        .join(", ") || "None selected"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Warning */}
            <Card className="bg-[var(--accent-gold)]/10 border-[var(--accent-gold)]/30">
              <CardContent className="py-4">
                <p className="text-sm">
                  <strong>Note:</strong> You can modify your character later, but some changes may
                  affect your campaign progress.
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
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-[var(--border)] bg-[var(--background-secondary)] p-4 lg:pl-60">
        <div className="mx-auto max-w-4xl flex gap-4">
          <Button
            variant="outline"
            onClick={goPrev}
            disabled={currentStepIndex === 0}
            className="flex-1"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          {currentStep === "review" ? (
            <Button onClick={handleCreate} disabled={isCreating} className="flex-1">
              {isCreating ? "Creating..." : "Create Character"}
            </Button>
          ) : (
            <Button onClick={goNext} className="flex-1">
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
