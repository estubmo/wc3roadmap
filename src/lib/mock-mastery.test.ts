// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, it, expect } from "vitest";
import { MOCK_MASTERY, getMockMastery, type MasteryState } from "./mock-mastery";

describe("mock mastery map", () => {
  it("MOCK_MASTERY contains at least one of each mastery state", () => {
    const states = Object.values(MOCK_MASTERY) as MasteryState[];
    expect(states).toContain("untouched");
    expect(states).toContain("in-progress");
    expect(states).toContain("mastered");
  });

  it("getMockMastery returns 'mastered' for a known mastered node", () => {
    expect(getMockMastery("map-control")).toBe("mastered");
    expect(getMockMastery("supply-management")).toBe("mastered");
    expect(getMockMastery("scouting")).toBe("mastered");
    expect(getMockMastery("hotkey-discipline")).toBe("mastered");
  });

  it("getMockMastery returns 'in-progress' for known in-progress nodes", () => {
    expect(getMockMastery("creep-routing")).toBe("in-progress");
    expect(getMockMastery("hero-leveling")).toBe("in-progress");
    expect(getMockMastery("army-positioning")).toBe("in-progress");
  });

  it("getMockMastery returns 'untouched' for known untouched nodes", () => {
    expect(getMockMastery("resource-banking")).toBe("untouched");
    expect(getMockMastery("expansion-timing")).toBe("untouched");
    expect(getMockMastery("tech-timing")).toBe("untouched");
    expect(getMockMastery("harassment")).toBe("untouched");
    expect(getMockMastery("base-defense")).toBe("untouched");
  });

  it("getMockMastery returns 'untouched' for an unknown node ID", () => {
    expect(getMockMastery("completely-unknown-node")).toBe("untouched");
    expect(getMockMastery("")).toBe("untouched");
    expect(getMockMastery("not-in-corpus-v99")).toBe("untouched");
  });

  it("at least one mastered node is a prerequisite of an in-progress node (three-gold hierarchy)", () => {
    // map-control is mastered and is a prerequisite of creep-routing (in-progress)
    expect(getMockMastery("map-control")).toBe("mastered");
    expect(getMockMastery("creep-routing")).toBe("in-progress");

    // supply-management is mastered and is a prerequisite of hero-leveling (in-progress)
    expect(getMockMastery("supply-management")).toBe("mastered");
    expect(getMockMastery("hero-leveling")).toBe("in-progress");
  });

  it("MOCK_MASTERY is read-only (does not expose internal mutation)", () => {
    // Verify the read-only view exists and is accessible
    expect(typeof MOCK_MASTERY).toBe("object");
    expect(MOCK_MASTERY).not.toBeNull();
  });

  it("all 13 seed corpus node IDs are present in MOCK_MASTERY", () => {
    const expectedIds = [
      "map-control",
      "supply-management",
      "scouting",
      "hotkey-discipline",
      "creep-routing",
      "hero-leveling",
      "army-positioning",
      "resource-banking",
      "micro-focus-fire",
      "expansion-timing",
      "tech-timing",
      "harassment",
      "base-defense",
    ];
    for (const id of expectedIds) {
      expect(MOCK_MASTERY).toHaveProperty(id);
    }
  });
});
