// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * Tests for computeLayout — dagre-backed DAG layout pure function (GRAPH-06, D-01, D-02).
 *
 * TDD RED phase: these tests drive the shape of src/lib/graph-layout.ts.
 */
import { describe, it, expect } from "vitest";
import { computeLayout } from "./graph-layout";
import type { GraphDisplayNode } from "../schemas/graph";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/**
 * Small fixed DAG: a → b, a → c, b → d
 *
 *   a
 *  / \
 * b   c
 * |
 * d
 */
const nodes: GraphDisplayNode[] = [
  {
    id: "a",
    title: "A",
    nodeType: "MECHANIC",
    race: "agnostic",
    prerequisites: [],
    difficulty: "beginner",
    skillType: "macro",
    tags: [],
  },
  {
    id: "b",
    title: "B",
    nodeType: "MECHANIC",
    race: "agnostic",
    prerequisites: ["a"],
    difficulty: "beginner",
    skillType: "micro",
    tags: [],
  },
  {
    id: "c",
    title: "C",
    nodeType: "CONCEPTUAL",
    race: "agnostic",
    prerequisites: ["a"],
    difficulty: "intermediate",
    skillType: "mental",
    tags: [],
  },
  {
    id: "d",
    title: "D",
    nodeType: "MECHANIC",
    race: "agnostic",
    prerequisites: ["b"],
    difficulty: "advanced",
    skillType: "macro",
    tags: [],
  },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("computeLayout", () => {
  it("returns every input node in the output", () => {
    const { nodes: out } = computeLayout(nodes);
    const ids = out.map((n) => n.id);
    expect(ids).toContain("a");
    expect(ids).toContain("b");
    expect(ids).toContain("c");
    expect(ids).toContain("d");
    expect(out.length).toBe(4);
  });

  it("every node has a numeric position.x and position.y", () => {
    const { nodes: out } = computeLayout(nodes);
    for (const n of out) {
      expect(typeof n.position.x).toBe("number");
      expect(typeof n.position.y).toBe("number");
    }
  });

  it("TB direction: dependent.y > prerequisite.y (top-to-bottom depth ordering, D-02)", () => {
    const { nodes: out } = computeLayout(nodes, "TB");
    const find = (id: string) => out.find((n) => n.id === id)!;
    // a is a root; b depends on a; d depends on b
    expect(find("b").position.y).toBeGreaterThan(find("a").position.y);
    expect(find("d").position.y).toBeGreaterThan(find("b").position.y);
    // c depends on a — must be below a
    expect(find("c").position.y).toBeGreaterThan(find("a").position.y);
  });

  it("produces one Edge per prerequisite link with correct id, source, and target", () => {
    const { edges } = computeLayout(nodes);
    const edgeIds = edges.map((e) => e.id);
    expect(edgeIds).toContain("a->b");
    expect(edgeIds).toContain("a->c");
    expect(edgeIds).toContain("b->d");
    expect(edges.length).toBe(3);

    const abEdge = edges.find((e) => e.id === "a->b")!;
    expect(abEdge.source).toBe("a");
    expect(abEdge.target).toBe("b");

    const bdEdge = edges.find((e) => e.id === "b->d")!;
    expect(bdEdge.source).toBe("b");
    expect(bdEdge.target).toBe("d");
  });

  it("setEdge argument order is prereq-first — source=prereq, target=dependent (Pitfall 7)", () => {
    const { edges } = computeLayout(nodes);
    // a->b: source must be 'a' (the prereq), target must be 'b' (the dependent)
    const ab = edges.find((e) => e.id === "a->b")!;
    expect(ab.source).toBe("a");
    expect(ab.target).toBe("b");
  });

  it("edge type is 'prerequisite'", () => {
    const { edges } = computeLayout(nodes);
    for (const e of edges) {
      expect(e.type).toBe("prerequisite");
    }
  });

  it("node type is 'mechanic' for MECHANIC and 'conceptual' for CONCEPTUAL", () => {
    const { nodes: out } = computeLayout(nodes);
    const find = (id: string) => out.find((n) => n.id === id)!;
    expect(find("a").type).toBe("mechanic");
    expect(find("b").type).toBe("mechanic");
    expect(find("c").type).toBe("conceptual");
  });

  it("node data carries the full GraphDisplayNode fields", () => {
    const { nodes: out } = computeLayout(nodes);
    const a = out.find((n) => n.id === "a")!;
    expect(a.data).toMatchObject({
      id: "a",
      title: "A",
      nodeType: "MECHANIC",
      race: "agnostic",
      prerequisites: [],
      difficulty: "beginner",
    });
  });

  it("is deterministic — two calls with the same input produce equal positions and edges", () => {
    const r1 = computeLayout(nodes);
    const r2 = computeLayout(nodes);
    expect(r1.nodes.map((n) => ({ id: n.id, position: n.position }))).toEqual(
      r2.nodes.map((n) => ({ id: n.id, position: n.position }))
    );
    expect(r1.edges.map((e) => e.id)).toEqual(r2.edges.map((e) => e.id));
  });

  it("empty input returns empty arrays", () => {
    const { nodes: out, edges } = computeLayout([]);
    expect(out).toEqual([]);
    expect(edges).toEqual([]);
  });
});
