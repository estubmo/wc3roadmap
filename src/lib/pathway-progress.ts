// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * Pathway progress derivation.
 *
 * Deep module: a single pure function with no side-effects, no framework
 * imports, and no dependency on content-collections or the file system. Takes
 * plain data in (ordered step ids + a Phase-5 masteryMap) and returns plain
 * data out, so it is fully unit-testable and can be called from both the
 * RoadmapGraph displayNodes memo (per-node stepIndex / isNextStep) and the
 * PathwayBanner (masteredCount / total) without either duplicating the rule.
 *
 * Single source of truth for two questions (PATH-04):
 *   - "How many pathway steps has this player mastered?" (D-01, D-02)
 *   - "Which step is next?" (D-04)
 *
 * D-02: only the `mastered` state counts toward completion — `in-progress` and
 * `untouched` are deliberately excluded (the progress bar reflects mastery, not
 * engagement). D-04: `nextStepId` is the first non-mastered step in the given
 * step order, so the "next node" cue always points at the earliest gap.
 *
 * Mirrors the pure-fn/plain-data/colocated-test convention of
 * scripts/validate-pathway.ts (validatePathwayStepIds).
 */

import type { MasteryState } from "#/schemas/progress";

/**
 * Derived pathway completion state.
 */
export interface PathwayProgress {
  /** Number of steps in `mastered` state (D-02: excludes in-progress/untouched). */
  masteredCount: number;
  /** Total number of steps in the pathway (always steps.length). */
  total: number;
  /** First non-mastered step in step order, or null when every step is mastered. */
  nextStepId: string | null;
}

/**
 * Compute masteredCount, total, and the next non-mastered step for a pathway.
 *
 * Iterates `steps` in order. A step counts toward `masteredCount` only when its
 * entry in `masteryMap` is exactly `"mastered"`; missing entries default to
 * `"untouched"` and never count (D-02). `nextStepId` records the first step in
 * order whose state is not `"mastered"` (D-04), and stays `null` when all steps
 * are mastered.
 *
 * @param steps - Ordered pathway step node ids.
 * @param masteryMap - Player's current mastery state keyed by node id (Phase 5).
 * @returns Plain PathwayProgress record; no mutation of inputs.
 */
export function computePathwayProgress(
  steps: readonly string[],
  masteryMap: Record<string, MasteryState>
): PathwayProgress {
  let masteredCount = 0;
  let nextStepId: string | null = null;

  for (const id of steps) {
    const state = masteryMap[id] ?? "untouched";
    if (state === "mastered") {
      masteredCount += 1;
    } else if (nextStepId === null) {
      nextStepId = id;
    }
  }

  return { masteredCount, total: steps.length, nextStepId };
}
