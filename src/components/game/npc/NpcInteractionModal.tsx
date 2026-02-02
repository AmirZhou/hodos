"use client";

import { useState } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, MessageSquare, ShoppingBag, Info, Send, Loader2, GraduationCap } from "lucide-react";
import { TrainingPanel } from "../skills/TrainingDialog";

type Tab = "talk" | "trade" | "info" | "train";

export function NpcInteractionModal({
  npcId,
  characterId,
  campaignId,
  onClose,
}: {
  npcId: Id<"npcs">;
  characterId: Id<"characters">;
  campaignId: Id<"campaigns">;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<Tab>("talk");
  const [input, setInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const npc = useQuery(api.npcs.get, { npcId });
  const relationship = useQuery(api.relationships.get, { characterId, npcId });
  const submitAction = useAction(api.game.actions.submitAction);

  if (!npc) return null;

  const handleTalk = async (text: string) => {
    if (!text.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await submitAction({
        campaignId,
        characterId,
        input: `[To ${npc.name}] ${text.trim()}`,
      });
      setInput("");
    } catch (error) {
      console.error("Failed to send:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const quickDialogues = [
    { en: "Greet them", fr: "Les saluer" },
    { en: "Ask what they know", fr: "Demander ce qu'ils savent" },
    { en: "Ask about nearby places", fr: "Demander les lieux proches" },
    { en: "Flirt", fr: "Flirter" },
  ];

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "talk", label: "Talk", icon: <MessageSquare className="h-4 w-4" /> },
    { id: "trade", label: "Trade", icon: <ShoppingBag className="h-4 w-4" /> },
    { id: "info", label: "Info", icon: <Info className="h-4 w-4" /> },
    { id: "train", label: "Train", icon: <GraduationCap className="h-4 w-4" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-[var(--background)] border border-[var(--border)] rounded-xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)] bg-[var(--background-secondary)]">
          <div>
            <h2 className="font-bold text-lg">{npc.name}</h2>
            <p className="text-xs text-[var(--foreground-secondary)]">{npc.description}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--border)]">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "text-[var(--accent-gold)] border-b-2 border-[var(--accent-gold)]"
                  : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-4 min-h-[250px] max-h-[400px] overflow-y-auto">
          {activeTab === "talk" && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {quickDialogues.map((d) => (
                  <button
                    key={d.en}
                    onClick={() => handleTalk(d.en)}
                    disabled={isSubmitting}
                    className="px-3 py-1.5 rounded-full border border-[var(--border)] bg-[var(--card)] hover:border-[var(--accent-gold)] hover:bg-[var(--accent-gold)]/10 transition-colors text-sm disabled:opacity-50"
                  >
                    {d.en}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder={`Say something to ${npc.name}...`}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={isSubmitting}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && input.trim() && !isSubmitting) {
                      handleTalk(input);
                    }
                  }}
                />
                <Button
                  disabled={!input.trim() || isSubmitting}
                  onClick={() => handleTalk(input)}
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          )}

          {activeTab === "trade" && (
            <div className="text-center py-8 text-[var(--foreground-muted)]">
              <ShoppingBag className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Trading is not yet available.</p>
              <p className="text-xs mt-1">NPC shops coming soon.</p>
            </div>
          )}

          {activeTab === "info" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-1">Personality</h3>
                <p className="text-sm text-[var(--foreground-secondary)]">
                  {npc.personality || "Unknown"}
                </p>
              </div>

              {relationship && (
                <div>
                  <h3 className="text-sm font-medium mb-2">Relationship</h3>
                  <div className="space-y-2">
                    <RelBar label="Affinity" value={relationship.affinity} min={-100} max={100} color="var(--accent-gold)" />
                    <RelBar label="Trust" value={relationship.trust} min={0} max={100} color="var(--accent-blue)" />
                    <RelBar label="Attraction" value={relationship.attraction} min={0} max={100} color="var(--accent-red)" />
                    <RelBar label="Fear" value={relationship.fear ?? relationship.tension ?? 0} min={0} max={100} color="var(--accent-purple)" />
                    <RelBar label="Intimacy" value={relationship.intimacy} min={0} max={100} color="var(--accent-green)" />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RelBar({
  label,
  value,
  min,
  max,
  color,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  color: string;
}) {
  const range = max - min;
  const pct = ((value - min) / range) * 100;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-16 text-[var(--foreground-secondary)]">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-[var(--background-tertiary)]">
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="w-8 text-right">{value}</span>
    </div>
  );
}
