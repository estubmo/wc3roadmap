// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * Pure node-filter utilities for the graph filter layer (GRAPH-04, D-10).
 *
 * Deep module: two exports (`matchesFilter`, `isFilterActive`) with a small
 * interface hiding the AND-across/OR-within filter algorithm — callers receive
 * a boolean with no internal state exposed.
 *
 * Pure functions: no DOM access, no React, no Zustand state reads, no side
 * effects. All inputs are passed explicitly so these functions are trivially
 * unit-testable without mocks.
 *
 * Filter semantics (D-10):
 *   - Free-text: case-insensitive substring match on `title` OR any `tags`
 *     entry (OR between fields; AND with facets).
 *   - Facets (race, skillType, difficulty, mastery): AND across facets, OR
 *     within a facet. A non-empty facet array matches if it includes the
 *     node's value for that facet; an empty array means "no filter on this
 *     facet" and always passes.
 *   - Search query is matched after trim; whitespace-only query is treated as
 *     inactive (same as empty string).
 *
 * Security note (T-3-05): the search query is consumed only in
 * `String.toLowerCase().includes()` comparisons and is never rendered as HTML
 * — safe by construction, no sanitization required.
 *
 * Sources: 03-RESEARCH.md §Q7; GRAPH-04 requirement.
 */

import type { GraphDisplayNode } from "#/schemas/graph";
import type { MasteryState } from "#/lib/mock-mastery";
import type { ActiveFilters } from "#/lib/graph-store";

// ---------------------------------------------------------------------------
// matchesFilter
// ---------------------------------------------------------------------------

/**
 * Returns true when `node` passes all active filter conditions.
 *
 * Conditions evaluated (all must pass — AND semantics across conditions):
 *   1. If `searchQuery` is non-empty after trim, the lowercased query must
 *      appear as a substring of `node.title` OR at least one entry in
 *      `node.tags` (OR within the text match).
 *   2. If `filters.race` is non-empty, `node.race` must be in the array.
 *   3. If `filters.skillType` is non-empty, `node.skillType` must be in the array.
 *   4. If `filters.difficulty` is non-empty, `node.difficulty` must be in the array.
 *   5. If `filters.mastery` is non-empty, the supplied `mastery` arg must be
 *      in the array (mastery state comes from the caller, e.g. getMockMastery).
 *
 * When no filters are active (`isFilterActive` returns false), every node
 * matches — callers may short-circuit with `isFilterActive` to skip iteration.
 *
 * @param node        - Graph display node to test.
 * @param mastery     - Current mastery state for this node (from mock or DB).
 * @param searchQuery - Free-text query string (may be empty).
 * @param filters     - Active facet filters (empty arrays = no filter).
 * @returns true if the node satisfies all active filter conditions.
 */
export function matchesFilter(
  node: GraphDisplayNode,
  mastery: MasteryState,
  searchQuery: string,
  filters: ActiveFilters,
): boolean {
  // --- Free-text search (D-10: title + tags, OR between them) ---
  const trimmedQuery = searchQuery.trim();
  if (trimmedQuery.length > 0) {
    const q = trimmedQuery.toLowerCase();
    const matchesTitle = node.title.toLowerCase().includes(q);
    const matchesTags = node.tags.some((tag) => tag.toLowerCase().includes(q));
    if (!matchesTitle && !matchesTags) return false;
  }

  // --- Facets: AND across, OR within (D-10) ---
  if (filters.race.length > 0 && !filters.race.includes(node.race)) return false;
  if (filters.skillType.length > 0 && !filters.skillType.includes(node.skillType)) return false;
  if (filters.difficulty.length > 0 && !filters.difficulty.includes(node.difficulty)) return false;
  if (filters.mastery.length > 0 && !filters.mastery.includes(mastery)) return false;

  return true;
}

// ---------------------------------------------------------------------------
// isFilterActive
// ---------------------------------------------------------------------------

/**
 * Returns true when any filter condition is currently active.
 *
 * A filter is active when:
 *   - `searchQuery` has at least one non-whitespace character, OR
 *   - at least one facet array in `filters` is non-empty.
 *
 * Used by callers to short-circuit expensive map/filter operations when no
 * filtering is needed (every node passes when no filters are active).
 *
 * @param searchQuery - Free-text query string.
 * @param filters     - Active facet filters.
 * @returns true if any filter is active.
 */
export function isFilterActive(searchQuery: string, filters: ActiveFilters): boolean {
  return (
    searchQuery.trim().length > 0 ||
    Object.values(filters).some((v) => v.length > 0)
  );
}
