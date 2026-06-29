// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * Tests for matchesFilter and isFilterActive — pure node-filter utilities (GRAPH-04, D-10).
 *
 * Wave 0 RED scaffolds: src/lib/filter-utils.ts does not exist yet.
 * These tests turn GREEN when plan 03-04 creates the production module.
 *
 * Filter semantics (D-10):
 *   - Free-text search: case-insensitive substring match on title OR tags (OR)
 *   - Facets (race, skillType, difficulty, mastery): AND across facets, OR within a facet
 *   - No filters active → every node matches
 */
import { describe, it, expect } from "vitest";
import { matchesFilter, isFilterActive } from "#/lib/filter-utils";
import type { MasteryState } from "#/lib/mock-mastery";

// ---------------------------------------------------------------------------
// Fixture type: post-ADR-006 GraphDisplayNode shape (skillType + tags).
// Plan 03-02 adds these fields to GraphDisplayNodeSchema; tests written against
// the future shape so they become GREEN when plan 03-02 + 03-04 both land.
// ---------------------------------------------------------------------------

interface TestNode {
  id: string;
  title: string;
  nodeType: "MECHANIC" | "CONCEPTUAL";
  race: "agnostic" | "human" | "orc" | "undead" | "nightelf";
  prerequisites: string[];
  difficulty: "beginner" | "intermediate" | "advanced";
  skillType: "macro" | "micro" | "mental";
  tags: string[];
}

// Minimal empty-facet filters (no filtering active)
const noFilters = {
  race: [],
  skillType: [],
  difficulty: [],
  mastery: [],
};

// Shared test node fixtures
const macroNode: TestNode = {
  id: "supply-management",
  title: "Supply Management",
  nodeType: "MECHANIC",
  race: "agnostic",
  prerequisites: [],
  difficulty: "beginner",
  skillType: "macro",
  tags: ["economy", "fundamentals"],
};

const microNode: TestNode = {
  id: "micro-focus-fire",
  title: "Micro Focus Fire",
  nodeType: "MECHANIC",
  race: "agnostic",
  prerequisites: [],
  difficulty: "intermediate",
  skillType: "micro",
  tags: ["combat", "apm"],
};

const humanMacroNode: TestNode = {
  id: "human-expansion-timing",
  title: "Human Expansion Timing",
  nodeType: "CONCEPTUAL",
  race: "human",
  prerequisites: [],
  difficulty: "intermediate",
  skillType: "macro",
  tags: ["economy", "timing"],
};

// ---------------------------------------------------------------------------
// matchesFilter — no active filters
// ---------------------------------------------------------------------------

