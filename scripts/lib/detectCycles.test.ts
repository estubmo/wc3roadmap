// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors
import { describe, it, expect } from "vitest";
import { detectCycles } from "./detectCycles";

describe("detectCycles", () => {
  it("returns [] for an empty graph", () => {
    expect(detectCycles([])).toEqual([]);
  });

  it("returns [] for a single node with no prerequisites", () => {
    expect(detectCycles([{ id: "a", prerequisites: [] }])).toEqual([]);
  });

  it("returns [] for a linear acyclic chain (a -> b -> c)", () => {
    const nodes = [
      { id: "a", prerequisites: [] },
      { id: "b", prerequisites: ["a"] },
      { id: "c", prerequisites: ["b"] },
    ];
    expect(detectCycles(nodes)).toEqual([]);
  });

  it("returns [] for a diamond acyclic graph (a -> b, a -> c, b -> d, c -> d)", () => {
    const nodes = [
      { id: "a", prerequisites: [] },
      { id: "b", prerequisites: ["a"] },
      { id: "c", prerequisites: ["a"] },
      { id: "d", prerequisites: ["b", "c"] },
    ];
    expect(detectCycles(nodes)).toEqual([]);
  });

  it("detects a simple two-node cycle (a -> b -> a)", () => {
    const nodes = [
      { id: "a", prerequisites: ["b"] },
      { id: "b", prerequisites: ["a"] },
    ];
    const errors = detectCycles(nodes);
    expect(errors.length).toBeGreaterThan(0);
    // The error message must name the cycle path
    expect(errors[0]).toMatch(/a/);
    expect(errors[0]).toMatch(/b/);
  });

  it("detects a self-reference cycle (a -> a)", () => {
    const nodes = [{ id: "a", prerequisites: ["a"] }];
    const errors = detectCycles(nodes);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toMatch(/a/);
  });

  it("detects a three-node cycle (a -> b -> c -> a)", () => {
    const nodes = [
      { id: "a", prerequisites: ["c"] },
      { id: "b", prerequisites: ["a"] },
      { id: "c", prerequisites: ["b"] },
    ];
    const errors = detectCycles(nodes);
    expect(errors.length).toBeGreaterThan(0);
    // Must mention nodes in the cycle
    const combined = errors.join(" ");
    expect(combined).toMatch(/a/);
    expect(combined).toMatch(/b/);
    expect(combined).toMatch(/c/);
  });

  it("does not crash when a prerequisite id is not in the node set (handled by prereq validator)", () => {
    // A node referencing a non-existent prerequisite is not a cycle — just a missing ref.
    // detectCycles must not throw in this case.
    const nodes = [{ id: "a", prerequisites: ["nonexistent"] }];
    expect(() => detectCycles(nodes)).not.toThrow();
    // No cycle here, even if the referenced node is missing
    expect(detectCycles(nodes)).toEqual([]);
  });
});
