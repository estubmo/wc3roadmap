// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * Mock mastery source of truth — Phase 2 only.
 *
 * Phase 2 only — replaced by real persistence in Phase 5.
 *
 * Provides a static map of node IDs to mastery states for use during graph
 * development (canvas, pathway spotlight, mobile list). The map is intentionally
 * authored to exercise all three mastery states across the seed corpus, including
 * at least one mastered node that is a prerequisite of an in-progress node.
 *
 * Pattern mirrors patches.ts: private backing store, read-only public view,
 * typed accessor with graceful default for unknown IDs.
 */

import type { MasteryState } from "#/schemas/progress";

/**
 * Re-exported from the canonical source of truth for MasteryState.
 * src/schemas/progress.ts is the single source — do not define this type here.
 */
export type { MasteryState };

/**
 * Private backing store for the mock mastery map.
 * Keyed by seed node IDs from content/nodes/*.mdx.
 *
 * Distribution rationale:
 *   mastered   — map-control, supply-management, scouting, hotkey-discipline
 *                (four beginner roots; "mastered" prerequisites for in-progress nodes)
 *   in-progress — creep-routing, hero-leveling, army-positioning
 *                (intermediate step; their prereqs are mastered above)
 *   untouched  — resource-banking, micro-focus-fire, expansion-timing,
 *                tech-timing, harassment, base-defense
 *                (advanced or mid-stage nodes not yet reached)
 */
const _MOCK_MASTERY: Record<string, MasteryState> = {
  "map-control": "mastered",
  "supply-management": "mastered",
  scouting: "mastered",
  "hotkey-discipline": "mastered",
  "creep-routing": "in-progress",
  "hero-leveling": "in-progress",
  "army-positioning": "in-progress",
  "resource-banking": "untouched",
  "micro-focus-fire": "untouched",
  "expansion-timing": "untouched",
  "tech-timing": "untouched",
  harassment: "untouched",
  "base-defense": "untouched",
};

/** Read-only view of the mock mastery map for code that needs to iterate. */
export const MOCK_MASTERY: Readonly<Record<string, MasteryState>> = _MOCK_MASTERY;

/**
 * Look up the mastery state for a node by ID.
 * Returns "untouched" for unknown node IDs — graceful default so callers do
 * not need to guard against undefined when the corpus grows.
 *
 * @deprecated Phase 2 mock data — replaced by real persistence in Phase 5.
 * Retained for /preview/* dev routes and MobileNodeList only. Do not use in
 * new Phase 5+ code; use the progress store / server fn instead.
 */
export function getMockMastery(nodeId: string): MasteryState {
  return _MOCK_MASTERY[nodeId] ?? "untouched";
}
