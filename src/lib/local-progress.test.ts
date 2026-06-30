// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors
// @vitest-environment jsdom

/**
 * Tests for the SSR-safe local-progress localStorage store (PROG-03, D-08).
 *
 * Uses jsdom environment to simulate a browser localStorage surface.
 * Tests cover:
 *   - SSR guard (typeof window === "undefined" fast-path — simulated by module mock)
 *   - Malformed JSON graceful degradation
 *   - getLocalProgress / setLocalMastery / clearLocalProgress round-trip
 *   - isAlreadyMerged / markMerged merge-flag lifecycle
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// Constants for storage keys (mirrored from local-progress.ts for assertion clarity)
const PROGRESS_KEY = "wc3rm:progress";
const MERGED_FLAG = "wc3rm:merged";

// ---------------------------------------------------------------------------
// Setup — clear localStorage between tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Helpers — fresh import per test using doMock/resetModules (Pitfall: vi.mock TDZ)
// ---------------------------------------------------------------------------

async function freshModule() {
  vi.resetModules();
  return import("./local-progress");
}

// ---------------------------------------------------------------------------
// getLocalProgress
// ---------------------------------------------------------------------------

describe("getLocalProgress", () => {
  it("returns {} when localStorage is empty", async () => {
    const { getLocalProgress } = await freshModule();
    expect(getLocalProgress()).toEqual({});
  });

  it("returns {} when the stored JSON is malformed", async () => {
    localStorage.setItem(PROGRESS_KEY, "not-valid-json{{{");
    const { getLocalProgress } = await freshModule();
    expect(getLocalProgress()).toEqual({});
  });

  it("returns {} when the stored value is null (key missing)", async () => {
    // localStorage.getItem returns null when key does not exist
    const { getLocalProgress } = await freshModule();
    expect(getLocalProgress()).toEqual({});
  });

  it("returns the stored progress map when valid JSON is present", async () => {
    const stored = { "supply-management": "mastered", "map-control": "in-progress" };
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(stored));
    const { getLocalProgress } = await freshModule();
    expect(getLocalProgress()).toEqual(stored);
  });
});

// ---------------------------------------------------------------------------
// setLocalMastery
// ---------------------------------------------------------------------------

describe("setLocalMastery", () => {
  it("writes a single nodeId/state pair and getLocalProgress reflects it", async () => {
    const { setLocalMastery, getLocalProgress } = await freshModule();
    setLocalMastery("supply-management", "mastered");
    expect(getLocalProgress()).toEqual({ "supply-management": "mastered" });
  });

  it("merges into the existing map rather than overwriting", async () => {
    const { setLocalMastery, getLocalProgress } = await freshModule();
    setLocalMastery("supply-management", "mastered");
    setLocalMastery("map-control", "in-progress");
    expect(getLocalProgress()).toEqual({
      "supply-management": "mastered",
      "map-control": "in-progress",
    });
  });

  it("updates an existing entry", async () => {
    const { setLocalMastery, getLocalProgress } = await freshModule();
    setLocalMastery("supply-management", "in-progress");
    setLocalMastery("supply-management", "mastered");
    expect(getLocalProgress()).toEqual({ "supply-management": "mastered" });
  });
});

// ---------------------------------------------------------------------------
// clearLocalProgress
// ---------------------------------------------------------------------------

describe("clearLocalProgress", () => {
  it("removes the progress key so getLocalProgress returns {}", async () => {
    const { setLocalMastery, clearLocalProgress, getLocalProgress } = await freshModule();
    setLocalMastery("supply-management", "mastered");
    clearLocalProgress();
    expect(getLocalProgress()).toEqual({});
    expect(localStorage.getItem(PROGRESS_KEY)).toBeNull();
  });

  it("is a no-op when localStorage is already empty", async () => {
    const { clearLocalProgress, getLocalProgress } = await freshModule();
    clearLocalProgress();
    expect(getLocalProgress()).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// isAlreadyMerged / markMerged
// ---------------------------------------------------------------------------

describe("merge flag lifecycle", () => {
  it("isAlreadyMerged returns false before markMerged is called", async () => {
    const { isAlreadyMerged } = await freshModule();
    expect(isAlreadyMerged()).toBe(false);
  });

  it("isAlreadyMerged returns true after markMerged is called", async () => {
    const { markMerged, isAlreadyMerged } = await freshModule();
    markMerged();
    expect(isAlreadyMerged()).toBe(true);
  });

  it("markMerged sets MERGED_FLAG to 'true' in localStorage", async () => {
    const { markMerged } = await freshModule();
    markMerged();
    expect(localStorage.getItem(MERGED_FLAG)).toBe("true");
  });

  it("isAlreadyMerged returns false when MERGED_FLAG is absent", async () => {
    const { isAlreadyMerged } = await freshModule();
    localStorage.removeItem(MERGED_FLAG);
    expect(isAlreadyMerged()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// SSR guard simulation
// ---------------------------------------------------------------------------

describe("SSR guard (typeof window === 'undefined')", () => {
  it("getLocalProgress returns {} when window is undefined", async () => {
    // Temporarily remove window from the global scope
    const win = globalThis.window;
    // @ts-expect-error — intentionally removing window to simulate SSR
    delete globalThis.window;
    vi.resetModules();
    const { getLocalProgress } = await import("./local-progress");
    expect(getLocalProgress()).toEqual({});
    // Restore
    globalThis.window = win;
  });

  it("setLocalMastery is a no-op when window is undefined", async () => {
    const win = globalThis.window;
    // @ts-expect-error — intentionally removing window to simulate SSR
    delete globalThis.window;
    vi.resetModules();
    const { setLocalMastery } = await import("./local-progress");
    // Should not throw
    expect(() => setLocalMastery("supply-management", "mastered")).not.toThrow();
    globalThis.window = win;
  });

  it("clearLocalProgress is a no-op when window is undefined", async () => {
    const win = globalThis.window;
    // @ts-expect-error — intentionally removing window to simulate SSR
    delete globalThis.window;
    vi.resetModules();
    const { clearLocalProgress } = await import("./local-progress");
    expect(() => clearLocalProgress()).not.toThrow();
    globalThis.window = win;
  });

  it("isAlreadyMerged returns false when window is undefined", async () => {
    const win = globalThis.window;
    // @ts-expect-error — intentionally removing window to simulate SSR
    delete globalThis.window;
    vi.resetModules();
    const { isAlreadyMerged } = await import("./local-progress");
    expect(isAlreadyMerged()).toBe(false);
    globalThis.window = win;
  });

  it("markMerged is a no-op when window is undefined", async () => {
    const win = globalThis.window;
    // @ts-expect-error — intentionally removing window to simulate SSR
    delete globalThis.window;
    vi.resetModules();
    const { markMerged } = await import("./local-progress");
    expect(() => markMerged()).not.toThrow();
    globalThis.window = win;
  });
});
