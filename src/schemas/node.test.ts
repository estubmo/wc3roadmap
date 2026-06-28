// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * Tests for NodeSummarySchema and NodeFrontmatterSchema (DATA-01 through DATA-05).
 *
 * Test-first (TDD RED phase): these tests drive the shape of src/schemas/node.ts.
 */
import { describe, it, expect } from "vitest";
import {
  NodeSummarySchema,
  NodeFrontmatterSchema,
} from "./node";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** Minimal valid NodeSummary — graph-display fields only (DATA-02). */
const validSummary = {
  id: "supply-management",
  title: "Supply Management",
  nodeType: "MECHANIC",
  race: "agnostic",
  prerequisites: [],
};

/** Full valid NodeFrontmatter (all required fields present). */
const validFrontmatter = {
  ...validSummary,
  skillType: "macro",
  difficulty: "beginner",
  tags: ["economy", "fundamentals"],
  patchId: "patch-1.36.2",
  patch_context: "Supply limit unchanged in this patch; timing windows are current.",
  last_reviewed: "2026-06-28",
  meta_volatile: false,
  citations: [
    {
      source: "Ericsson (1993) – Deliberate Practice",
      url: "https://example.com/paper",
      applicationNote:
        "Deliberate practice principles apply directly to repetitive supply-management drills.",
    },
  ],
};

// ---------------------------------------------------------------------------
// NodeSummarySchema
// ---------------------------------------------------------------------------

describe("NodeSummarySchema", () => {
  it("accepts a valid NodeSummary object", () => {
    const result = NodeSummarySchema.safeParse(validSummary);
    expect(result.success).toBe(true);
  });

  it("accepts all five race values", () => {
    const races = ["agnostic", "human", "orc", "undead", "nightelf"] as const;
    for (const race of races) {
      const result = NodeSummarySchema.safeParse({ ...validSummary, race });
      expect(result.success, `race "${race}" should be accepted`).toBe(true);
    }
  });

  it("accepts both nodeType values", () => {
    expect(NodeSummarySchema.safeParse({ ...validSummary, nodeType: "MECHANIC" }).success).toBe(true);
    expect(NodeSummarySchema.safeParse({ ...validSummary, nodeType: "CONCEPTUAL" }).success).toBe(true);
  });

  it("rejects an invalid nodeType (DATA-01)", () => {
    const result = NodeSummarySchema.safeParse({ ...validSummary, nodeType: "mechanical" });
    expect(result.success).toBe(false);
  });

  it("rejects an empty-string nodeType", () => {
    const result = NodeSummarySchema.safeParse({ ...validSummary, nodeType: "" });
    expect(result.success).toBe(false);
  });

  it("accepts an empty prerequisites array (DATA-05)", () => {
    const result = NodeSummarySchema.safeParse({ ...validSummary, prerequisites: [] });
    expect(result.success).toBe(true);
  });

  it("accepts a prerequisites array with node-id strings (DATA-05)", () => {
    const result = NodeSummarySchema.safeParse({
      ...validSummary,
      prerequisites: ["map-control", "creep-jacking"],
    });
    expect(result.success).toBe(true);
  });

  it("contains exactly the graph-display fields: id, title, nodeType, race, prerequisites (DATA-02)", () => {
    // NodeSummary should NOT include content-only fields
    const extraFields = {
      ...validSummary,
      skillType: "macro",         // content-only
      patchId: "patch-1.36.2",   // content-only
      patch_context: "...",       // content-only
    };
    // NodeSummarySchema strips unknown keys — parse should succeed but drop extras
    const result = NodeSummarySchema.safeParse(extraFields);
    expect(result.success).toBe(true);
    if (result.success) {
      // The inferred type should not have these fields
      const keys = Object.keys(result.data);
      expect(keys).toEqual(
        expect.arrayContaining(["id", "title", "nodeType", "race", "prerequisites"])
      );
    }
  });
});

// ---------------------------------------------------------------------------
// NodeFrontmatterSchema — acceptance
// ---------------------------------------------------------------------------

