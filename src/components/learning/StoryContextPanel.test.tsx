import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { StoryContextPanel } from "./StoryContextPanel";

describe("StoryContextPanel", () => {
  const mockContextLogs = [
    {
      _id: "log1",
      type: "narration" as const,
      contentEn: "The chamber is dark.",
      contentFr: "La chambre est sombre.",
      actorType: "dm" as const,
      createdAt: Date.now() - 3000,
    },
    {
      _id: "log2",
      type: "dialogue" as const,
      contentEn: "Hello, traveler.",
      contentFr: "Bonjour, voyageur.",
      actorType: "npc" as const,
      actorName: "Elara",
      createdAt: Date.now() - 2000,
    },
    {
      _id: "log3",
      type: "narration" as const,
      contentEn: "The light flickers.",
      contentFr: "La lumière vacille.",
      actorType: "dm" as const,
      createdAt: Date.now() - 1000,
    },
  ];

  it("renders context logs", () => {
    render(
      <StoryContextPanel
        contextLogs={mockContextLogs}
        highlightedLogId="log3"
        onClose={() => {}}
      />
    );

    expect(screen.getByText("The chamber is dark.")).toBeInTheDocument();
    expect(screen.getByText("Hello, traveler.")).toBeInTheDocument();
    expect(screen.getByText("The light flickers.")).toBeInTheDocument();
  });

  it("highlights the saved sentence", () => {
    render(
      <StoryContextPanel
        contextLogs={mockContextLogs}
        highlightedLogId="log3"
        onClose={() => {}}
      />
    );

    // The highlighted entry should have special styling
    const highlightedEntry = screen.getByText("The light flickers.").closest("div");
    expect(highlightedEntry?.className).toContain("ring");
  });

  it("shows French translations", () => {
    render(
      <StoryContextPanel
        contextLogs={mockContextLogs}
        highlightedLogId="log3"
        onClose={() => {}}
      />
    );

    expect(screen.getByText("La chambre est sombre.")).toBeInTheDocument();
    expect(screen.getByText("Bonjour, voyageur.")).toBeInTheDocument();
    expect(screen.getByText("La lumière vacille.")).toBeInTheDocument();
  });

  it("shows NPC names for dialogue", () => {
    render(
      <StoryContextPanel
        contextLogs={mockContextLogs}
        highlightedLogId="log3"
        onClose={() => {}}
      />
    );

    expect(screen.getByText("Elara")).toBeInTheDocument();
  });

  it("calls onClose when close button clicked", () => {
    const onClose = vi.fn();

    render(
      <StoryContextPanel
        contextLogs={mockContextLogs}
        highlightedLogId="log3"
        onClose={onClose}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /close/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("shows empty state when no logs", () => {
    render(
      <StoryContextPanel
        contextLogs={[]}
        highlightedLogId="log1"
        onClose={() => {}}
      />
    );

    expect(screen.getByText(/no context/i)).toBeInTheDocument();
  });

  it("shows title with scene summary if provided", () => {
    render(
      <StoryContextPanel
        contextLogs={mockContextLogs}
        highlightedLogId="log3"
        sceneSummary="Stone Chamber with Elara"
        onClose={() => {}}
      />
    );

    expect(screen.getByText(/stone chamber with elara/i)).toBeInTheDocument();
  });
});
