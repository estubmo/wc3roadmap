// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * Tests for computeAncestorEdgeIds — BFS ancestor-chain pure function (D-03).
 *
 * TDD RED phase: these tests drive the shape of src/lib/pathway-utils.ts.
 */
import { describe, it, expect } from "vitest";
import { computeAncestorEdgeIds } from "./pathway-utils";
import type { Edge } from "@xyflow/react";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/**
 * Linear chain: a → b → d
 * Sibling branch:   a → c
 *
 *   a ──► b ──► d
 *   │
 *   └───► c
 */
const linearEdges: Edge[] = [
  { id: "a->b", source: "a", target: "b" },
  { id: "a->c", source: "a", target: "c" },
  { id: "b->d", source: "b", target: "d" },
];

/**
 * Diamond DAG:
 *   a ──► b ──► d
 *   │           ▲
 *   └───► c ───┘
 */
const diamondEdges: Edge[] = [
  { id: "a->b", source: "a", target: "b" },
  { id: "a->c", source: "a", target: "c" },
  { id: "b->d", source: "b", target: "d" },
  { id: "c->d", source: "c", target: "d" },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("computeAncestorEdgeIds", () => {
  it("returns the full ancestor chain for a leaf node (a→b→d chain)", () => {
    const result = computeAncestorEdgeIds("d", linearEdges);
    // d's ancestors: b (via b->d) and a (via a->b)
    expect(result).toBeInstanceOf(Set);
    expect(result.has("b->d")).toBe(true);
    expect(result.has("a->b")).toBe(true);
    expect(result.size).toBe(2);
  });

  it("excludes sibling branch edges not on ancestor chain (a→c not an ancestor of d)", () => {
    const result = computeAncestorEdgeIds("d", linearEdges);
    // a->c is a sibling branch — must NOT appear in d's ancestor chain
    expect(result.has("a->c")).toBe(false);
  });

  it("returns only immediate ancestor edge for a mid-chain node", () => {
    const result = computeAncestorEdgeIds("b", linearEdges);
    // b's ancestors: a (via a->b)
    expect(result.has("a->b")).toBe(true);
    expect(result.size).toBe(1);
    // b->d is a descendant edge, not an ancestor
    expect(result.has("b->d")).toBe(false);
  });

  it("returns empty Set for a root node (no incoming edges)", () => {
    const result = computeAncestorEdgeIds("a", linearEdges);
    expect(result).toBeInstanceOf(Set);
    expect(result.size).toBe(0);
  });

  it("returns empty Set for an unknown node id (no throw)", () => {
    const result = computeAncestorEdgeIds("unknown-node", linearEdges);
    expect(result).toBeInstanceOf(Set);
    expect(result.size).toBe(0);
  });

  it("handles diamond DAG without infinite loops (visited guard, T-02-06)", () => {
    // d has two ancestors in the diamond: b and c each connect to a
    // BFS should visit a only once despite being reachable via two paths
    const result = computeAncestorEdgeIds("d", diamondEdges);
    // All four diamond edges are on the ancestor chain of d
    expect(result.has("b->d")).toBe(true);
    expect(result.has("c->d")).toBe(true);
    expect(result.has("a->b")).toBe(true);
    expect(result.has("a->c")).toBe(true);
    // Exactly 4 edges (a visited once despite two paths converging)
    expect(result.size).toBe(4);
  });

  it("returns empty Set for empty edge array", () => {
    const result = computeAncestorEdgeIds("any-id", []);
    expect(result.size).toBe(0);
  });

  it("returned Set is consumed via .has() — correct Set<string> shape", () => {
    const result = computeAncestorEdgeIds("d", linearEdges);
    // Pitfall 5: returned Set must support .has(id) with correct boolean semantics
    expect(result.has("b->d")).toBe(true);
    expect(result.has("nonexistent")).toBe(false);
  });
});
