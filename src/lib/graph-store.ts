// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * Zustand store for graph UI state — hover/highlight, panel selection, and filter.
 *
 * SEPARATE store from React Flow's internal Zustand store — this module
 * never imports from `@xyflow/react`'s internal store, never calls
 * `useStore` from React Flow, and never mutates React Flow's edge or node
 * state. Keeping UI state in a dedicated store prevents coupling to
 * React Flow internals and limits re-renders to the edge components that
 * subscribe (Pitfall 5 from 02-RESEARCH.md §Common Pitfalls).
 *
 * Shape:
 *   - `hoveredNodeId` — the node currently hovered (null at rest).
 *   - `ancestorEdgeIds` — precomputed Set of edge IDs on the full transitive
 *     prerequisite chain of `hoveredNodeId`. Consumed via `.has(edgeId)` in
 *     `GraphEdge` — a per-edge boolean selector so only affected edges
 *     re-render (02-RESEARCH.md §Pitfall 5, T-02-12 threat mitigation).
 *   - `selectedNodeId` — node open in the detail panel (null when panel closed).
 *   - `searchQuery` — free-text filter string (D-10).
 *   - `activeFilters` — facet filter state for race/skillType/difficulty/mastery (D-10).
 *
 * Usage:
 *   // In GraphEdge (per-edge boolean selector — DO NOT subscribe to the Set itself):
 *   const isHighlighted = useGraphStore((s) => s.ancestorEdgeIds.has(id));
 *
 *   // In canvas hover handler (e.g. RoadmapGraph onNodeMouseEnter):
 *   useGraphStore.getState().setHoveredNode(nodeId, edges);
 *
 *   // In canvas click handler (opens detail panel):
 *   useGraphStore.getState().setSelectedNode(nodeId);
 *
 *   // In FilterBar (updates filter state):
 *   useGraphStore.getState().setSearchQuery(q);
 *   useGraphStore.getState().setFilter("race", ["human", "orc"]);
 *
 * Source: 02-RESEARCH.md §Pattern 5; 03-RESEARCH.md §Q7
 */

import { create } from "zustand";
import type { Edge } from "@xyflow/react";
import { computeAncestorEdgeIds } from "./pathway-utils";

// ---------------------------------------------------------------------------
// Filter state types
// ---------------------------------------------------------------------------

/**
 * Active filter facets for the graph filter layer (GRAPH-04, D-10).
 *
 * AND semantics across facets: a node must satisfy ALL non-empty facets.
 * OR semantics within a facet: a non-empty facet array matches if it includes
 * the node's value for that facet.
 *
 * Imported by `src/lib/filter-utils.ts` — keep this a type-only export.
 */
export interface ActiveFilters {
  /** Race filter (e.g. ["agnostic", "human"]). Empty = no race filter. */
  race: string[];
  /** Skill-type filter (e.g. ["macro", "micro"]). Empty = no skill-type filter. */
  skillType: string[];
  /** Difficulty filter (e.g. ["beginner"]). Empty = no difficulty filter. */
  difficulty: string[];
  /** Mastery filter (e.g. ["mastered", "in-progress"]). Empty = no mastery filter. */
  mastery: string[];
}

// ---------------------------------------------------------------------------
// Store interface
// ---------------------------------------------------------------------------

export interface GraphStore {
  // --- Phase 2: hover/highlight state ---

  /** The node currently being hovered; null when no node is hovered. */
  hoveredNodeId: string | null;

  /**
   * Precomputed set of edge IDs on the full ancestor chain of `hoveredNodeId`.
   * Empty when `hoveredNodeId` is null or the node has no prerequisites.
   *
   * Consumers MUST read via `.has(edgeId)` — never subscribe to the Set object
   * itself (that would cause all edges to re-render on every hover change).
   */
  ancestorEdgeIds: Set<string>;

  /**
   * Set the hovered node and recompute the ancestor edge chain.
   *
   * @param nodeId - The hovered node's ID, or null to clear the highlight.
   * @param edges  - The current React Flow Edge[] (from computeLayout).
   */
  setHoveredNode: (nodeId: string | null, edges: Edge[]) => void;

  // --- Phase 3: panel selection state ---

  /**
   * The node currently open in the detail panel; null when panel is closed.
   * Set by clicking a node in the graph canvas (D-02 live-inspector pattern).
   */
  selectedNodeId: string | null;

  /**
   * Open or close the detail panel for a node.
   *
   * @param id - Node ID to open, or null to close the panel.
   */
  setSelectedNode: (id: string | null) => void;

  // --- Phase 3: filter state ---

  /**
   * Free-text search query (D-10). Matched case-insensitively against
   * node title and tags. Empty string means no text filter active.
   */
  searchQuery: string;

  /**
   * Active facet filters (D-10). Each facet uses OR-within semantics;
   * AND semantics apply across non-empty facets. Empty arrays = no filter.
   */
  activeFilters: ActiveFilters;

  /**
   * Update the free-text search query.
   *
   * @param q - New query string (may be empty to clear).
   */
  setSearchQuery: (q: string) => void;

  /**
   * Replace one filter facet's selected values.
   *
   * @param facet  - The facet key to update.
   * @param values - New values array (empty array clears the facet).
   */
  setFilter: (facet: keyof ActiveFilters, values: string[]) => void;

  /**
   * Clear the search query and all facet filters in one action.
   */
  clearFilters: () => void;
}

// ---------------------------------------------------------------------------
// Store implementation
// ---------------------------------------------------------------------------

const EMPTY_FILTERS: ActiveFilters = {
  race: [],
  skillType: [],
  difficulty: [],
  mastery: [],
};

export const useGraphStore = create<GraphStore>((set) => ({
  // Phase 2: hover/highlight
  hoveredNodeId: null,
  ancestorEdgeIds: new Set<string>(),

  setHoveredNode: (nodeId, edges) => {
    if (nodeId === null) {
      set({ hoveredNodeId: null, ancestorEdgeIds: new Set<string>() });
      return;
    }

    const ancestorEdgeIds = computeAncestorEdgeIds(nodeId, edges);
    set({ hoveredNodeId: nodeId, ancestorEdgeIds });
  },

  // Phase 3: panel selection
  selectedNodeId: null,

  setSelectedNode: (id) => {
    set({ selectedNodeId: id });
  },

  // Phase 3: filter state
  searchQuery: "",
  activeFilters: { ...EMPTY_FILTERS },

  setSearchQuery: (q) => {
    set({ searchQuery: q });
  },

  setFilter: (facet, values) => {
    set((state) => ({
      activeFilters: { ...state.activeFilters, [facet]: values },
    }));
  },

  clearFilters: () => {
    set({ searchQuery: "", activeFilters: { ...EMPTY_FILTERS } });
  },
}));
