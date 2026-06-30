// @vitest-environment jsdom
// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * Component tests for QuizCTA (D-04, D-11, D-15).
 *
 * Proves:
 *   1. MECHANIC nodeType → renders nothing regardless of hasQuiz (D-04, criterion 1)
 *   2. CONCEPTUAL + hasQuiz=false → renders nothing (D-04, criterion 1)
 *   3. CONCEPTUAL + hasQuiz=true → button renders (D-04, criterion 1)
 *   4. mastered via quiz → label "Retake assessment" (D-11/D-15)
 *   5. any other state → label "Take Assessment" (D-11/D-15)
 *   6. Button click → calls onStart callback
 *
 * No external mocks needed — QuizCTA is a pure presentational component with no hooks.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react";
import React from "react";

import { QuizCTA } from "./QuizCTA";
import type { MasteryState } from "#/schemas/progress";

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

describe("QuizCTA", () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
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

  async function renderCTA(props: {
    nodeId?: string;
    nodeType: "MECHANIC" | "CONCEPTUAL";
    hasQuiz: boolean;
    currentState?: MasteryState;
    currentSource?: string;
    onStart?: () => void;
  }) {
    await act(async () => {
      root.render(
        React.createElement(QuizCTA, {
          nodeId: props.nodeId ?? "test-node",
          nodeType: props.nodeType,
          hasQuiz: props.hasQuiz,
          currentState: props.currentState ?? "untouched",
          currentSource: props.currentSource,
          onStart: props.onStart ?? vi.fn(),
        })
      );
    });
  }

  function getButton(): HTMLButtonElement | null {
    return container.querySelector<HTMLButtonElement>("button");
  }

  // ---------------------------------------------------------------------------
  // D-04 gating: MECHANIC → no CTA
  // ---------------------------------------------------------------------------

  it("renders nothing for MECHANIC nodeType even when hasQuiz is true", async () => {
    await renderCTA({ nodeType: "MECHANIC", hasQuiz: true });
    expect(getButton()).toBeNull();
    expect(container.textContent).toBe("");
  });

  it("renders nothing for MECHANIC nodeType when hasQuiz is false", async () => {
    await renderCTA({ nodeType: "MECHANIC", hasQuiz: false });
    expect(getButton()).toBeNull();
    expect(container.textContent).toBe("");
  });

  // ---------------------------------------------------------------------------
  // D-04 gating: CONCEPTUAL + no quiz → no CTA
  // ---------------------------------------------------------------------------

  it("renders nothing for CONCEPTUAL nodeType when hasQuiz is false", async () => {
    await renderCTA({ nodeType: "CONCEPTUAL", hasQuiz: false });
    expect(getButton()).toBeNull();
    expect(container.textContent).toBe("");
  });

  // ---------------------------------------------------------------------------
  // D-04 gating: CONCEPTUAL + quiz present → CTA renders
  // ---------------------------------------------------------------------------

  it("renders a button for CONCEPTUAL nodeType when hasQuiz is true", async () => {
    await renderCTA({ nodeType: "CONCEPTUAL", hasQuiz: true });
    expect(getButton()).not.toBeNull();
  });

  // ---------------------------------------------------------------------------
  // D-11/D-15: label logic
  // ---------------------------------------------------------------------------

  it("renders 'Take Assessment' when currentState is untouched", async () => {
    await renderCTA({
      nodeType: "CONCEPTUAL",
      hasQuiz: true,
      currentState: "untouched",
    });
    expect(getButton()?.textContent).toBe("Take Assessment");
  });

  it("renders 'Take Assessment' when currentState is in-progress", async () => {
    await renderCTA({
      nodeType: "CONCEPTUAL",
      hasQuiz: true,
      currentState: "in-progress",
    });
    expect(getButton()?.textContent).toBe("Take Assessment");
  });

  it("renders 'Take Assessment' when mastered but source is manual (not quiz)", async () => {
    await renderCTA({
      nodeType: "CONCEPTUAL",
      hasQuiz: true,
      currentState: "mastered",
      currentSource: "manual",
    });
    expect(getButton()?.textContent).toBe("Take Assessment");
  });

  it("renders 'Take Assessment' when mastered but source is undefined", async () => {
    await renderCTA({
      nodeType: "CONCEPTUAL",
      hasQuiz: true,
      currentState: "mastered",
      currentSource: undefined,
    });
    expect(getButton()?.textContent).toBe("Take Assessment");
  });

  it("renders 'Retake assessment' when mastered via quiz", async () => {
    await renderCTA({
      nodeType: "CONCEPTUAL",
      hasQuiz: true,
      currentState: "mastered",
      currentSource: "quiz",
    });
    expect(getButton()?.textContent).toBe("Retake assessment");
  });

  // ---------------------------------------------------------------------------
  // D-15: button available regardless of mastery state
  // ---------------------------------------------------------------------------

  it("renders the button when mastered (not quiz source)", async () => {
    await renderCTA({
      nodeType: "CONCEPTUAL",
      hasQuiz: true,
      currentState: "mastered",
      currentSource: "manual",
    });
    expect(getButton()).not.toBeNull();
  });

  it("renders the button when mastered via quiz (Retake label but still available)", async () => {
    await renderCTA({
      nodeType: "CONCEPTUAL",
      hasQuiz: true,
      currentState: "mastered",
      currentSource: "quiz",
    });
    expect(getButton()).not.toBeNull();
  });

  // ---------------------------------------------------------------------------
  // Click handler
  // ---------------------------------------------------------------------------

  it("calls onStart when the button is clicked", async () => {
    const onStart = vi.fn();
    await renderCTA({
      nodeType: "CONCEPTUAL",
      hasQuiz: true,
      onStart,
    });
    await act(async () => {
      getButton()?.click();
    });
    expect(onStart).toHaveBeenCalledOnce();
  });

  it("does not call onStart before button is clicked", async () => {
    const onStart = vi.fn();
    await renderCTA({
      nodeType: "CONCEPTUAL",
      hasQuiz: true,
      onStart,
    });
    expect(onStart).not.toHaveBeenCalled();
  });
});
