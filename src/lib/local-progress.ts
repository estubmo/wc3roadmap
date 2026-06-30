// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * SSR-safe localStorage progress store for signed-out users (PROG-03, D-07, D-08).
 *
 * This module is the signed-out source of truth for mastery state. When a user
 * is not authenticated, all progress reads/writes go through this module rather
 * than the server. On first sign-in, the ProgressProvider merges this store
 * into the server-side record using a fill-gaps strategy (D-07), then clears
 * the local store.
 *
 * One-time merge flag (`wc3rm:merged`) tracks whether the first-sign-in merge
 * has already run for this browser. Without this flag, navigating away and back
 * during a session would trigger a second merge attempt (Pitfall 4 in RESEARCH.md).
 *
 * Client-only — NEVER import this module from server functions or route loaders.
 * Every exported function guards `typeof window === "undefined"` before touching
 * localStorage, so SSR bundles can safely import the type signatures (T-05-05c).
 *
 * Security note: localStorage is a client-trust boundary. Values here are
 * non-authoritative by design (D-08) — the server validates all states at merge
 * via MasteryStateSchema (T-05-05a). Malformed values degrade to empty map rather
 * than throwing, preventing client-side DoS from poisoned storage (T-05-05b).
 */

import type { MasteryState } from "#/schemas/progress";

/** localStorage key for the signed-out progress map (JSON-encoded Record). */
const PROGRESS_KEY = "wc3rm:progress";

/** localStorage key for the one-time merge flag (string "true" when set). */
const MERGED_FLAG = "wc3rm:merged";

// ---------------------------------------------------------------------------
// Progress store
// ---------------------------------------------------------------------------

/**
 * Read the current signed-out progress map from localStorage.
 *
 * Returns `{}` on SSR (no `window`), when the key is absent, or when the
 * stored JSON is malformed — never throws (T-05-05b).
 */
export function getLocalProgress(): Record<string, MasteryState> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(PROGRESS_KEY) ?? "{}";
    return JSON.parse(raw) as Record<string, MasteryState>;
  } catch {
    return {};
  }
}

/**
 * Write or update a single node's mastery state into the local progress map.
 *
 * Merges the new entry into the existing map — does not clear other nodes.
 * No-op on SSR.
 *
 * @param nodeId - The graph node ID whose state is being set.
 * @param state  - The new mastery state for this node.
 */
export function setLocalMastery(nodeId: string, state: MasteryState): void {
  if (typeof window === "undefined") return;
  const current = getLocalProgress();
  current[nodeId] = state;
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(current));
}

/**
 * Remove the entire signed-out progress map from localStorage.
 *
 * Called after the first-sign-in merge completes (D-07) to clear the
 * now-merged local state. No-op on SSR.
 */
export function clearLocalProgress(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PROGRESS_KEY);
}

// ---------------------------------------------------------------------------
// Merge flag
// ---------------------------------------------------------------------------

/**
 * Check whether the one-time first-sign-in merge has already run in this browser.
 *
 * Returns `false` on SSR. The merge flag prevents re-merging on subsequent
 * sign-in events within the same browser (Pitfall 4 in RESEARCH.md, D-07).
 */
export function isAlreadyMerged(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(MERGED_FLAG) === "true";
}

/**
 * Set the one-time merge flag so subsequent sign-in events skip the merge.
 *
 * Called by ProgressProvider immediately after a successful merge (D-07).
 * No-op on SSR.
 */
export function markMerged(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(MERGED_FLAG, "true");
}