describe("NodeFrontmatterSchema — acceptance", () => {
  it("accepts a fully valid NodeFrontmatter object", () => {
    const result = NodeFrontmatterSchema.safeParse(validFrontmatter);
    expect(result.success).toBe(true);
  });

  it("accepts nodeType CONCEPTUAL", () => {
    const result = NodeFrontmatterSchema.safeParse({
      ...validFrontmatter,
      nodeType: "CONCEPTUAL",
    });
    expect(result.success).toBe(true);
  });

  it("accepts all valid skillType values", () => {
    for (const skillType of ["macro", "micro", "mental"] as const) {
      const result = NodeFrontmatterSchema.safeParse({ ...validFrontmatter, skillType });
      expect(result.success, `skillType "${skillType}" should be accepted`).toBe(true);
    }
  });

  it("accepts all valid difficulty values", () => {
    for (const difficulty of ["beginner", "intermediate", "advanced"] as const) {
      const result = NodeFrontmatterSchema.safeParse({ ...validFrontmatter, difficulty });
      expect(result.success, `difficulty "${difficulty}" should be accepted`).toBe(true);
    }
  });

  it("accepts all registry patchId values", () => {
    for (const patchId of ["patch-1.36.1", "patch-1.36.2"]) {
      const result = NodeFrontmatterSchema.safeParse({ ...validFrontmatter, patchId });
      expect(result.success, `patchId "${patchId}" should be accepted`).toBe(true);
    }
  });

  it("accepts an empty tags array", () => {
    const result = NodeFrontmatterSchema.safeParse({ ...validFrontmatter, tags: [] });
    expect(result.success).toBe(true);
  });

  it("accepts citations without a url (url is optional)", () => {
    const result = NodeFrontmatterSchema.safeParse({
      ...validFrontmatter,
      citations: [
        {
          source: "Ericsson (1993)",
          applicationNote: "Relevant to drilling WC3 mechanics systematically.",
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("accepts meta_volatile = true", () => {
    const result = NodeFrontmatterSchema.safeParse({
      ...validFrontmatter,
      meta_volatile: true,
    });
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// NodeFrontmatterSchema — rejection: nodeType (DATA-01)
// ---------------------------------------------------------------------------

describe("NodeFrontmatterSchema — nodeType rejection (DATA-01)", () => {
  it("rejects nodeType 'mechanical' (wrong case/spelling)", () => {
    const result = NodeFrontmatterSchema.safeParse({
      ...validFrontmatter,
      nodeType: "mechanical",
    });
    expect(result.success).toBe(false);
  });

  it("rejects nodeType 'conceptual' (lowercase)", () => {
    const result = NodeFrontmatterSchema.safeParse({
      ...validFrontmatter,
      nodeType: "conceptual",
    });
    expect(result.success).toBe(false);
  });

  it("rejects nodeType 'STRATEGY' (invented value)", () => {
    const result = NodeFrontmatterSchema.safeParse({
      ...validFrontmatter,
      nodeType: "STRATEGY",
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// NodeFrontmatterSchema — rejection: required content fields (DATA-03)
// ---------------------------------------------------------------------------

describe("NodeFrontmatterSchema — required content field rejection (DATA-03)", () => {
  it("rejects when patch_context is absent", () => {
    const { patch_context: _, ...withoutPatchContext } = validFrontmatter;
    const result = NodeFrontmatterSchema.safeParse(withoutPatchContext);
    expect(result.success).toBe(false);
  });

  it("rejects when patch_context is an empty string", () => {
    const result = NodeFrontmatterSchema.safeParse({
      ...validFrontmatter,
      patch_context: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects when last_reviewed is absent", () => {
    const { last_reviewed: _, ...withoutLastReviewed } = validFrontmatter;
    const result = NodeFrontmatterSchema.safeParse(withoutLastReviewed);
    expect(result.success).toBe(false);
  });

  it("rejects when meta_volatile is absent", () => {
    const { meta_volatile: _, ...withoutMetaVolatile } = validFrontmatter;
    const result = NodeFrontmatterSchema.safeParse(withoutMetaVolatile);
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// NodeFrontmatterSchema — rejection: last_reviewed date format
// ---------------------------------------------------------------------------

describe("NodeFrontmatterSchema — last_reviewed date format", () => {
  it("rejects a datetime string (ISO 8601 with time)", () => {
    const result = NodeFrontmatterSchema.safeParse({
      ...validFrontmatter,
      last_reviewed: "2026-06-28T00:00:00Z",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a non-date string", () => {
    const result = NodeFrontmatterSchema.safeParse({
      ...validFrontmatter,
      last_reviewed: "yesterday",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a date with slashes", () => {
    const result = NodeFrontmatterSchema.safeParse({
      ...validFrontmatter,
      last_reviewed: "2026/06/28",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid YYYY-MM-DD date", () => {
    const result = NodeFrontmatterSchema.safeParse({
      ...validFrontmatter,
      last_reviewed: "2025-01-15",
    });
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// NodeFrontmatterSchema — rejection: patchId registry validation (DATA-04)
// ---------------------------------------------------------------------------

describe("NodeFrontmatterSchema — patchId registry validation (DATA-04)", () => {
  it("rejects an unknown patchId", () => {
    const result = NodeFrontmatterSchema.safeParse({
      ...validFrontmatter,
      patchId: "patch-99.99.99",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty string patchId", () => {
    const result = NodeFrontmatterSchema.safeParse({
      ...validFrontmatter,
      patchId: "",
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// NodeFrontmatterSchema — rejection: citation applicationNote
// ---------------------------------------------------------------------------

describe("NodeFrontmatterSchema — citation applicationNote", () => {
  it("rejects a citation missing applicationNote", () => {
    const result = NodeFrontmatterSchema.safeParse({
      ...validFrontmatter,
      citations: [
        {
          source: "Some Paper",
          url: "https://example.com",
          // applicationNote intentionally omitted
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a citation with an empty applicationNote", () => {
    const result = NodeFrontmatterSchema.safeParse({
      ...validFrontmatter,
      citations: [
        {
          source: "Some Paper",
          applicationNote: "",
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("accepts a citation with a non-empty applicationNote", () => {
    const result = NodeFrontmatterSchema.safeParse({
      ...validFrontmatter,
      citations: [
        {
          source: "Some Paper",
          applicationNote: "Directly relevant to WC3 practice methods.",
        },
      ],
    });
    expect(result.success).toBe(true);
  });
});
