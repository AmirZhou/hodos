import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("convex/react", () => ({
  useQuery: vi.fn(() => undefined),
  useMutation: vi.fn(() => vi.fn()),
}));

vi.mock("@/components/providers/auth-provider", () => ({
  useAuth: () => ({
    user: { _id: "test-user-id", email: "test@test.com", displayName: "Test" },
    isLoading: false,
    isAuthenticated: true,
  }),
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

import SettingsPage from "./page";

describe("SettingsPage", () => {
  it("renders settings heading", () => {
    render(<SettingsPage />);
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("shows user email", () => {
    render(<SettingsPage />);
    expect(screen.getByText("test@test.com")).toBeInTheDocument();
  });
});
