// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * Tests for GraphDisplayNodeSchema (ADR 002, ADR 005, D-04).
 *
 * TDD RED phase: these tests drive the shape of src/schemas/graph.ts.
 */
import { describe, it, expect } from "vitest";
import { GraphDisplayNodeSchema } from "./graph";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** Valid NodeSummary fields — the base the projection extends. */
const validSummary = {
  id: "map-control",
  title: "Map Control",
  nodeType: "MECHANIC" as const,
  race: "agnostic" as const,
  prerequisites: [],
};

/** Fully valid GraphDisplayNode — NodeSummary + difficulty + skillType + tags (ADR 005, ADR 006). */
const validGraphNode = {
  ...validSummary,
  difficulty: "beginner" as const,
  skillType: "macro" as const,
  tags: [] as string[],
  stale: false,
};

// ---------------------------------------------------------------------------
// GraphDisplayNodeSchema — acceptance
// ---------------------------------------------------------------------------

describe("GraphDisplayNodeSchema — acceptance", () => {
  it("accepts a valid GraphDisplayNode (NodeSummary + difficulty)", () => {
    const result = GraphDisplayNodeSchema.safeParse(validGraphNode);
    expect(result.success).toBe(true);
  });

  it("accepts all three difficulty values", () => {
    const difficulties = ["beginner", "intermediate", "advanced"] as const;
    for (const difficulty of difficulties) {
      const result = GraphDisplayNodeSchema.safeParse({ ...validGraphNode, difficulty });
      expect(result.success, `difficulty "${difficulty}" should be accepted`).toBe(true);
    }
  });

  it("accepts both nodeType values (MECHANIC and CONCEPTUAL)", () => {
    expect(
      GraphDisplayNodeSchema.safeParse({ ...validGraphNode, nodeType: "MECHANIC" }).success
    ).toBe(true);
    expect(
      GraphDisplayNodeSchema.safeParse({ ...validGraphNode, nodeType: "CONCEPTUAL" }).success
    ).toBe(true);
  });

  it("accepts an empty prerequisites array", () => {
    const result = GraphDisplayNodeSchema.safeParse({ ...validGraphNode, prerequisites: [] });
    expect(result.success).toBe(true);
  });

  it("accepts prerequisites with node-id strings", () => {
    const result = GraphDisplayNodeSchema.safeParse({
      ...validGraphNode,
      prerequisites: ["supply-management", "creep-jacking"],
    });
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// GraphDisplayNodeSchema — rejection: missing difficulty (ADR 005)
// ---------------------------------------------------------------------------

describe("GraphDisplayNodeSchema — difficulty rejection (ADR 005)", () => {
  it("rejects an object missing difficulty", () => {
    const { difficulty: _, ...withoutDifficulty } = validGraphNode;
    const result = GraphDisplayNodeSchema.safeParse(withoutDifficulty);
    expect(result.success).toBe(false);
  });

  it("rejects an invalid difficulty value ('expert')", () => {
    const result = GraphDisplayNodeSchema.safeParse({
      ...validGraphNode,
      difficulty: "expert",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid difficulty value ('easy')", () => {
    const result = GraphDisplayNodeSchema.safeParse({
      ...validGraphNode,
      difficulty: "easy",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty-string difficulty", () => {
    const result = GraphDisplayNodeSchema.safeParse({
      ...validGraphNode,
      difficulty: "",
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// GraphDisplayNodeSchema — rejection: missing NodeSummary fields (ADR 002)
// ---------------------------------------------------------------------------

describe("GraphDisplayNodeSchema — NodeSummary field rejection (ADR 002)", () => {
  it("rejects when nodeType is missing", () => {
    const { nodeType: _, ...withoutNodeType } = validGraphNode;
    const result = GraphDisplayNodeSchema.safeParse(withoutNodeType);
    expect(result.success).toBe(false);
  });

  it("rejects an invalid nodeType value", () => {
    const result = GraphDisplayNodeSchema.safeParse({
      ...validGraphNode,
      nodeType: "STRATEGY",
    });
    expect(result.success).toBe(false);
  });

  it("rejects when id is missing", () => {
    const { id: _, ...withoutId } = validGraphNode;
    const result = GraphDisplayNodeSchema.safeParse(withoutId);
    expect(result.success).toBe(false);
  });

  it("rejects when title is missing", () => {
    const { title: _, ...withoutTitle } = validGraphNode;
    const result = GraphDisplayNodeSchema.safeParse(withoutTitle);
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// ADR 002 boundary: confirmed via acceptance grep (no content fields in type)
// ---------------------------------------------------------------------------

describe("GraphDisplayNodeSchema — ADR 002 boundary", () => {
  it("inferred type does NOT include content-only fields (they are stripped)", () => {
    // NodeSummarySchema.extend() strips unknown keys at parse time
    const result = GraphDisplayNodeSchema.safeParse({
      ...validGraphNode,
      skillType: "macro" as const,
      tags: [] as string[],
      citations: [{ source: "Paper", applicationNote: "note" }],
      patch_context: "no change",
      meta_volatile: false,
    });
    // Parse succeeds (unknown fields stripped), but the data has no content fields
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("citations");
      expect(result.data).not.toHaveProperty("patch_context");
      expect(result.data).not.toHaveProperty("meta_volatile");
    }
  });
});

// ---------------------------------------------------------------------------
// GraphDisplayNodeSchema — skillType + tags (ADR 006, D-11, GRAPH-04)
// ---------------------------------------------------------------------------

describe("GraphDisplayNodeSchema — skillType + tags (ADR 006)", () => {
  /** Fully valid node with the two new D-11 fields. */
  const validWithNewFields = {
    ...validGraphNode,
    skillType: "macro" as const,
    tags: ["scouting", "timing"] as string[],
  };

  it("accepts a node with skillType and tags present in the parsed output", () => {
    const result = GraphDisplayNodeSchema.safeParse(validWithNewFields);
    expect(result.success).toBe(true);
    if (result.success) {
      // Fields must be preserved — not stripped — after ADR-006 extension
      expect(result.data.skillType).toBe("macro");
      expect(result.data.tags).toEqual(["scouting", "timing"]);
    }
  });

  it("accepts all three skillType values", () => {
    const skillTypes = ["macro", "micro", "mental"] as const;
    for (const skillType of skillTypes) {
      const result = GraphDisplayNodeSchema.safeParse({ ...validWithNewFields, skillType });
      expect(result.success, `skillType "${skillType}" should be accepted`).toBe(true);
    }
  });

  it("accepts an empty tags array", () => {
    const result = GraphDisplayNodeSchema.safeParse({ ...validWithNewFields, tags: [] });
    expect(result.success).toBe(true);
  });

  it("accepts tags with multiple string values", () => {
    const result = GraphDisplayNodeSchema.safeParse({
      ...validWithNewFields,
      tags: ["economy", "harassment", "positioning"],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tags).toHaveLength(3);
    }
  });

  it("rejects an invalid skillType value ('physical')", () => {
    const result = GraphDisplayNodeSchema.safeParse({
      ...validWithNewFields,
      skillType: "physical",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid skillType value ('cognitive')", () => {
    const result = GraphDisplayNodeSchema.safeParse({
      ...validWithNewFields,
      skillType: "cognitive",
    });
    expect(result.success).toBe(false);
  });

  it("rejects when skillType is missing", () => {
    const { skillType: _, ...withoutSkillType } = validWithNewFields;
    const result = GraphDisplayNodeSchema.safeParse(withoutSkillType);
    expect(result.success).toBe(false);
  });

  it("rejects when tags is missing", () => {
    const { tags: _, ...withoutTags } = validWithNewFields;
    const result = GraphDisplayNodeSchema.safeParse(withoutTags);
    expect(result.success).toBe(false);
  });
});
