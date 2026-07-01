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
import type { MasteryState } from "#/schemas/progress";

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

  // --- Phase 5: mastery state map ---

  /**
   * Per-node mastery state map, keyed by node ID (PROG-01, D-09).
   *
   * Populated by `initMasteryMap` when the server progress query resolves;
   * updated optimistically by `setNodeMastery` on each manual mark.
   *
   * Consumers MUST subscribe via `useShallow` to avoid unnecessary re-renders
   * on hover/selection changes (Pitfall 2 from 05-RESEARCH.md):
   *
   *   const masteryMap = useGraphStore(useShallow((s) => s.masteryMap));
   *
   * Never subscribe to the full store — every hover event would re-render all
   * masteryMap consumers if the full store object is the selector output.
   */
  masteryMap: Record<string, MasteryState>;

  /**
   * Optimistically update a single node's mastery state (D-09).
   *
   * Produces a new masteryMap object with the updated entry so React can
   * detect the change via reference equality (new-object semantics, Pitfall 3
   * from 05-RESEARCH.md). Only the single subscribed node re-renders.
   *
   * @param nodeId - The node ID whose mastery state is being updated.
   * @param state  - The new mastery state.
   */
  setNodeMastery: (nodeId: string, state: MasteryState) => void;

  /**
   * Bulk-initialize the mastery map from a server response (PROG-01).
   *
   * Called by ProgressProvider when the `useQuery` for `getUserProgress` first
   * resolves, replacing the empty initial map with the full server-side record.
   *
   * @param map - Record of nodeId → MasteryState from the server fn response.
   */
  initMasteryMap: (map: Record<string, MasteryState>) => void;

  // --- Phase 6: source map (quiz vs manual vs auto label) ---

  /**
   * Per-node mastery source map, keyed by node ID (D-14).
   *
   * Parallel to `masteryMap` — populated from `progressRecords[].source` by
   * `initSourceMap` in `ProgressProvider`. Updated optimistically by
   * `setSource` after a quiz pass (via `useQuizPassMutation`).
   *
   * Consumers MUST subscribe via `useShallow` to avoid unnecessary re-renders
   * on hover/selection changes (same Pitfall 2 from 05-RESEARCH.md applies):
   *
   *   const sourceMap = useGraphStore(useShallow((s) => s.sourceMap));
   *
   * Store-only state: source MUST NOT be added to any `GraphDisplayNode`
   * projection (ADR 002 / ADR 005 / T-06-06).
   */
  sourceMap: Record<string, string>;

  /**
   * Optimistically update a single node's mastery source value (D-14).
   *
   * Produces a new `sourceMap` object with the updated entry so React can
   * detect the change via reference equality (new-object semantics, mirrors
   * `setNodeMastery` pattern from 05-RESEARCH.md Pitfall 3).
   *
   * @param nodeId - The node ID whose source is being updated.
   * @param source - The new source value ("quiz" | "manual" | "auto").
   */
  setSource: (nodeId: string, source: string) => void;

  /**
   * Bulk-initialize the source map from a server response (D-14).
   *
   * Called by `ProgressProvider` alongside `initMasteryMap` when
   * `getUserProgress` resolves, so quiz-source visuals render after refresh.
   *
   * @param map - Record of nodeId → source string from the server fn response.
   */
  initSourceMap: (map: Record<string, string>) => void;

  // --- Phase 7: transient recently-advanced highlight (D-07) ---

  /**
   * Transient set of node ids advanced by the most recent w3champions sync (D-07).
   *
   * UI-ONLY, NOT PERSISTED — drives GraphNode's one-shot Motion pulse highlight
   * so freshly auto-advanced nodes visibly announce themselves when the user
   * returns to the graph. Written by `useSyncW3championsMutation` onSuccess
   * (07-08) via `setRecentlyAdvanced`, cleared/replaced on each sync. Never
   * added to any `GraphDisplayNode` projection (ADR 002 / ADR 005).
   *
   * Consumers read membership via `.has(nodeId)` in a per-node selector
   * (`useGraphStore((s) => s.recentlyAdvancedNodeIds.has(id))`) — never
   * subscribe to the Set object itself (that would re-render all nodes on
   * every sync).
   */
  recentlyAdvancedNodeIds: ReadonlySet<string>;

  /**
   * Replace the transient recently-advanced set (D-07).
   *
   * Produces a brand-new Set so React detects the change via reference
   * equality (new-object semantics, mirrors `setSource`). Called by the sync
   * mutation's onSuccess with the ids the server just advanced; pass an empty
   * array to clear the pulse.
   *
   * @param nodeIds - Node ids advanced by the most recent sync.
   */
  setRecentlyAdvanced: (nodeIds: string[]) => void;
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

  // Phase 5: mastery state map
  masteryMap: {},

  setNodeMastery: (nodeId, state) => {
    set((s) => ({ masteryMap: { ...s.masteryMap, [nodeId]: state } }));
  },

  initMasteryMap: (map) => {
    set({ masteryMap: map });
  },

  // Phase 6: source map
  sourceMap: {},

  setSource: (nodeId, source) => {
    set((s) => ({ sourceMap: { ...s.sourceMap, [nodeId]: source } }));
  },

  initSourceMap: (map) => {
    set({ sourceMap: map });
  },

  // Phase 7: transient recently-advanced highlight
  recentlyAdvancedNodeIds: new Set<string>(),

  setRecentlyAdvanced: (nodeIds) => {
    set({ recentlyAdvancedNodeIds: new Set(nodeIds) });
  },
}));
