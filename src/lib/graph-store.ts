// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * Zustand store for graph hover/highlight state.
 *
 * SEPARATE store from React Flow's internal Zustand store — this module
 * never imports from `@xyflow/react`'s internal store, never calls
 * `useStore` from React Flow, and never mutates React Flow's edge or node
 * state. Keeping hover state in a dedicated store prevents coupling to
 * React Flow internals and limits re-renders to the edge components that
 * subscribe (Pitfall 5 from 02-RESEARCH.md §Common Pitfalls).
 *
 * Shape:
 *   - `hoveredNodeId` — the node currently hovered (null at rest).
 *   - `ancestorEdgeIds` — precomputed Set of edge IDs on the full transitive
 *     prerequisite chain of `hoveredNodeId`. Consumed via `.has(edgeId)` in
 *     `GraphEdge` — a per-edge boolean selector so only affected edges
 *     re-render (02-RESEARCH.md §Pitfall 5, T-02-12 threat mitigation).
 *
 * Usage:
 *   // In GraphEdge (per-edge boolean selector — DO NOT subscribe to the Set itself):
 *   const isHighlighted = useGraphStore((s) => s.ancestorEdgeIds.has(id));
 *
 *   // In canvas hover handler (e.g. RoadmapGraph onNodeMouseEnter):
 *   useGraphStore.getState().setHoveredNode(nodeId, edges);
 *
 * Source: 02-RESEARCH.md §Pattern 5 — Zustand Store for Edge Highlight State
 */

import { create } from "zustand";
import type { Edge } from "@xyflow/react";
import { computeAncestorEdgeIds } from "./pathway-utils";

// ---------------------------------------------------------------------------
// Store interface
// ---------------------------------------------------------------------------

export interface GraphStore {
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
}

// ---------------------------------------------------------------------------
// Store implementation
// ---------------------------------------------------------------------------

export const useGraphStore = create<GraphStore>((set) => ({
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
}));
