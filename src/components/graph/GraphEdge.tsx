// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * GraphEdge — memoized animated custom edge for the WC3 Roadmap graph.
 *
 * Renders a directed bezier curve between two nodes. When the hovered node's
 * prerequisite chain includes this edge, the stroke animates to rune-400 with
 * a spring transition. At rest the stroke is obsidian-700 at 50% opacity.
 *
 * Design contract (02-UI-SPEC.md §Edge Visual Language, D-03, F-01):
 *   - At rest:  --color-obsidian-700, 1px, 50% opacity
 *   - Highlighted: --color-rune-400, 3px, 100% opacity
 *   - Highlight is stroke-only — no glow (preserves three-gold hierarchy, F-01)
 *
 * Animation contract (02-UI-SPEC.md §Animation Contract):
 *   - Enter (highlighted): spring { stiffness: 300, damping: 30 }
 *   - Exit  (rest):        duration 0.2
 *
 * Memoization (GRAPH-06):
 *   - React.memo wraps the component — named inner function for DevTools
 *   - Per-edge boolean selector `s.ancestorEdgeIds.has(id)` — only the
 *     affected edge re-renders when hover changes (02-RESEARCH.md Pitfall 5,
 *     T-02-12 threat mitigation)
 *
 * Edge path geometry: getBezierPath from @xyflow/react (not hand-rolled —
 * handles curvature, handle offsets, and port positions).
 *
 * SVG stroke animation: motion.path from motion/react (not pure CSS —
 * CSS cannot animate SVG stroke reliably cross-browser, 02-RESEARCH.md
 * §Anti-Patterns).
 */

import { memo } from "react";
import { getBezierPath } from "@xyflow/react";
import type { EdgeProps } from "@xyflow/react";
import { motion } from "motion/react";
import { useGraphStore } from "#/lib/graph-store";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Custom prerequisite-chain edge.
 *
 * Registered in `edgeTypes` as `'prerequisite'` (plan 09 — RoadmapGraph
 * canvas assembles the edgeTypes const at module scope and passes it to
 * ReactFlow to avoid per-render object recreation, Pitfall 1).
 *
 * The `useGraphStore` selector is a per-edge boolean — callers MUST NOT
 * broaden this to `(s) => s.ancestorEdgeIds` or all edges will re-render on
 * every hover (Pitfall 5).
 */
export const GraphEdge = memo(function GraphEdge(props: EdgeProps) {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  } = props;

  // Per-edge boolean selector — only this edge re-renders when its own
  // highlight status changes (Pitfall 5). DO NOT subscribe to the Set itself.
  const isHighlighted = useGraphStore((s) => s.ancestorEdgeIds.has(id));

  // getBezierPath handles curvature and port-position offsets correctly.
  // Returns [pathString, labelX, labelY, offsetX, offsetY] — we only need [0].
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  return (
    <motion.path
      d={edgePath}
      fill="none"
      animate={{
        stroke: isHighlighted
          ? "var(--color-rune-400)"
          : "var(--color-obsidian-700)",
        strokeWidth: isHighlighted ? 3 : 1,
        opacity: isHighlighted ? 1 : 0.5,
      }}
      transition={
        isHighlighted
          ? { type: "spring", stiffness: 300, damping: 30 }
          : { duration: 0.2 }
      }
    />
  );
});
