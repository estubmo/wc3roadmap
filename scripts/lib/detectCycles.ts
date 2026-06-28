// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * DAG cycle detection for the WC3 node prerequisite graph.
 *
 * Deep module: small interface (one export) hiding the DFS 3-color algorithm.
 * Callers receive a flat array of error strings — no exceptions thrown.
 * The orchestrator (scripts/validate-content.ts) aggregates all errors before exiting.
 *
 * Algorithm: DFS with 3-color marking (WHITE / GRAY / BLACK).
 *   WHITE — not yet visited.
 *   GRAY  — currently on the DFS stack (in-progress ancestor).
 *   BLACK — fully explored; all descendants confirmed acyclic.
 * A back edge (GRAY node encountered during traversal) indicates a cycle.
 */

/** Minimal node shape required by the cycle detector. */
interface NodeWithPrereqs {
  readonly id: string;
  readonly prerequisites: readonly string[];
}

type Color = "WHITE" | "GRAY" | "BLACK";

/**
 * Detect cycles in the directed prerequisite graph.
 *
 * @param nodes - All nodes in the corpus. Nodes with prerequisites that are
 *                not in this set are NOT treated as cycles (that is the job
 *                of validatePrerequisiteIds). detectCycles skips edges to
 *                unknown nodes.
 * @returns An array of human-readable error strings, one per cycle detected.
 *          Returns [] when the graph is acyclic.
 */
export function detectCycles(nodes: readonly NodeWithPrereqs[]): string[] {
  const nodeMap = new Map<string, NodeWithPrereqs>();
  for (const node of nodes) {
    nodeMap.set(node.id, node);
  }

  const color = new Map<string, Color>();
  for (const node of nodes) {
    color.set(node.id, "WHITE");
  }

  const errors: string[] = [];

  function dfs(id: string, path: string[]): void {
    const c = color.get(id);
    if (c === "BLACK") return; // Already fully explored — no cycle through here.
    if (c === "GRAY") {
      // Back edge: found a node already on the current DFS stack → cycle.
      const cycleStart = path.indexOf(id);
      const cyclePath = [...path.slice(cycleStart), id].join(" → ");
      errors.push(`Cycle detected in prerequisites: ${cyclePath}`);
      return;
    }

    // c === "WHITE" (or undefined for nodes referenced but not in the set — skip)
    if (c === undefined) return;

    color.set(id, "GRAY");
    const node = nodeMap.get(id);
    if (node) {
      for (const prereqId of node.prerequisites) {
        dfs(prereqId, [...path, id]);
      }
    }
    color.set(id, "BLACK");
  }

  for (const node of nodes) {
    if (color.get(node.id) === "WHITE") {
      dfs(node.id, []);
    }
  }

  return errors;
}
