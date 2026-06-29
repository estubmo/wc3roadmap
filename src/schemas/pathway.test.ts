// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * Tests for PathwaySchema (D-10).
 *
 * TDD RED phase: these tests drive the shape of src/schemas/pathway.ts.
 */
import { describe, it, expect } from "vitest";
import { PathwaySchema } from "./pathway";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** Fully valid pathway data — the beginner fundamentals pathway. */
const validPathway = {
  id: "beginner-fundamentals",
  title: "Beginner Fundamentals",
  subtitle: "8 foundational skills — start here",
  steps: ["map-control", "supply-management", "worker-production"],
};

// ---------------------------------------------------------------------------
// PathwaySchema — acceptance
// ---------------------------------------------------------------------------

describe("PathwaySchema — acceptance", () => {
  it("accepts a fully valid pathway object", () => {
    const result = PathwaySchema.safeParse(validPathway);
    expect(result.success).toBe(true);
  });

  it("accepts a steps array with a single element", () => {
    const result = PathwaySchema.safeParse({ ...validPathway, steps: ["map-control"] });
    expect(result.success).toBe(true);
  });

  it("accepts steps with many node IDs", () => {
    const result = PathwaySchema.safeParse({
      ...validPathway,
      steps: ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"],
    });
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// PathwaySchema — rejection: empty or missing steps (D-10)
// ---------------------------------------------------------------------------

describe("PathwaySchema — steps validation (D-10)", () => {
  it("rejects an empty steps array", () => {
    const result = PathwaySchema.safeParse({ ...validPathway, steps: [] });
    expect(result.success).toBe(false);
  });

  it("rejects when steps field is missing", () => {
    const { steps: _, ...withoutSteps } = validPathway;
    const result = PathwaySchema.safeParse(withoutSteps);
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// PathwaySchema — rejection: empty strings
// ---------------------------------------------------------------------------

describe("PathwaySchema — empty string rejection", () => {
  it("rejects an empty-string id", () => {
    const result = PathwaySchema.safeParse({ ...validPathway, id: "" });
    expect(result.success).toBe(false);
  });

  it("rejects an empty-string title", () => {
    const result = PathwaySchema.safeParse({ ...validPathway, title: "" });
    expect(result.success).toBe(false);
  });

  it("rejects an empty-string subtitle", () => {
    const result = PathwaySchema.safeParse({ ...validPathway, subtitle: "" });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// PathwaySchema — rejection: missing required fields
// ---------------------------------------------------------------------------

describe("PathwaySchema — missing field rejection", () => {
  it("rejects when id is missing", () => {
    const { id: _, ...withoutId } = validPathway;
    const result = PathwaySchema.safeParse(withoutId);
    expect(result.success).toBe(false);
  });

  it("rejects when title is missing", () => {
    const { title: _, ...withoutTitle } = validPathway;
    const result = PathwaySchema.safeParse(withoutTitle);
    expect(result.success).toBe(false);
  });

  it("rejects when subtitle is missing", () => {
    const { subtitle: _, ...withoutSubtitle } = validPathway;
    const result = PathwaySchema.safeParse(withoutSubtitle);
    expect(result.success).toBe(false);
  });
});
