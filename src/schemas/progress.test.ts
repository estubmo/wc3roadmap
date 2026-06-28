// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * Tests for MasteryStateSchema and ProgressRecordSchema (DATA-04).
 *
 * Test-first (TDD RED phase): these tests drive the shape of src/schemas/progress.ts.
 * MasteryState is the three-state lifecycle of a player's node progress.
 * ProgressRecord is patch-tagged per DATA-04 — every record carries patchId.
 */
import { describe, it, expect } from "vitest";
import { MasteryStateSchema, ProgressRecordSchema } from "./progress";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** Minimal valid ProgressRecord. */
const validRecord = {
  userId: "user-abc123",
  nodeId: "supply-management",
  patchId: "patch-1.36.2",
  masteryState: "untouched",
  lastUpdated: "2026-06-28T19:00:00Z",
};

// ---------------------------------------------------------------------------
// MasteryStateSchema
// ---------------------------------------------------------------------------

describe("MasteryStateSchema", () => {
  it("accepts 'untouched'", () => {
    expect(MasteryStateSchema.safeParse("untouched").success).toBe(true);
  });

  it("accepts 'learning'", () => {
    expect(MasteryStateSchema.safeParse("learning").success).toBe(true);
  });

  it("accepts 'mastered'", () => {
    expect(MasteryStateSchema.safeParse("mastered").success).toBe(true);
  });

  it("rejects 'started' (invalid state)", () => {
    expect(MasteryStateSchema.safeParse("started").success).toBe(false);
  });

  it("rejects 'MASTERED' (wrong case)", () => {
    expect(MasteryStateSchema.safeParse("MASTERED").success).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(MasteryStateSchema.safeParse("").success).toBe(false);
  });

  it("rejects a number", () => {
    expect(MasteryStateSchema.safeParse(42).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// ProgressRecordSchema — acceptance
// ---------------------------------------------------------------------------

describe("ProgressRecordSchema — acceptance", () => {
  it("accepts a valid ProgressRecord", () => {
    const result = ProgressRecordSchema.safeParse(validRecord);
    expect(result.success).toBe(true);
  });

  it("accepts all three masteryState values", () => {
    for (const masteryState of ["untouched", "learning", "mastered"] as const) {
      const result = ProgressRecordSchema.safeParse({ ...validRecord, masteryState });
      expect(result.success, `masteryState "${masteryState}" should be accepted`).toBe(true);
    }
  });

  it("accepts all registry patchId values", () => {
    for (const patchId of ["patch-1.36.1", "patch-1.36.2"]) {
      const result = ProgressRecordSchema.safeParse({ ...validRecord, patchId });
      expect(result.success, `patchId "${patchId}" should be accepted`).toBe(true);
    }
  });

  it("accepts a valid ISO 8601 datetime for lastUpdated", () => {
    const result = ProgressRecordSchema.safeParse({
      ...validRecord,
      lastUpdated: "2025-01-15T12:30:00Z",
    });
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// ProgressRecordSchema — rejection
// ---------------------------------------------------------------------------

describe("ProgressRecordSchema — rejection", () => {
  it("rejects an unknown patchId (DATA-04)", () => {
    const result = ProgressRecordSchema.safeParse({
      ...validRecord,
      patchId: "patch-99.99.99",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty string patchId", () => {
    const result = ProgressRecordSchema.safeParse({
      ...validRecord,
      patchId: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid masteryState", () => {
    const result = ProgressRecordSchema.safeParse({
      ...validRecord,
      masteryState: "started",
    });
    expect(result.success).toBe(false);
  });

  it("rejects 'MASTERED' (wrong case) as masteryState", () => {
    const result = ProgressRecordSchema.safeParse({
      ...validRecord,
      masteryState: "MASTERED",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a plain date string for lastUpdated (not ISO datetime)", () => {
    const result = ProgressRecordSchema.safeParse({
      ...validRecord,
      lastUpdated: "2026-06-28",
    });
    expect(result.success).toBe(false);
  });

  it("rejects when userId is absent", () => {
    const { userId: _, ...withoutUserId } = validRecord;
    const result = ProgressRecordSchema.safeParse(withoutUserId);
    expect(result.success).toBe(false);
  });

  it("rejects when nodeId is absent", () => {
    const { nodeId: _, ...withoutNodeId } = validRecord;
    const result = ProgressRecordSchema.safeParse(withoutNodeId);
    expect(result.success).toBe(false);
  });

  it("rejects when patchId is absent", () => {
    const { patchId: _, ...withoutPatchId } = validRecord;
    const result = ProgressRecordSchema.safeParse(withoutPatchId);
    expect(result.success).toBe(false);
  });

  it("rejects when lastUpdated is absent", () => {
    const { lastUpdated: _, ...withoutLastUpdated } = validRecord;
    const result = ProgressRecordSchema.safeParse(withoutLastUpdated);
    expect(result.success).toBe(false);
  });
});
