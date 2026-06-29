// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * DAG layout computation for the WC3 Roadmap node graph.
 *
 * Deep module: one export (`computeLayout`) with a simple signature hides the
 * full dagre rank assignment, crossing minimisation, and coordinate centering
 * — callers supply a node array and receive React Flow–ready Node[] + Edge[].
 *
 * Pure function: no DOM access, no React, no side effects. Safe to call in
 * `useMemo` (GRAPH-06) and in the vitest node environment.
 *
 * Edge direction: prereq → dependent (`g.setEdge(prereqId, n.id)`), so arrows
 * point at the dependent node and fundamentals sit at the top (D-02, Pitfall 7).
 *
 * Source: reactflow.dev/examples/layout/dagre (Pattern 1 in 02-RESEARCH.md)
 */

import { Graph, layout } from "@dagrejs/dagre";
import type { Node, Edge } from "@xyflow/react";
import type { GraphDisplayNode } from "../schemas/graph";

// ---------------------------------------------------------------------------
// Constants — match the UI-SPEC node face dimensions (02-UI-SPEC.md)
// ---------------------------------------------------------------------------

const NODE_WIDTH = 160;
const NODE_HEIGHT = 80;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compute a layered top-to-bottom layout from a `GraphDisplayNode[]` DAG.
 *
 * Positions are auto-derived from `prerequisites[]` — no hand-authored
 * coordinates required (D-01). Fundamentals (roots) land at the top; advanced
 * nodes that depend on them are pushed down with increasing y (D-02).
 *
 * @param nodes     - The full node array. Each node's `prerequisites` field
 *                    defines the DAG edges.
 * @param direction - Layout direction. `'TB'` (top-to-bottom, default) or
 *                    `'LR'` (left-to-right). Use `'TB'` for the main canvas.
 * @returns `{ nodes, edges }` — React Flow–ready arrays. Node positions are
 *          centred (`x - NODE_WIDTH/2`, `y - NODE_HEIGHT/2`) so position
 *          represents the top-left corner, matching React Flow convention.
 */
export function computeLayout(
  nodes: GraphDisplayNode[],
  direction: "TB" | "LR" = "TB"
): { nodes: Node[]; edges: Edge[] } {
  const g = new Graph().setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: direction, ranksep: 80, nodesep: 40 });

  // Register every node so dagre knows its dimensions.
  for (const n of nodes) {
    g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }

  // Build edges: prereq → dependent (arrows point at the dependent node).
  // Collect React Flow Edge objects in parallel — single pass to avoid
  // iterating nodes twice.
  const edges: Edge[] = [];
  for (const n of nodes) {
    for (const prereqId of n.prerequisites) {
      g.setEdge(prereqId, n.id);
      edges.push({
        id: `${prereqId}->${n.id}`,
        source: prereqId,
        target: n.id,
        type: "prerequisite",
      });
    }
  }

  // Run the layered layout algorithm — mutates node positions in `g`.
  layout(g);

  // Map to React Flow Node[], centering positions (dagre returns centre
  // coordinates; React Flow expects top-left corner).
  const layoutedNodes: Node[] = nodes.map((n) => {
    const { x, y } = g.node(n.id);
    return {
      id: n.id,
      type: n.nodeType === "MECHANIC" ? "mechanic" : "conceptual",
      position: { x: x - NODE_WIDTH / 2, y: y - NODE_HEIGHT / 2 },
      data: { ...n },
    };
  });

  return { nodes: layoutedNodes, edges };
}
