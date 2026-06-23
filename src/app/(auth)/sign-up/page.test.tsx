import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock next/navigation redirect
const mockRedirect = vi.fn();
vi.mock("next/navigation", () => ({
  redirect: mockRedirect,
}));

// Mock next/headers
const mockHeadersFn = vi.fn();
vi.mock("next/headers", () => ({
  headers: mockHeadersFn,
}));

// Mock auth
const mockGetSession = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: mockGetSession,
    },
  },
}));

// Mock SignUpView
vi.mock("@/modules/auth/ui/views/sign-up-view", () => ({
  SignUpView: () => <div data-testid="sign-up-view">SignUpView</div>,
}));

import Page from "./page";
import { render, screen } from "@testing-library/react";

describe("Sign Up Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHeadersFn.mockResolvedValue(new Headers());
  });

  it("redirects to '/' when session exists", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "1", name: "Alice" } });

    await Page();

    expect(mockRedirect).toHaveBeenCalledWith("/");
  });

  it("does not redirect when session is null", async () => {
    mockGetSession.mockResolvedValue(null);

    const result = await Page();
    render(result as React.ReactElement);

    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("renders SignUpView when no session exists", async () => {
    mockGetSession.mockResolvedValue(null);

    const result = await Page();
    render(result as React.ReactElement);

    expect(screen.getByTestId("sign-up-view")).toBeInTheDocument();
  });

  it("calls auth.api.getSession with request headers", async () => {
    const fakeHeaders = new Headers({ cookie: "session=xyz" });
    mockHeadersFn.mockResolvedValue(fakeHeaders);
    mockGetSession.mockResolvedValue(null);

    await Page();

    expect(mockGetSession).toHaveBeenCalledWith({
      headers: fakeHeaders,
    });
  });

  it("redirects for any truthy session value", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "42" } });

    await Page();

    expect(mockRedirect).toHaveBeenCalledWith("/");
  });

  it("does not redirect when session is undefined", async () => {
    mockGetSession.mockResolvedValue(undefined);

    const result = await Page();
    render(result as React.ReactElement);

    expect(mockRedirect).not.toHaveBeenCalled();
    expect(screen.getByTestId("sign-up-view")).toBeInTheDocument();
  });
});