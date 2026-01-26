import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// Mock Convex
vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(() => vi.fn()),
}));

import { useQuery } from "convex/react";
import NotebookPage from "./page";

const mockUseQuery = useQuery as ReturnType<typeof vi.fn>;

describe("NotebookPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading state initially", () => {
    mockUseQuery.mockReturnValue(undefined);

    render(<NotebookPage />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("shows empty state when no entries", () => {
    mockUseQuery.mockImplementation((query) => {
      if (query?.toString().includes("getDueCount")) return 0;
      return [];
    });

    render(<NotebookPage />);

    expect(screen.getByText(/no saved sentences/i)).toBeInTheDocument();
  });

  it("displays notebook entries", () => {
    const mockEntries = [
      {
        _id: "1",
        frenchText: "La lumière vacille",
        englishText: "The light flickers",
        grammarNotes: ["Present tense"],
        vocabularyItems: [{ word: "lumière", translation: "light", partOfSpeech: "noun" }],
        usageNote: "Formal register",
        sceneSummary: "Stone Chamber",
        tags: ["vocabulary"],
        nextReviewDate: Date.now() + 86400000,
        createdAt: Date.now(),
      },
    ];

    mockUseQuery.mockImplementation((query) => {
      if (query?.toString().includes("getDueCount")) return 0;
      return mockEntries;
    });

    render(<NotebookPage />);

    expect(screen.getByText("La lumière vacille")).toBeInTheDocument();
    expect(screen.getByText("The light flickers")).toBeInTheDocument();
  });

  it("shows due count badge when items due for review", () => {
    mockUseQuery.mockImplementation((query) => {
      if (query?.toString().includes("getDueCount")) return 5;
      return [];
    });

    render(<NotebookPage />);

    expect(screen.getByText("5 due")).toBeInTheDocument();
  });

  it("filters entries by search term", () => {
    const mockEntries = [
      {
        _id: "1",
        frenchText: "La lumière vacille",
        englishText: "The light flickers",
        grammarNotes: [],
        vocabularyItems: [],
        usageNote: "",
        sceneSummary: "Chamber",
        tags: [],
        nextReviewDate: Date.now(),
        createdAt: Date.now(),
      },
      {
        _id: "2",
        frenchText: "Le soleil brille",
        englishText: "The sun shines",
        grammarNotes: [],
        vocabularyItems: [],
        usageNote: "",
        sceneSummary: "Garden",
        tags: [],
        nextReviewDate: Date.now(),
        createdAt: Date.now(),
      },
    ];

    mockUseQuery.mockImplementation((query) => {
      if (query?.toString().includes("getDueCount")) return 0;
      return mockEntries;
    });

    render(<NotebookPage />);

    const searchInput = screen.getByPlaceholderText(/search/i);
    fireEvent.change(searchInput, { target: { value: "lumière" } });

    expect(screen.getByText("La lumière vacille")).toBeInTheDocument();
    expect(screen.queryByText("Le soleil brille")).not.toBeInTheDocument();
  });

  it("shows Start Review button when entries exist", () => {
    const mockEntries = [
      {
        _id: "1",
        frenchText: "Test",
        englishText: "Test",
        grammarNotes: [],
        vocabularyItems: [],
        usageNote: "",
        sceneSummary: "",
        tags: [],
        nextReviewDate: Date.now() - 1000,
        createdAt: Date.now(),
      },
    ];

    mockUseQuery.mockImplementation((query) => {
      if (query?.toString().includes("getDueCount")) return 1;
      return mockEntries;
    });

    render(<NotebookPage />);

    expect(screen.getByRole("button", { name: /start review/i })).toBeInTheDocument();
  });
});
