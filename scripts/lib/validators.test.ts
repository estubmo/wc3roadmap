// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors
import { describe, it, expect } from "vitest";
import { validatePrerequisiteIds, validatePatchIds } from "./validators";

const VALID_PATCH_IDS = ["patch-1.36.1", "patch-1.36.2"] as const;

describe("validatePrerequisiteIds", () => {
  it("returns [] when all nodes have empty prerequisites", () => {
    const nodes = [
      { id: "a", prerequisites: [] },
      { id: "b", prerequisites: [] },
    ];
    expect(validatePrerequisiteIds(nodes)).toEqual([]);
  });

  it("returns [] when all prerequisite ids resolve to existing nodes", () => {
    const nodes = [
      { id: "a", prerequisites: [] },
      { id: "b", prerequisites: ["a"] },
      { id: "c", prerequisites: ["a", "b"] },
    ];
    expect(validatePrerequisiteIds(nodes)).toEqual([]);
  });

  it("returns an error for a node whose prerequisite id does not exist", () => {
    const nodes = [
      { id: "a", prerequisites: [] },
      { id: "b", prerequisites: ["nonexistent"] },
    ];
    const errors = validatePrerequisiteIds(nodes);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toMatch(/b/);
    expect(errors[0]).toMatch(/nonexistent/);
  });

  it("returns one error per unresolved prerequisite", () => {
    const nodes = [
      { id: "a", prerequisites: ["missing-1", "missing-2"] },
    ];
    const errors = validatePrerequisiteIds(nodes);
    expect(errors).toHaveLength(2);
  });

  it("returns errors for multiple nodes with unresolved prerequisites", () => {
    const nodes = [
      { id: "a", prerequisites: ["ghost"] },
      { id: "b", prerequisites: ["also-gone"] },
    ];
    const errors = validatePrerequisiteIds(nodes);
    expect(errors).toHaveLength(2);
  });

  it("returns [] for a single node with no prerequisites", () => {
    expect(validatePrerequisiteIds([{ id: "solo", prerequisites: [] }])).toEqual([]);
  });
});

describe("validatePatchIds", () => {
  it("returns [] when all nodes have valid patchIds", () => {
    const nodes = [
      { id: "a", patchId: "patch-1.36.1" },
      { id: "b", patchId: "patch-1.36.2" },
    ];
    expect(validatePatchIds(nodes, VALID_PATCH_IDS)).toEqual([]);
  });

  it("returns an error for a node with an unknown patchId", () => {
    const nodes = [{ id: "a", patchId: "patch-9.99.9" }];
    const errors = validatePatchIds(nodes, VALID_PATCH_IDS);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toMatch(/a/);
    expect(errors[0]).toMatch(/patch-9\.99\.9/);
  });

  it("returns one error per invalid patchId", () => {
    const nodes = [
      { id: "x", patchId: "bad-patch-1" },
      { id: "y", patchId: "bad-patch-2" },
    ];
    const errors = validatePatchIds(nodes, VALID_PATCH_IDS);
    expect(errors).toHaveLength(2);
  });

  it("returns [] for empty node array", () => {
    expect(validatePatchIds([], VALID_PATCH_IDS)).toEqual([]);
  });
});
