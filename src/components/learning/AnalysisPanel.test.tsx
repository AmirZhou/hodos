import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AnalysisPanel } from "./AnalysisPanel";

describe("AnalysisPanel", () => {
  const mockAnalysis = {
    grammar: ["Present tense of 'être'", "Feminine article 'la'"],
    vocabulary: [
      {
        word: "lumière",
        translation: "light",
        partOfSpeech: "noun",
        usage: "feminine noun (la lumière)",
      },
      {
        word: "vacille",
        translation: "flickers",
        partOfSpeech: "verb",
      },
    ],
    usageNotes: ["Formal literary register"],
  };

  it("renders collapsed by default", () => {
    render(<AnalysisPanel analysis={mockAnalysis} />);

    expect(screen.getByText("Show Analysis")).toBeInTheDocument();
    expect(screen.queryByText("GRAMMAR")).not.toBeInTheDocument();
  });

  it("expands when clicked", () => {
    render(<AnalysisPanel analysis={mockAnalysis} />);

    fireEvent.click(screen.getByText("Show Analysis"));

    expect(screen.getByText("GRAMMAR")).toBeInTheDocument();
    expect(screen.getByText("VOCABULARY")).toBeInTheDocument();
    expect(screen.getByText("USAGE NOTES")).toBeInTheDocument();
  });

  it("displays grammar notes", () => {
    render(<AnalysisPanel analysis={mockAnalysis} defaultExpanded />);

    expect(screen.getByText("Present tense of 'être'")).toBeInTheDocument();
    expect(screen.getByText("Feminine article 'la'")).toBeInTheDocument();
  });

  it("displays vocabulary items with part of speech", () => {
    render(<AnalysisPanel analysis={mockAnalysis} defaultExpanded />);

    expect(screen.getByText("lumière")).toBeInTheDocument();
    expect(screen.getByText("(noun)")).toBeInTheDocument();
    expect(screen.getByText("light")).toBeInTheDocument();
  });

  it("displays usage notes", () => {
    render(<AnalysisPanel analysis={mockAnalysis} defaultExpanded />);

    expect(screen.getByText("Formal literary register")).toBeInTheDocument();
  });

  it("shows Save to Notebook button when onSave is provided", () => {
    const onSave = vi.fn();
    render(
      <AnalysisPanel
        analysis={mockAnalysis}
        defaultExpanded
        onSave={onSave}
      />
    );

    expect(screen.getByText("Save to Notebook")).toBeInTheDocument();
  });

  it("calls onSave when Save button is clicked", () => {
    const onSave = vi.fn();
    render(
      <AnalysisPanel
        analysis={mockAnalysis}
        defaultExpanded
        onSave={onSave}
      />
    );

    fireEvent.click(screen.getByText("Save to Notebook"));

    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("hides Save button when onSave is not provided", () => {
    render(<AnalysisPanel analysis={mockAnalysis} defaultExpanded />);

    expect(screen.queryByText("Save to Notebook")).not.toBeInTheDocument();
  });

  it("returns null when analysis is undefined", () => {
    const { container } = render(<AnalysisPanel analysis={undefined} />);

    expect(container.firstChild).toBeNull();
  });

  it("handles empty arrays gracefully", () => {
    const emptyAnalysis = {
      grammar: [],
      vocabulary: [],
      usageNotes: [],
    };

    render(<AnalysisPanel analysis={emptyAnalysis} defaultExpanded />);

    // Should still render but without content
    expect(screen.getByText("Hide Analysis")).toBeInTheDocument();
  });

  it("collapses when clicked again", () => {
    render(<AnalysisPanel analysis={mockAnalysis} />);

    // Expand
    fireEvent.click(screen.getByText("Show Analysis"));
    expect(screen.getByText("Hide Analysis")).toBeInTheDocument();

    // Collapse
    fireEvent.click(screen.getByText("Hide Analysis"));
    expect(screen.getByText("Show Analysis")).toBeInTheDocument();
  });
});
