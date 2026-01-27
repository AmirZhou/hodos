import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock Convex
const mockUseQuery = vi.fn();
vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: vi.fn(() => vi.fn()),
}));

// Mock useAuth
vi.mock("@/components/providers/auth-provider", () => ({
  useAuth: () => ({
    user: { _id: "test-user-id" },
    isLoading: false,
    isAuthenticated: true,
  }),
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// Mock react's use() for params
vi.mock("react", async () => {
  const actual = await vi.importActual("react");
  return {
    ...actual,
    use: () => ({ id: "test-entry-id" }),
  };
});

import NotebookDetailPage from "./page";

describe("NotebookDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading state initially", () => {
    mockUseQuery.mockReturnValue(undefined);

    render(<NotebookDetailPage params={Promise.resolve({ id: "test-id" })} />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("shows not found state when entry is null", () => {
    mockUseQuery.mockReturnValue(null);

    render(<NotebookDetailPage params={Promise.resolve({ id: "test-id" })} />);

    expect(screen.getByText(/entry not found/i)).toBeInTheDocument();
  });

  it("displays entry content", () => {
    const mockEntry = {
      _id: "test-id",
      frenchText: "La lumière vacille dans la chambre",
      englishText: "The light flickers in the room",
      grammarNotes: ["Present tense of vaciller", "Definite article usage"],
      vocabularyItems: [
        { word: "lumière", translation: "light", partOfSpeech: "noun" },
        { word: "vacille", translation: "flickers", partOfSpeech: "verb" },
      ],
      usageNote: "Common expression for describing unstable light",
      sceneSummary: "Stone Chamber with Elara",
      tags: ["vocabulary", "present-tense"],
      userNotes: "",
      nextReviewDate: Date.now() + 86400000,
      createdAt: Date.now(),
    };

    mockUseQuery.mockReturnValue(mockEntry);

    render(<NotebookDetailPage params={Promise.resolve({ id: "test-id" })} />);

    // French text
    expect(screen.getByText("La lumière vacille dans la chambre")).toBeInTheDocument();

    // English text
    expect(screen.getByText("The light flickers in the room")).toBeInTheDocument();
  });

  it("displays grammar notes", () => {
    const mockEntry = {
      _id: "test-id",
      frenchText: "Test",
      englishText: "Test",
      grammarNotes: ["Present tense of vaciller", "Definite article usage"],
      vocabularyItems: [],
      usageNote: "",
      sceneSummary: "",
      tags: [],
      userNotes: "",
      nextReviewDate: Date.now() + 86400000,
      createdAt: Date.now(),
    };

    mockUseQuery.mockReturnValue(mockEntry);

    render(<NotebookDetailPage params={Promise.resolve({ id: "test-id" })} />);

    expect(screen.getByText("GRAMMAR")).toBeInTheDocument();
    expect(screen.getByText("Present tense of vaciller")).toBeInTheDocument();
    expect(screen.getByText("Definite article usage")).toBeInTheDocument();
  });

  it("displays vocabulary items", () => {
    const mockEntry = {
      _id: "test-id",
      frenchText: "Test",
      englishText: "Test",
      grammarNotes: [],
      vocabularyItems: [
        { word: "lumière", translation: "light", partOfSpeech: "noun" },
        { word: "vacille", translation: "flickers", partOfSpeech: "verb" },
      ],
      usageNote: "",
      sceneSummary: "",
      tags: [],
      userNotes: "",
      nextReviewDate: Date.now() + 86400000,
      createdAt: Date.now(),
    };

    mockUseQuery.mockReturnValue(mockEntry);

    render(<NotebookDetailPage params={Promise.resolve({ id: "test-id" })} />);

    expect(screen.getByText("VOCABULARY")).toBeInTheDocument();
    expect(screen.getByText("lumière")).toBeInTheDocument();
    expect(screen.getByText("(noun)")).toBeInTheDocument();
    expect(screen.getByText("light")).toBeInTheDocument();
  });

  it("displays usage notes", () => {
    const mockEntry = {
      _id: "test-id",
      frenchText: "Test",
      englishText: "Test",
      grammarNotes: [],
      vocabularyItems: [],
      usageNote: "Common expression for describing unstable light",
      sceneSummary: "",
      tags: [],
      userNotes: "",
      nextReviewDate: Date.now() + 86400000,
      createdAt: Date.now(),
    };

    mockUseQuery.mockReturnValue(mockEntry);

    render(<NotebookDetailPage params={Promise.resolve({ id: "test-id" })} />);

    expect(screen.getByText("USAGE NOTES")).toBeInTheDocument();
    expect(screen.getByText("Common expression for describing unstable light")).toBeInTheDocument();
  });

  it("shows due for review when past due date", () => {
    const mockEntry = {
      _id: "test-id",
      frenchText: "Test",
      englishText: "Test",
      grammarNotes: [],
      vocabularyItems: [],
      usageNote: "",
      sceneSummary: "",
      tags: [],
      userNotes: "",
      nextReviewDate: Date.now() - 1000, // Past due
      createdAt: Date.now(),
    };

    mockUseQuery.mockReturnValue(mockEntry);

    render(<NotebookDetailPage params={Promise.resolve({ id: "test-id" })} />);

    expect(screen.getByText("Due for review")).toBeInTheDocument();
  });

  it("shows story context when available", () => {
    const mockEntry = {
      _id: "test-id",
      frenchText: "Test",
      englishText: "Test",
      grammarNotes: [],
      vocabularyItems: [],
      usageNote: "",
      sceneSummary: "Stone Chamber with Elara and Kael",
      tags: [],
      userNotes: "",
      nextReviewDate: Date.now() + 86400000,
      createdAt: Date.now(),
    };

    mockUseQuery.mockReturnValue(mockEntry);

    render(<NotebookDetailPage params={Promise.resolve({ id: "test-id" })} />);

    expect(screen.getByText("STORY CONTEXT")).toBeInTheDocument();
    expect(screen.getByText("Stone Chamber with Elara and Kael")).toBeInTheDocument();
  });

  it("shows placeholder when no user notes", () => {
    const mockEntry = {
      _id: "test-id",
      frenchText: "Test",
      englishText: "Test",
      grammarNotes: [],
      vocabularyItems: [],
      usageNote: "",
      sceneSummary: "",
      tags: [],
      userNotes: "",
      nextReviewDate: Date.now() + 86400000,
      createdAt: Date.now(),
    };

    mockUseQuery.mockReturnValue(mockEntry);

    render(<NotebookDetailPage params={Promise.resolve({ id: "test-id" })} />);

    expect(screen.getByText(/no notes yet/i)).toBeInTheDocument();
  });
});
