// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * Tests for MasteryThresholdSchema (DATA-04).
 *
 * Test-first (TDD RED phase): these tests drive the shape of src/schemas/mastery.ts.
 * The schema is deliberately minimal in Phase 1 (D-10). Signal-specific fields
 * are deferred to Phases 7–8. The only invariants enforced now are:
 *   - nodeId, nodeType, patchId, thresholdDefinition are required
 *   - nodeType must be MECHANIC or CONCEPTUAL
 *   - patchId must be a registry-known value (DATA-04)
 */
import { describe, it, expect } from "vitest";
import { MasteryThresholdSchema } from "./mastery";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** Minimal valid MasteryThreshold. */
const validThreshold = {
  nodeId: "supply-management",
  nodeType: "MECHANIC",
  patchId: "patch-1.36.2",
  thresholdDefinition: {},
};

// ---------------------------------------------------------------------------
// MasteryThresholdSchema — acceptance
// ---------------------------------------------------------------------------

describe("MasteryThresholdSchema — acceptance", () => {
  it("accepts a valid MasteryThreshold object", () => {
    const result = MasteryThresholdSchema.safeParse(validThreshold);
    expect(result.success).toBe(true);
  });

  it("accepts nodeType CONCEPTUAL", () => {
    const result = MasteryThresholdSchema.safeParse({
      ...validThreshold,
      nodeType: "CONCEPTUAL",
    });
    expect(result.success).toBe(true);
  });

  it("accepts all registry patchId values", () => {
    for (const patchId of ["patch-1.36.1", "patch-1.36.2"]) {
      const result = MasteryThresholdSchema.safeParse({ ...validThreshold, patchId });
      expect(result.success, `patchId "${patchId}" should be accepted`).toBe(true);
    }
  });

  it("accepts a non-empty thresholdDefinition record", () => {
    const result = MasteryThresholdSchema.safeParse({
      ...validThreshold,
      thresholdDefinition: {
        winsRequired: 10,
        winRateThreshold: 0.55,
        minGames: 20,
      },
    });
    expect(result.success).toBe(true);
  });

  it("accepts an empty thresholdDefinition record (Phase 1 minimal)", () => {
    const result = MasteryThresholdSchema.safeParse({
      ...validThreshold,
      thresholdDefinition: {},
    });
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// MasteryThresholdSchema — rejection
// ---------------------------------------------------------------------------

describe("MasteryThresholdSchema — rejection", () => {
  it("rejects an unknown patchId (DATA-04)", () => {
    const result = MasteryThresholdSchema.safeParse({
      ...validThreshold,
      patchId: "patch-99.99.99",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty string patchId", () => {
    const result = MasteryThresholdSchema.safeParse({
      ...validThreshold,
      patchId: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects nodeType 'mechanical' (wrong case)", () => {
    const result = MasteryThresholdSchema.safeParse({
      ...validThreshold,
      nodeType: "mechanical",
    });
    expect(result.success).toBe(false);
  });

  it("rejects nodeType 'STRATEGY' (invented value)", () => {
    const result = MasteryThresholdSchema.safeParse({
      ...validThreshold,
      nodeType: "STRATEGY",
    });
    expect(result.success).toBe(false);
  });

  it("rejects when nodeId is absent", () => {
    const { nodeId: _, ...withoutNodeId } = validThreshold;
    const result = MasteryThresholdSchema.safeParse(withoutNodeId);
    expect(result.success).toBe(false);
  });

  it("rejects when thresholdDefinition is absent", () => {
    const { thresholdDefinition: _, ...withoutDef } = validThreshold;
    const result = MasteryThresholdSchema.safeParse(withoutDef);
    expect(result.success).toBe(false);
  });
});
