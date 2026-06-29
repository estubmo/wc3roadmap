// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors
import { describe, it, expect } from "vitest";
import { validatePathwayStepIds } from "./validate-pathway";

const NODE_IDS = new Set([
  "map-control",
  "supply-management",
  "scouting",
  "hotkey-discipline",
  "hero-leveling",
  "creep-routing",
  "resource-banking",
  "army-positioning",
]);

describe("validatePathwayStepIds", () => {
  it("returns [] when all steps resolve to existing nodes", () => {
    const pathway = {
      id: "beginner-fundamentals",
      steps: ["map-control", "supply-management", "scouting"],
    };
    expect(validatePathwayStepIds(pathway, NODE_IDS)).toEqual([]);
  });

  it("returns an error for a step ID that does not exist in the corpus", () => {
    const pathway = {
      id: "beginner-fundamentals",
      steps: ["map-control", "typo-id"],
    };
    const errors = validatePathwayStepIds(pathway, NODE_IDS);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/beginner-fundamentals/);
    expect(errors[0]).toMatch(/typo-id/);
  });

  it("returns one error per unresolved step ID", () => {
    const pathway = {
      id: "test-pathway",
      steps: ["missing-a", "map-control", "missing-b"],
    };
    const errors = validatePathwayStepIds(pathway, NODE_IDS);
    expect(errors).toHaveLength(2);
    expect(errors[0]).toMatch(/missing-a/);
    expect(errors[1]).toMatch(/missing-b/);
  });

  it("returns [] for an empty steps array", () => {
    const pathway = { id: "empty-pathway", steps: [] };
    expect(validatePathwayStepIds(pathway, NODE_IDS)).toEqual([]);
  });

  it("includes pathway id and step id in the error message", () => {
    const pathway = { id: "my-pathway", steps: ["nonexistent-node"] };
    const errors = validatePathwayStepIds(pathway, NODE_IDS);
    expect(errors[0]).toMatch(/my-pathway/);
    expect(errors[0]).toMatch(/nonexistent-node/);
  });

  it("returns [] when nodeIds set is large and all steps resolve", () => {
    const pathway = {
      id: "beginner-fundamentals",
      steps: Array.from(NODE_IDS),
    };
    expect(validatePathwayStepIds(pathway, NODE_IDS)).toEqual([]);
  });
});
