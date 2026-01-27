import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Mock Convex
const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();
const mockRecordReview = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: () => mockRecordReview,
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
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

import ReviewPage from "./page";

describe("ReviewPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRecordReview.mockResolvedValue(undefined);
  });

  it("shows loading state initially", () => {
    mockUseQuery.mockReturnValue(undefined);

    render(<ReviewPage />);

    expect(screen.getByText(/loading review session/i)).toBeInTheDocument();
  });

  it("shows empty state when no items due", () => {
    mockUseQuery.mockReturnValue([]);

    render(<ReviewPage />);

    expect(screen.getByText(/all caught up/i)).toBeInTheDocument();
    expect(screen.getByText(/no items due for review/i)).toBeInTheDocument();
  });

  it("displays first entry for review", () => {
    const mockEntries = [
      {
        _id: "entry-1",
        frenchText: "Bonjour le monde",
        englishText: "Hello world",
        grammarNotes: ["Greeting expression"],
        vocabularyItems: [
          { word: "bonjour", translation: "hello", partOfSpeech: "interjection" },
        ],
        usageNote: "Common greeting",
        sceneSummary: "Meeting scene",
      },
    ];

    mockUseQuery.mockReturnValue(mockEntries);

    render(<ReviewPage />);

    expect(screen.getByText("Bonjour le monde")).toBeInTheDocument();
    expect(screen.getByText(/1 of 1/)).toBeInTheDocument();
  });

  it("shows answer when Show Answer is clicked", () => {
    const mockEntries = [
      {
        _id: "entry-1",
        frenchText: "Bonjour le monde",
        englishText: "Hello world",
        grammarNotes: [],
        vocabularyItems: [],
        usageNote: "",
        sceneSummary: "",
      },
    ];

    mockUseQuery.mockReturnValue(mockEntries);

    render(<ReviewPage />);

    // Initially answer is hidden
    expect(screen.queryByText("Hello world")).not.toBeInTheDocument();

    // Click show answer
    fireEvent.click(screen.getByText(/show answer/i));

    // Now answer should be visible
    expect(screen.getByText("Hello world")).toBeInTheDocument();
  });

  it("calls recordReview mutation when rating is selected", async () => {
    const mockEntries = [
      {
        _id: "entry-1",
        frenchText: "Test",
        englishText: "Test translation",
        grammarNotes: [],
        vocabularyItems: [],
        usageNote: "",
        sceneSummary: "",
      },
    ];

    mockUseQuery.mockReturnValue(mockEntries);

    render(<ReviewPage />);

    // Show answer first
    fireEvent.click(screen.getByText(/show answer/i));

    // Rate as easy
    fireEvent.click(screen.getByText("Easy"));

    await waitFor(() => {
      expect(mockRecordReview).toHaveBeenCalledWith({
        entryId: "entry-1",
        rating: "easy",
      });
    });
  });

  it("shows completion screen after reviewing all items", async () => {
    const mockEntries = [
      {
        _id: "entry-1",
        frenchText: "Test",
        englishText: "Test translation",
        grammarNotes: [],
        vocabularyItems: [],
        usageNote: "",
        sceneSummary: "",
      },
    ];

    mockUseQuery.mockReturnValue(mockEntries);

    render(<ReviewPage />);

    // Show answer and rate
    fireEvent.click(screen.getByText(/show answer/i));
    fireEvent.click(screen.getByText("Easy"));

    // Should show completion screen
    await waitFor(() => {
      expect(screen.getByText(/review complete/i)).toBeInTheDocument();
      expect(screen.getByText(/you reviewed 1 item/i)).toBeInTheDocument();
    });
  });

  it("shows correct count for multiple items", () => {
    const mockEntries = [
      {
        _id: "entry-1",
        frenchText: "First",
        englishText: "First translation",
        grammarNotes: [],
        vocabularyItems: [],
        usageNote: "",
        sceneSummary: "",
      },
      {
        _id: "entry-2",
        frenchText: "Second",
        englishText: "Second translation",
        grammarNotes: [],
        vocabularyItems: [],
        usageNote: "",
        sceneSummary: "",
      },
    ];

    mockUseQuery.mockReturnValue(mockEntries);

    render(<ReviewPage />);

    expect(screen.getByText(/2 items due/)).toBeInTheDocument();
    expect(screen.getByText(/1 of 2/)).toBeInTheDocument();
  });

  it("advances to next entry after rating", async () => {
    const mockEntries = [
      {
        _id: "entry-1",
        frenchText: "First phrase",
        englishText: "First translation",
        grammarNotes: [],
        vocabularyItems: [],
        usageNote: "",
        sceneSummary: "",
      },
      {
        _id: "entry-2",
        frenchText: "Second phrase",
        englishText: "Second translation",
        grammarNotes: [],
        vocabularyItems: [],
        usageNote: "",
        sceneSummary: "",
      },
    ];

    mockUseQuery.mockReturnValue(mockEntries);

    render(<ReviewPage />);

    // Should show first entry
    expect(screen.getByText("First phrase")).toBeInTheDocument();

    // Rate the first entry
    fireEvent.click(screen.getByText(/show answer/i));
    fireEvent.click(screen.getByText("Medium"));

    // Should advance to second entry
    await waitFor(() => {
      expect(screen.getByText("Second phrase")).toBeInTheDocument();
      expect(screen.getByText(/2 of 2/)).toBeInTheDocument();
    });
  });

  it("has back to notebook link", () => {
    mockUseQuery.mockReturnValue([]);

    render(<ReviewPage />);

    const backLink = screen.getByRole("link", { name: /back to notebook/i });
    expect(backLink).toHaveAttribute("href", "/notebook");
  });
});
