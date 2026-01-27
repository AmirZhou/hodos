import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/components/providers/auth-provider", () => ({
  useAuth: () => ({
    user: { _id: "test-user-id" },
    isLoading: false,
    isAuthenticated: true,
  }),
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

import HelpPage from "./page";

describe("HelpPage", () => {
  it("renders help heading", () => {
    render(<HelpPage />);
    expect(screen.getByText("Help")).toBeInTheDocument();
  });

  it("shows getting started section", () => {
    render(<HelpPage />);
    expect(screen.getByText("Getting Started")).toBeInTheDocument();
  });
});
