// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * Colocated Vitest coverage for computePathwayProgress (PATH-04, D-01/D-02/D-04).
 *
 * Relative imports (../schemas/progress, ./pathway-progress) are used
 * deliberately: vitest.config.ts has no "#/" alias resolver, so the app-build
 * alias would fail to resolve here (09-PATTERNS.md §#-path-alias caveat).
 */

import { describe, expect, it } from "vitest";
import type { MasteryState } from "../schemas/progress";
import { computePathwayProgress } from "./pathway-progress";

// Representative 8-step id array mirroring the beginner-fundamentals pathway shape.
const STEPS: readonly string[] = [
  "supply-management",
  "map-control",
  "scouting",
  "hotkey-discipline",
  "hero-leveling",
  "creep-routing",
  "resource-banking",
  "army-positioning",
];

const allMastered = (): Record<string, MasteryState> =>
  Object.fromEntries(STEPS.map((id) => [id, "mastered" as MasteryState]));

describe("computePathwayProgress", () => {
  it("empty mastery map: masteredCount 0, total = steps.length, nextStepId = first step", () => {
    const result = computePathwayProgress(STEPS, {});

    expect(result.masteredCount).toBe(0);
    expect(result.total).toBe(STEPS.length);
    expect(result.nextStepId).toBe("supply-management");
  });

  it("all steps mastered: masteredCount = total, nextStepId = null", () => {
    const result = computePathwayProgress(STEPS, allMastered());

    expect(result.masteredCount).toBe(STEPS.length);
    expect(result.total).toBe(STEPS.length);
    expect(result.nextStepId).toBeNull();
  });

  it("only 'mastered' entries increment the count; 'in-progress' and 'untouched' do not (D-02)", () => {
    const masteryMap: Record<string, MasteryState> = {
      "supply-management": "mastered",
      "map-control": "in-progress",
      scouting: "untouched",
      "hotkey-discipline": "mastered",
    };

    const result = computePathwayProgress(STEPS, masteryMap);

    // Only the two "mastered" entries count; in-progress + untouched ignored.
    expect(result.masteredCount).toBe(2);
    expect(result.total).toBe(STEPS.length);
  });

  it("nextStepId is the FIRST non-mastered step in order, even when a later step is mastered (D-04)", () => {
    // supply-management NOT mastered, but a mid-order step (scouting) IS mastered.
    // nextStepId must be the earlier unmastered id, proving order-correct selection.
    const masteryMap: Record<string, MasteryState> = {
      scouting: "mastered",
      "hero-leveling": "mastered",
    };

    const result = computePathwayProgress(STEPS, masteryMap);

    expect(result.nextStepId).toBe("supply-management");
    expect(result.masteredCount).toBe(2);
  });

  it("nextStepId skips a mastered prefix and returns the first later gap", () => {
    const masteryMap: Record<string, MasteryState> = {
      "supply-management": "mastered",
      "map-control": "mastered",
      scouting: "in-progress",
    };

    const result = computePathwayProgress(STEPS, masteryMap);

    // First two mastered, third is in-progress → next is scouting.
    expect(result.nextStepId).toBe("scouting");
    expect(result.masteredCount).toBe(2);
  });

  it("total always equals steps.length regardless of mastery", () => {
    expect(computePathwayProgress(STEPS, {}).total).toBe(STEPS.length);
    expect(computePathwayProgress(STEPS, allMastered()).total).toBe(STEPS.length);
    expect(computePathwayProgress([], {}).total).toBe(0);
  });

  it("empty steps: masteredCount 0, total 0, nextStepId null", () => {
    const result = computePathwayProgress([], {});

    expect(result.masteredCount).toBe(0);
    expect(result.total).toBe(0);
    expect(result.nextStepId).toBeNull();
  });
});
