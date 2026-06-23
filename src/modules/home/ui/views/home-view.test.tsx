import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HomeView } from "./home-view";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock auth-client
const mockUseSession = vi.fn();
const mockSignOut = vi.fn();

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    useSession: mockUseSession,
    signOut: mockSignOut,
  },
}));

describe("HomeView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading state when session data is null", () => {
    mockUseSession.mockReturnValue({ data: null });
    render(<HomeView />);
    expect(screen.getByText("...Loading")).toBeInTheDocument();
  });

  it("renders loading state when session data is undefined", () => {
    mockUseSession.mockReturnValue({ data: undefined });
    render(<HomeView />);
    expect(screen.getByText("...Loading")).toBeInTheDocument();
  });

  it("renders the user's name when session exists", () => {
    mockUseSession.mockReturnValue({
      data: { user: { name: "Alice Smith" } },
    });
    render(<HomeView />);
    expect(screen.getByText("Logged in as Alice Smith")).toBeInTheDocument();
  });

  it("renders a Sign Out button when session exists", () => {
    mockUseSession.mockReturnValue({
      data: { user: { name: "Bob" } },
    });
    render(<HomeView />);
    expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument();
  });

  it("calls authClient.signOut when Sign Out button is clicked", async () => {
    mockSignOut.mockImplementation(() => {});
    mockUseSession.mockReturnValue({
      data: { user: { name: "Alice" } },
    });

    render(<HomeView />);
    await userEvent.click(screen.getByRole("button", { name: /sign out/i }));

    expect(mockSignOut).toHaveBeenCalledWith(
      expect.objectContaining({
        fetchOptions: expect.objectContaining({
          onSuccess: expect.any(Function),
        }),
      })
    );
  });

  it("navigates to '/sign-in' after successful sign out", async () => {
    mockSignOut.mockImplementation((options: { fetchOptions: { onSuccess: () => void } }) => {
      options.fetchOptions.onSuccess();
    });
    mockUseSession.mockReturnValue({
      data: { user: { name: "Alice" } },
    });

    render(<HomeView />);
    await userEvent.click(screen.getByRole("button", { name: /sign out/i }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/sign-in");
    });
  });

  it("does not render user info or sign out button when session is null", () => {
    mockUseSession.mockReturnValue({ data: null });
    render(<HomeView />);
    expect(screen.queryByRole("button", { name: /sign out/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/logged in as/i)).not.toBeInTheDocument();
  });

  it("renders correct user name from session", () => {
    mockUseSession.mockReturnValue({
      data: { user: { name: "Charlie Brown" } },
    });
    render(<HomeView />);
    expect(screen.getByText("Logged in as Charlie Brown")).toBeInTheDocument();
  });

  it("does not render loading message when session is present", () => {
    mockUseSession.mockReturnValue({
      data: { user: { name: "Dave" } },
    });
    render(<HomeView />);
    expect(screen.queryByText("...Loading")).not.toBeInTheDocument();
  });
});