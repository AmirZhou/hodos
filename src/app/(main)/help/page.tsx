"use client";

import { HelpCircle, Swords, BookOpen, Users, Heart } from "lucide-react";

export default function HelpPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-8">
        <HelpCircle className="h-8 w-8 text-[var(--accent-blue)]" />
        <h1 className="text-2xl font-bold">Help</h1>
      </div>

      <div className="space-y-6">
        <Section icon={Swords} title="Getting Started">
          <p>
            Create a campaign, build your character, and start playing. The AI
            Dungeon Master will guide you through an immersive tabletop RPG
            adventure with full D&amp;D 5e mechanics.
          </p>
        </Section>

        <Section icon={BookOpen} title="French Notebook">
          <p>
            During gameplay, French text appears alongside English translations.
            Save sentences to your notebook and review them with spaced
            repetition to build your vocabulary.
          </p>
        </Section>

        <Section icon={Heart} title="Relationships">
          <p>
            Build relationships with NPCs through your choices. Trust,
            attraction, and emotional dynamics evolve based on how you interact.
          </p>
        </Section>

        <Section icon={Users} title="Multiplayer">
          <p>
            Invite friends to join your campaign. All players share the same
            world state in real-time, taking turns in combat and scenes.
          </p>
        </Section>
      </div>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="h-5 w-5 text-[var(--accent-gold)]" />
        <h2 className="font-semibold">{title}</h2>
      </div>
      <div className="text-[var(--foreground-secondary)]">{children}</div>
    </div>
  );
}
