import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SignInView } from "./sign-in-view";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock auth-client
const mockSignInEmail = vi.fn();
const mockSignInSocial = vi.fn();

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    signIn: {
      email: mockSignInEmail,
      social: mockSignInSocial,
    },
  },
}));

// Mock react-icons
vi.mock("react-icons/fa", () => ({
  FaGoogle: () => <svg data-testid="google-icon" />,
  FaGithub: () => <svg data-testid="github-icon" />,
}));

// Mock lucide-react
vi.mock("lucide-react", () => ({
  OctagonAlertIcon: () => <svg data-testid="alert-icon" />,
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

describe("SignInView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the sign-in form with email and password fields", () => {
    render(<SignInView />);
    expect(screen.getByPlaceholderText("m@example.com")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("*******")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("renders the welcome back heading", () => {
    render(<SignInView />);
    expect(screen.getByText("Welcome Back")).toBeInTheDocument();
    expect(screen.getByText("Login to your account")).toBeInTheDocument();
  });

  it("renders social login buttons with icons", () => {
    render(<SignInView />);
    expect(screen.getByTestId("google-icon")).toBeInTheDocument();
    expect(screen.getByTestId("github-icon")).toBeInTheDocument();
  });

  it("renders a link to sign-up page", () => {
    render(<SignInView />);
    const signUpLink = screen.getByRole("link", { name: /sign up/i });
    expect(signUpLink).toBeInTheDocument();
    expect(signUpLink).toHaveAttribute("href", "/sign-up");
  });

  it("shows validation error when form is submitted with empty fields", async () => {
    render(<SignInView />);
    const submitButton = screen.getByRole("button", { name: /sign in/i });
    await userEvent.click(submitButton);
    // authClient should not be called with invalid form
    await waitFor(() => {
      expect(mockSignInEmail).not.toHaveBeenCalled();
    });
  });

  it("shows validation error for invalid email format", async () => {
    render(<SignInView />);
    const emailInput = screen.getByPlaceholderText("m@example.com");
    const passwordInput = screen.getByPlaceholderText("*******");
    await userEvent.type(emailInput, "not-an-email");
    await userEvent.type(passwordInput, "password123");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
    await waitFor(() => {
      expect(mockSignInEmail).not.toHaveBeenCalled();
    });
  });

  it("calls authClient.signIn.email with correct data on valid submission", async () => {
    mockSignInEmail.mockImplementation((_data: unknown, callbacks: { onSuccess: () => void }) => {
      callbacks.onSuccess();
    });

    render(<SignInView />);
    const emailInput = screen.getByPlaceholderText("m@example.com");
    const passwordInput = screen.getByPlaceholderText("*******");

    await userEvent.type(emailInput, "test@example.com");
    await userEvent.type(passwordInput, "password123");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(mockSignInEmail).toHaveBeenCalledWith(
        {
          email: "test@example.com",
          password: "password123",
          callbackURL: "/",
        },
        expect.objectContaining({
          onSuccess: expect.any(Function),
          onError: expect.any(Function),
        })
      );
    });
  });

  it("navigates to '/' on successful email sign-in", async () => {
    mockSignInEmail.mockImplementation((_data: unknown, callbacks: { onSuccess: () => void }) => {
      callbacks.onSuccess();
    });

    render(<SignInView />);
    await userEvent.type(screen.getByPlaceholderText("m@example.com"), "test@example.com");
    await userEvent.type(screen.getByPlaceholderText("*******"), "password123");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/");
    });
  });

  it("displays error message on failed email sign-in", async () => {
    mockSignInEmail.mockImplementation((_data: unknown, callbacks: { onError: (ctx: { error: { message: string } }) => void }) => {
      callbacks.onError({ error: { message: "Invalid credentials" } });
    });

    render(<SignInView />);
    await userEvent.type(screen.getByPlaceholderText("m@example.com"), "test@example.com");
    await userEvent.type(screen.getByPlaceholderText("*******"), "wrongpassword");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText("Invalid credentials")).toBeInTheDocument();
    });
  });

  it("calls authClient.signIn.social with 'google' when Google button is clicked", async () => {
    render(<SignInView />);
    const buttons = screen.getAllByRole("button");
    // Google button contains the google icon
    const googleButton = buttons.find((btn) => btn.querySelector('[data-testid="google-icon"]'));
    expect(googleButton).toBeDefined();
    await userEvent.click(googleButton!);

    await waitFor(() => {
      expect(mockSignInSocial).toHaveBeenCalledWith(
        {
          provider: "google",
          callbackURL: "/",
        },
        expect.objectContaining({
          onSuccess: expect.any(Function),
          onError: expect.any(Function),
        })
      );
    });
  });

  it("calls authClient.signIn.social with 'github' when GitHub button is clicked", async () => {
    render(<SignInView />);
    const buttons = screen.getAllByRole("button");
    const githubButton = buttons.find((btn) => btn.querySelector('[data-testid="github-icon"]'));
    expect(githubButton).toBeDefined();
    await userEvent.click(githubButton!);

    await waitFor(() => {
      expect(mockSignInSocial).toHaveBeenCalledWith(
        {
          provider: "github",
          callbackURL: "/",
        },
        expect.objectContaining({
          onSuccess: expect.any(Function),
          onError: expect.any(Function),
        })
      );
    });
  });

  it("disables submit and social buttons when pending", async () => {
    // Keep the call pending (don't call callbacks)
    mockSignInEmail.mockImplementation(() => {
      // do nothing - keep pending state
    });

    render(<SignInView />);
    await userEvent.type(screen.getByPlaceholderText("m@example.com"), "test@example.com");
    await userEvent.type(screen.getByPlaceholderText("*******"), "password123");

    const submitButton = screen.getByRole("button", { name: /sign in/i });
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(mockSignInEmail).toHaveBeenCalled();
    });

    const allButtons = screen.getAllByRole("button");
    allButtons.forEach((btn) => {
      expect(btn).toBeDisabled();
    });
  });

  it("displays error message on failed social sign-in", async () => {
    mockSignInSocial.mockImplementation((_data: unknown, callbacks: { onError: (ctx: { error: { message: string } }) => void }) => {
      callbacks.onError({ error: { message: "OAuth error" } });
    });

    render(<SignInView />);
    const buttons = screen.getAllByRole("button");
    const googleButton = buttons.find((btn) => btn.querySelector('[data-testid="google-icon"]'));
    await userEvent.click(googleButton!);

    await waitFor(() => {
      expect(screen.getByText("OAuth error")).toBeInTheDocument();
    });
  });

  it("clears previous error before new sign-in attempt", async () => {
    // First call fails
    mockSignInEmail.mockImplementationOnce((_data: unknown, callbacks: { onError: (ctx: { error: { message: string } }) => void }) => {
      callbacks.onError({ error: { message: "First error" } });
    });
    // Second call succeeds
    mockSignInEmail.mockImplementationOnce((_data: unknown, callbacks: { onSuccess: () => void }) => {
      callbacks.onSuccess();
    });

    render(<SignInView />);
    await userEvent.type(screen.getByPlaceholderText("m@example.com"), "test@example.com");
    await userEvent.type(screen.getByPlaceholderText("*******"), "password123");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText("First error")).toBeInTheDocument();
    });

    // Second attempt should clear error
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.queryByText("First error")).not.toBeInTheDocument();
    });
  });
});