describe("matchesFilter — no active filters", () => {
  it("returns true when searchQuery is empty and all facets are empty", () => {
    expect(matchesFilter(macroNode as never, "untouched", "", noFilters)).toBe(true);
  });

  it("returns true for any mastery state when no mastery filter is set", () => {
    const masteries: MasteryState[] = ["untouched", "in-progress", "mastered"];
    for (const mastery of masteries) {
      expect(
        matchesFilter(macroNode as never, mastery, "", noFilters),
        `mastery ${mastery} should match when no filters`
      ).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// matchesFilter — free-text search (title + tags, D-10)
// ---------------------------------------------------------------------------

describe("matchesFilter — free-text search", () => {
  it("matches a case-insensitive substring of the title", () => {
    expect(matchesFilter(macroNode as never, "untouched", "supply", noFilters)).toBe(true);
    expect(matchesFilter(macroNode as never, "untouched", "SUPPLY", noFilters)).toBe(true);
    expect(matchesFilter(macroNode as never, "untouched", "Supply Man", noFilters)).toBe(true);
  });

  it("matches a case-insensitive substring of a tag", () => {
    // macroNode has tags: ["economy", "fundamentals"]
    expect(matchesFilter(macroNode as never, "untouched", "economy", noFilters)).toBe(true);
    expect(matchesFilter(macroNode as never, "untouched", "FUND", noFilters)).toBe(true);
  });

  it("returns false when the query matches neither title nor tags", () => {
    expect(matchesFilter(macroNode as never, "untouched", "zzz-nomatch", noFilters)).toBe(false);
  });

  it("matches on tag when title does not match (OR between title and tags)", () => {
    // "apm" is a tag on microNode but not in the title
    expect(matchesFilter(microNode as never, "untouched", "apm", noFilters)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// matchesFilter — race facet (OR within facet, AND with others)
// ---------------------------------------------------------------------------

describe("matchesFilter — race facet", () => {
  it("matches when the node race is in the filter list (OR within facet)", () => {
    const filters = { ...noFilters, race: ["agnostic", "human"] };
    expect(matchesFilter(macroNode as never, "untouched", "", filters)).toBe(true);
    expect(matchesFilter(humanMacroNode as never, "untouched", "", filters)).toBe(true);
  });

  it("returns false when the node race is not in the filter list", () => {
    const filters = { ...noFilters, race: ["human"] };
    // macroNode is "agnostic" — not in ["human"]
    expect(matchesFilter(macroNode as never, "untouched", "", filters)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// matchesFilter — skillType facet (OR within facet)
// ---------------------------------------------------------------------------

describe("matchesFilter — skillType facet", () => {
  it("matches when the node skillType is in the filter list", () => {
    const filters = { ...noFilters, skillType: ["macro"] };
    expect(matchesFilter(macroNode as never, "untouched", "", filters)).toBe(true);
  });

  it("returns false when the node skillType is not in the filter list", () => {
    const filters = { ...noFilters, skillType: ["micro"] };
    expect(matchesFilter(macroNode as never, "untouched", "", filters)).toBe(false);
  });

  it("matches either value in a multi-value skillType filter (OR within facet)", () => {
    const filters = { ...noFilters, skillType: ["macro", "micro"] };
    expect(matchesFilter(macroNode as never, "untouched", "", filters)).toBe(true);
    expect(matchesFilter(microNode as never, "untouched", "", filters)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// matchesFilter — AND across facets
// ---------------------------------------------------------------------------

describe("matchesFilter — AND across facets", () => {
  it("returns false when race matches but skillType does not (AND across facets)", () => {
    const filters = { ...noFilters, race: ["agnostic"], skillType: ["micro"] };
    // macroNode is agnostic (race ✓) but macro (skillType ✗)
    expect(matchesFilter(macroNode as never, "untouched", "", filters)).toBe(false);
  });

  it("returns true only when ALL active facets match", () => {
    const filters = { ...noFilters, race: ["agnostic"], skillType: ["macro"] };
    // macroNode is agnostic (✓) and macro (✓)
    expect(matchesFilter(macroNode as never, "untouched", "", filters)).toBe(true);
  });

  it("combines text search AND race facet (AND logic)", () => {
    const filters = { ...noFilters, race: ["human"] };
    // humanMacroNode title matches "Human" and race is "human" → both must match
    expect(matchesFilter(humanMacroNode as never, "untouched", "human", filters)).toBe(true);
    // macroNode does not match race filter even if text matches "supply"
    expect(matchesFilter(macroNode as never, "untouched", "supply", filters)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// matchesFilter — mastery facet
// ---------------------------------------------------------------------------

describe("matchesFilter — mastery facet", () => {
  it("matches when the supplied mastery is in the mastery filter list", () => {
    const filters = { ...noFilters, mastery: ["mastered"] };
    expect(matchesFilter(macroNode as never, "mastered", "", filters)).toBe(true);
  });

  it("returns false when the supplied mastery is not in the filter list", () => {
    const filters = { ...noFilters, mastery: ["mastered"] };
    expect(matchesFilter(macroNode as never, "untouched", "", filters)).toBe(false);
  });

  it("OR within mastery facet: matches any value in the list", () => {
    const filters = { ...noFilters, mastery: ["mastered", "in-progress"] };
    expect(matchesFilter(macroNode as never, "in-progress", "", filters)).toBe(true);
    expect(matchesFilter(macroNode as never, "mastered", "", filters)).toBe(true);
    expect(matchesFilter(macroNode as never, "untouched", "", filters)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isFilterActive
// ---------------------------------------------------------------------------

describe("isFilterActive", () => {
  it("returns false when searchQuery is empty and all facets are empty", () => {
    expect(isFilterActive("", noFilters)).toBe(false);
  });

  it("returns false for a whitespace-only searchQuery", () => {
    expect(isFilterActive("   ", noFilters)).toBe(false);
  });

  it("returns true when searchQuery is non-empty", () => {
    expect(isFilterActive("supply", noFilters)).toBe(true);
  });

  it("returns true when any facet has a selected value", () => {
    expect(isFilterActive("", { ...noFilters, race: ["agnostic"] })).toBe(true);
    expect(isFilterActive("", { ...noFilters, skillType: ["macro"] })).toBe(true);
    expect(isFilterActive("", { ...noFilters, difficulty: ["beginner"] })).toBe(true);
    expect(isFilterActive("", { ...noFilters, mastery: ["mastered"] })).toBe(true);
  });

  it("returns true when both searchQuery and a facet are active", () => {
    expect(isFilterActive("supply", { ...noFilters, race: ["agnostic"] })).toBe(true);
  });
});
