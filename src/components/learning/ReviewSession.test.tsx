import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ReviewSession } from "./ReviewSession";

describe("ReviewSession", () => {
  const mockEntries = [
    {
      _id: "1",
      frenchText: "La lumière vacille",
      englishText: "The light flickers",
      grammarNotes: ["Present tense"],
      vocabularyItems: [{ word: "lumière", translation: "light", partOfSpeech: "noun" }],
      usageNote: "Descriptive language",
      sceneSummary: "Stone Chamber",
    },
    {
      _id: "2",
      frenchText: "Bonjour, voyageur",
      englishText: "Hello, traveler",
      grammarNotes: [],
      vocabularyItems: [{ word: "voyageur", translation: "traveler", partOfSpeech: "noun" }],
      usageNote: "Common greeting",
      sceneSummary: "Market",
    },
  ];

  it("shows the first entry for review", () => {
    render(
      <ReviewSession
        entries={mockEntries}
        onRate={() => {}}
        onComplete={() => {}}
      />
    );

    expect(screen.getByText("La lumière vacille")).toBeInTheDocument();
  });

  it("hides English translation initially", () => {
    render(
      <ReviewSession
        entries={mockEntries}
        onRate={() => {}}
        onComplete={() => {}}
      />
    );

    // English should not be visible until revealed
    expect(screen.queryByText("The light flickers")).not.toBeInTheDocument();
  });

  it("shows English translation after clicking reveal", () => {
    render(
      <ReviewSession
        entries={mockEntries}
        onRate={() => {}}
        onComplete={() => {}}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /show answer/i }));

    expect(screen.getByText("The light flickers")).toBeInTheDocument();
  });

  it("shows rating buttons after revealing answer", () => {
    render(
      <ReviewSession
        entries={mockEntries}
        onRate={() => {}}
        onComplete={() => {}}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /show answer/i }));

    expect(screen.getByRole("button", { name: /wrong/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /hard/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /medium/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /easy/i })).toBeInTheDocument();
  });

  it("calls onRate when rating button clicked", () => {
    const onRate = vi.fn();

    render(
      <ReviewSession
        entries={mockEntries}
        onRate={onRate}
        onComplete={() => {}}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /show answer/i }));
    fireEvent.click(screen.getByRole("button", { name: /medium/i }));

    expect(onRate).toHaveBeenCalledWith("1", "medium");
  });

  it("advances to next entry after rating", () => {
    render(
      <ReviewSession
        entries={mockEntries}
        onRate={() => {}}
        onComplete={() => {}}
      />
    );

    // Rate first entry
    fireEvent.click(screen.getByRole("button", { name: /show answer/i }));
    fireEvent.click(screen.getByRole("button", { name: /medium/i }));

    // Should show second entry
    expect(screen.getByText("Bonjour, voyageur")).toBeInTheDocument();
  });

  it("calls onComplete when all entries reviewed", () => {
    const onComplete = vi.fn();

    render(
      <ReviewSession
        entries={[mockEntries[0]]}
        onRate={() => {}}
        onComplete={onComplete}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /show answer/i }));
    fireEvent.click(screen.getByRole("button", { name: /medium/i }));

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("shows progress indicator", () => {
    render(
      <ReviewSession
        entries={mockEntries}
        onRate={() => {}}
        onComplete={() => {}}
      />
    );

    expect(screen.getByText("1 of 2")).toBeInTheDocument();
  });

  it("shows empty state when no entries", () => {
    render(
      <ReviewSession
        entries={[]}
        onRate={() => {}}
        onComplete={() => {}}
      />
    );

    expect(screen.getByText(/no items/i)).toBeInTheDocument();
  });
});
