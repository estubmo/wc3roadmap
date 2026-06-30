// @vitest-environment jsdom
// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * Component tests for MasteryControls (PROG-04, PROG-05, D-01/D-02/D-10).
 *
 * Mocks:
 *   - `useProgressMutation` — asserts `.mutate` called with { nodeId, masteryState }
 *   - `useSession` — drives signed-in vs signed-out hint rendering
 *
 * Tests prove:
 *   1. Three ToggleGroup buttons render with correct labels
 *   2. currentState button is aria-pressed="true"
 *   3. Clicking a different button calls mutate({ nodeId, masteryState })
 *   4. Signed-out hint renders when session is null
 *   5. No gamification text (%, XP, streak, "of " count) is rendered
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react";
import React from "react";

// ---------------------------------------------------------------------------
// Mocks — registered BEFORE component import so they intercept the imports
// ---------------------------------------------------------------------------

vi.mock("#/hooks/useProgressMutation", () => ({
  useProgressMutation: vi.fn(),
}));

vi.mock("#/lib/auth-client", () => ({
  useSession: vi.fn(),
}));

import { useProgressMutation } from "#/hooks/useProgressMutation";
import { useSession } from "#/lib/auth-client";
import { MasteryControls } from "./MasteryControls";

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

describe("MasteryControls", () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;
  let mockMutate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockMutate = vi.fn();
    vi.mocked(useProgressMutation).mockReturnValue(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { mutate: mockMutate, isPending: false } as any
    );
    vi.mocked(useSession).mockReturnValue(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { data: null } as any
    );

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    document.body.removeChild(container);
  });

  // ---------------------------------------------------------------------------
  // Helper
  // ---------------------------------------------------------------------------

  async function renderControls(props: {
    nodeId: string;
    currentState: "untouched" | "in-progress" | "mastered";
  }) {
    await act(async () => {
      root.render(React.createElement(MasteryControls, props));
    });
  }

  function getButtons(): HTMLButtonElement[] {
    return Array.from(
      container.querySelectorAll<HTMLButtonElement>("button")
    );
  }

  // ---------------------------------------------------------------------------
  // Tests
  // ---------------------------------------------------------------------------

  it("renders three mastery state buttons with correct labels", async () => {
    await renderControls({ nodeId: "node-1", currentState: "untouched" });
    const buttons = getButtons();
    expect(buttons).toHaveLength(3);
    expect(buttons[0]?.textContent).toBe("Untouched");
    expect(buttons[1]?.textContent).toBe("In Progress");
    expect(buttons[2]?.textContent).toBe("Mastered");
  });

  it("marks the currentState button as aria-pressed true", async () => {
    await renderControls({ nodeId: "node-1", currentState: "in-progress" });
    const buttons = getButtons();
    const inProgressBtn = buttons.find((b) => b.textContent === "In Progress");
    expect(inProgressBtn).toBeDefined();
    expect(inProgressBtn?.getAttribute("aria-pressed")).toBe("true");
  });

  it("calls mutate with the new masteryState when a different button is clicked", async () => {
    await renderControls({ nodeId: "node-1", currentState: "untouched" });
    const buttons = getButtons();
    const masteredBtn = buttons.find((b) => b.textContent === "Mastered");
    expect(masteredBtn).toBeDefined();
    await act(async () => {
      masteredBtn?.click();
    });
    expect(mockMutate).toHaveBeenCalledWith({
      nodeId: "node-1",
      masteryState: "mastered",
    });
  });

  it("renders signed-out sync hint when session is null", async () => {
    vi.mocked(useSession).mockReturnValue({ data: null } as any); // eslint-disable-line @typescript-eslint/no-explicit-any
    await renderControls({ nodeId: "node-1", currentState: "untouched" });
    expect(container.textContent).toContain(
      "Sign in with Battle.net to save your progress across devices"
    );
  });

  it("does not render gamification text (%, XP, streak, count)", async () => {
    await renderControls({ nodeId: "node-1", currentState: "mastered" });
    const text = container.textContent ?? "";
    expect(text).not.toMatch(/%/);
    expect(text.toLowerCase()).not.toMatch(/\bxp\b/);
    expect(text.toLowerCase()).not.toMatch(/streak/);
    expect(text).not.toMatch(/\d+ of \d+/);
  });
});
