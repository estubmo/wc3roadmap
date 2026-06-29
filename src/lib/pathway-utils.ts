// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * Pathway edge-highlight utility for the WC3 Roadmap graph.
 *
 * Deep module: one export (`computeAncestorEdgeIds`) with a small interface
 * hiding the BFS traversal — callers receive a `Set<string>` consumed via
 * `.has(edgeId)` inside the custom edge component (Pitfall 5, D-03).
 *
 * Pure function: no DOM access, no React, no side effects. Safe to call in
 * the Zustand `setHoveredNode` action and in the vitest node environment.
 *
 * Visited-set guard prevents infinite loops on diamond DAGs and hypothetical
 * cycles (T-02-06). The corpus is CI-verified acyclic, but the guard is
 * cheap and correct to include.
 *
 * Source: 02-RESEARCH.md §Pattern 5 — computeAncestorEdgeIds
 */

import type { Edge } from "@xyflow/react";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compute the set of edge IDs on the full transitive prerequisite chain of
 * a given node (the "ancestor chain").
 *
 * BFS upward from `nodeId`: for each edge whose `target === current`, collect
 * its `id` and enqueue its `source` for the next iteration. A visited set
 * prevents revisiting nodes in diamond shapes or cycles.
 *
 * The returned Set drives the `motion.path` highlight in `GraphEdge` (D-03)
 * via a per-edge selector: `s.ancestorEdgeIds.has(edgeId)`.
 *
 * @param nodeId - The node whose ancestor chain to compute.
 * @param edges  - The full React Flow Edge[] from `computeLayout`.
 * @returns `Set<string>` of edge IDs on the ancestor chain. Empty if `nodeId`
 *          is a root node, is unknown, or if `edges` is empty.
 */
export function computeAncestorEdgeIds(
  nodeId: string,
  edges: Edge[]
): Set<string> {
  const ancestorEdgeIds = new Set<string>();
  const visited = new Set<string>();
  const queue: string[] = [nodeId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);

    // Find all incoming edges (target === current) and walk upward.
    for (const edge of edges) {
      if (edge.target === current) {
        ancestorEdgeIds.add(edge.id);
        if (!visited.has(edge.source)) {
          queue.push(edge.source);
        }
      }
    }
  }

  return ancestorEdgeIds;
}
