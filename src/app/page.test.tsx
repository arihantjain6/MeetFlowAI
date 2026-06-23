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

// Mock HomeView
vi.mock("@/modules/home/ui/views/home-view", () => ({
  HomeView: () => <div data-testid="home-view">HomeView</div>,
}));

import Page from "./page";
import { render, screen } from "@testing-library/react";

describe("Home Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHeadersFn.mockResolvedValue(new Headers());
  });

  it("redirects to '/sign-in' when no session exists (null)", async () => {
    mockGetSession.mockResolvedValue(null);

    await Page();

    expect(mockRedirect).toHaveBeenCalledWith("/sign-in");
  });

  it("redirects to '/sign-in' when session is undefined", async () => {
    mockGetSession.mockResolvedValue(undefined);

    await Page();

    expect(mockRedirect).toHaveBeenCalledWith("/sign-in");
  });

  it("does not redirect when a valid session exists", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "1", name: "Alice" } });

    const result = await Page();
    render(result as React.ReactElement);

    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("renders HomeView when session exists", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "1", name: "Alice" } });

    const result = await Page();
    render(result as React.ReactElement);

    expect(screen.getByTestId("home-view")).toBeInTheDocument();
  });

  it("calls auth.api.getSession with request headers", async () => {
    const fakeHeaders = new Headers({ authorization: "Bearer token123" });
    mockHeadersFn.mockResolvedValue(fakeHeaders);
    mockGetSession.mockResolvedValue({ user: { id: "1" } });

    const result = await Page();
    render(result as React.ReactElement);

    expect(mockGetSession).toHaveBeenCalledWith({
      headers: fakeHeaders,
    });
  });

  it("does not render HomeView when redirecting", async () => {
    mockGetSession.mockResolvedValue(null);

    await Page();

    expect(mockRedirect).toHaveBeenCalledWith("/sign-in");
    // After redirect, HomeView should never be rendered
    expect(screen.queryByTestId("home-view")).not.toBeInTheDocument();
  });

  it("redirects to '/sign-in' not '/' for unauthenticated users", async () => {
    mockGetSession.mockResolvedValue(null);

    await Page();

    expect(mockRedirect).not.toHaveBeenCalledWith("/");
    expect(mockRedirect).toHaveBeenCalledWith("/sign-in");
  });
});