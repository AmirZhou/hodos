import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// Mock Convex
const mockUseQuery = vi.fn();
vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: vi.fn(() => vi.fn()),
}));

// Mock useAuth
const mockUserId = "test-user-id";
vi.mock("@/components/providers/auth-provider", () => ({
  useAuth: () => ({
    user: { _id: mockUserId },
    isLoading: false,
    isAuthenticated: true,
  }),
}));

import NotebookPage from "./page";

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
    // First call is getAll, second is getDueCount
    mockUseQuery
      .mockReturnValueOnce([]) // getAll
      .mockReturnValueOnce(0); // getDueCount

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

    mockUseQuery
      .mockReturnValueOnce(mockEntries) // getAll
      .mockReturnValueOnce(0); // getDueCount

    render(<NotebookPage />);

    expect(screen.getByText("La lumière vacille")).toBeInTheDocument();
    expect(screen.getByText("The light flickers")).toBeInTheDocument();
  });

  it("shows due count badge when items due for review", () => {
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

    mockUseQuery
      .mockReturnValueOnce(mockEntries) // getAll
      .mockReturnValueOnce(5); // getDueCount

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

    // Mock returns same data on every call
    mockUseQuery.mockImplementation(() => mockEntries);

    render(<NotebookPage />);

    // Both entries visible initially
    expect(screen.getByText("La lumière vacille")).toBeInTheDocument();
    expect(screen.getByText("Le soleil brille")).toBeInTheDocument();

    // Filter by search
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

    mockUseQuery
      .mockReturnValueOnce(mockEntries) // getAll
      .mockReturnValueOnce(1); // getDueCount

    render(<NotebookPage />);

    expect(screen.getByRole("link", { name: /start review/i })).toBeInTheDocument();
  });
});
