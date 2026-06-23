import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SignUpView } from "./sign-up-view";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock auth-client
const mockSignUpEmail = vi.fn();
const mockSignInSocial = vi.fn();

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    signUp: {
      email: mockSignUpEmail,
    },
    signIn: {
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

describe("SignUpView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the sign-up form with all required fields", () => {
    render(<SignUpView />);
    expect(screen.getByPlaceholderText("John Doe")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("m@example.com")).toBeInTheDocument();
    // Two password fields exist
    const passwordFields = screen.getAllByPlaceholderText("*******");
    expect(passwordFields).toHaveLength(2);
  });

  it("renders the 'Let's get started' heading", () => {
    render(<SignUpView />);
    expect(screen.getByText("Let's get started")).toBeInTheDocument();
    expect(screen.getByText("Create your account")).toBeInTheDocument();
  });

  it("renders social login buttons with icons", () => {
    render(<SignUpView />);
    expect(screen.getByTestId("google-icon")).toBeInTheDocument();
    expect(screen.getByTestId("github-icon")).toBeInTheDocument();
  });

  it("renders a link to sign-in page", () => {
    render(<SignUpView />);
    const signInLink = screen.getByRole("link", { name: /sign in/i });
    expect(signInLink).toBeInTheDocument();
    expect(signInLink).toHaveAttribute("href", "/sign-in");
  });

  it("does not submit when form fields are empty", async () => {
    render(<SignUpView />);
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
    await waitFor(() => {
      expect(mockSignUpEmail).not.toHaveBeenCalled();
    });
  });

  it("does not submit with invalid email format", async () => {
    render(<SignUpView />);
    await userEvent.type(screen.getByPlaceholderText("John Doe"), "John");
    await userEvent.type(screen.getByPlaceholderText("m@example.com"), "not-valid-email");
    const passwordFields = screen.getAllByPlaceholderText("*******");
    await userEvent.type(passwordFields[0], "password123");
    await userEvent.type(passwordFields[1], "password123");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
    await waitFor(() => {
      expect(mockSignUpEmail).not.toHaveBeenCalled();
    });
  });

  it("shows validation error when passwords do not match", async () => {
    render(<SignUpView />);
    await userEvent.type(screen.getByPlaceholderText("John Doe"), "John Doe");
    await userEvent.type(screen.getByPlaceholderText("m@example.com"), "john@example.com");
    const passwordFields = screen.getAllByPlaceholderText("*******");
    await userEvent.type(passwordFields[0], "password123");
    await userEvent.type(passwordFields[1], "differentpassword");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
    await waitFor(() => {
      expect(screen.getByText("Password don't match")).toBeInTheDocument();
    });
    expect(mockSignUpEmail).not.toHaveBeenCalled();
  });

  it("calls authClient.signUp.email with correct data on valid submission", async () => {
    mockSignUpEmail.mockImplementation((_data: unknown, callbacks: { onSuccess: () => void }) => {
      callbacks.onSuccess();
    });

    render(<SignUpView />);
    await userEvent.type(screen.getByPlaceholderText("John Doe"), "John Doe");
    await userEvent.type(screen.getByPlaceholderText("m@example.com"), "john@example.com");
    const passwordFields = screen.getAllByPlaceholderText("*******");
    await userEvent.type(passwordFields[0], "password123");
    await userEvent.type(passwordFields[1], "password123");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(mockSignUpEmail).toHaveBeenCalledWith(
        {
          name: "John Doe",
          email: "john@example.com",
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

  it("navigates to '/' on successful sign-up", async () => {
    mockSignUpEmail.mockImplementation((_data: unknown, callbacks: { onSuccess: () => void }) => {
      callbacks.onSuccess();
    });

    render(<SignUpView />);
    await userEvent.type(screen.getByPlaceholderText("John Doe"), "John Doe");
    await userEvent.type(screen.getByPlaceholderText("m@example.com"), "john@example.com");
    const passwordFields = screen.getAllByPlaceholderText("*******");
    await userEvent.type(passwordFields[0], "password123");
    await userEvent.type(passwordFields[1], "password123");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/");
    });
  });

  it("displays error message on failed sign-up", async () => {
    mockSignUpEmail.mockImplementation((_data: unknown, callbacks: { onError: (ctx: { error: { message: string } }) => void }) => {
      callbacks.onError({ error: { message: "Email already in use" } });
    });

    render(<SignUpView />);
    await userEvent.type(screen.getByPlaceholderText("John Doe"), "John Doe");
    await userEvent.type(screen.getByPlaceholderText("m@example.com"), "existing@example.com");
    const passwordFields = screen.getAllByPlaceholderText("*******");
    await userEvent.type(passwordFields[0], "password123");
    await userEvent.type(passwordFields[1], "password123");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText("Email already in use")).toBeInTheDocument();
    });
  });

  it("calls authClient.signIn.social with 'google' when Google button is clicked", async () => {
    render(<SignUpView />);
    const buttons = screen.getAllByRole("button");
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
    render(<SignUpView />);
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

  it("disables all buttons when pending", async () => {
    mockSignUpEmail.mockImplementation(() => {
      // do nothing - keep pending state
    });

    render(<SignUpView />);
    await userEvent.type(screen.getByPlaceholderText("John Doe"), "John Doe");
    await userEvent.type(screen.getByPlaceholderText("m@example.com"), "john@example.com");
    const passwordFields = screen.getAllByPlaceholderText("*******");
    await userEvent.type(passwordFields[0], "password123");
    await userEvent.type(passwordFields[1], "password123");

    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(mockSignUpEmail).toHaveBeenCalled();
    });

    const allButtons = screen.getAllByRole("button");
    allButtons.forEach((btn) => {
      expect(btn).toBeDisabled();
    });
  });

  it("displays error from social sign-in failure on sign-up page", async () => {
    mockSignInSocial.mockImplementation((_data: unknown, callbacks: { onError: (ctx: { error: { message: string } }) => void }) => {
      callbacks.onError({ error: { message: "Social auth failed" } });
    });

    render(<SignUpView />);
    const buttons = screen.getAllByRole("button");
    const githubButton = buttons.find((btn) => btn.querySelector('[data-testid="github-icon"]'));
    await userEvent.click(githubButton!);

    await waitFor(() => {
      expect(screen.getByText("Social auth failed")).toBeInTheDocument();
    });
  });

  it("clears previous error before new sign-up attempt", async () => {
    mockSignUpEmail.mockImplementationOnce((_data: unknown, callbacks: { onError: (ctx: { error: { message: string } }) => void }) => {
      callbacks.onError({ error: { message: "Server error" } });
    });
    mockSignUpEmail.mockImplementationOnce((_data: unknown, callbacks: { onSuccess: () => void }) => {
      callbacks.onSuccess();
    });

    render(<SignUpView />);
    await userEvent.type(screen.getByPlaceholderText("John Doe"), "John Doe");
    await userEvent.type(screen.getByPlaceholderText("m@example.com"), "john@example.com");
    const passwordFields = screen.getAllByPlaceholderText("*******");
    await userEvent.type(passwordFields[0], "password123");
    await userEvent.type(passwordFields[1], "password123");

    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
    await waitFor(() => {
      expect(screen.getByText("Server error")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
    await waitFor(() => {
      expect(screen.queryByText("Server error")).not.toBeInTheDocument();
    });
  });

  it("includes callbackURL '/' in sign-up email call", async () => {
    mockSignUpEmail.mockImplementation((_data: unknown, callbacks: { onSuccess: () => void }) => {
      callbacks.onSuccess();
    });

    render(<SignUpView />);
    await userEvent.type(screen.getByPlaceholderText("John Doe"), "Alice");
    await userEvent.type(screen.getByPlaceholderText("m@example.com"), "alice@example.com");
    const passwordFields = screen.getAllByPlaceholderText("*******");
    await userEvent.type(passwordFields[0], "securePass1");
    await userEvent.type(passwordFields[1], "securePass1");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(mockSignUpEmail).toHaveBeenCalledWith(
        expect.objectContaining({ callbackURL: "/" }),
        expect.any(Object)
      );
    });
  });
});