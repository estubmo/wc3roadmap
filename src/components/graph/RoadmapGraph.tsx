// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * RoadmapGraph — top-level interactive canvas component.
 *
 * Assembles the full @xyflow/react canvas:
 *   - Wrapped in <ClientOnly> to prevent SSR hydration mismatch (Pitfall 2,
 *     02-RESEARCH.md §Pitfall 2; T-02-13 mitigation).
 *   - nodeTypes + edgeTypes defined at MODULE SCOPE — prevents per-render
 *     remount of all nodes (Pitfall 1, T-02-14 mitigation).
 *   - Layout computed via useMemo(() => computeLayout(rawNodes, 'TB'), [rawNodes])
 *     — deterministic, synchronous dagre, stable across re-renders.
 *   - All event handlers wrapped in useCallback (GRAPH-06).
 *   - onlyRenderVisibleElements + nodesDraggable={false} from first commit.
 *
 * Guided-pathway spotlight (D-08, D-09, success criterion 3):
 *   - First load: non-pathway nodes dimmed to opacity 0.2 + pointer-events none;
 *     camera fit-framed to pathway nodes on mount via useEffect.
 *   - "Explore full map": reveals all nodes + refits to full graph.
 *   - "Back to pathway": re-applies pathway dim + refits to pathway nodes.
 *
 * Hover edge highlight:
 *   - onNodeMouseEnter calls useGraphStore.getState().setHoveredNode(id, edges)
 *   - onNodeMouseLeave clears hover via setHoveredNode(null, edges)
 *   - GraphEdge reads the per-edge boolean selector from graph-store.ts
 *
 * Prohibitions (enforced here):
 *   - NO SSR of the ReactFlow canvas — wrapped in ClientOnly.
 *   - NO inline nodeTypes/edgeTypes (module-scope consts only).
 *   - NO fitView during render — only in useEffect or event handlers.
 *   - NO window.innerWidth for mobile — handled by route CSS (plan 10).
 *   - NO detail panel — click handler is a no-op stub (Phase 3).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { ClientOnly } from "@tanstack/react-router";
import {
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Node,
  type NodeMouseHandler,
} from "@xyflow/react";
import { GraphNode } from "./GraphNode";
import { GraphEdge } from "./GraphEdge";
import { PathwayBanner } from "./PathwayBanner";
import { computeLayout } from "#/lib/graph-layout";
import { getMockMastery } from "#/lib/mock-mastery";
import { useGraphStore } from "#/lib/graph-store";
import type { GraphDisplayNode } from "#/schemas/graph";
import type { Pathway } from "#/schemas/pathway";

// ---------------------------------------------------------------------------
// Module-scope nodeTypes and edgeTypes (MANDATORY — Pitfall 1)
//
// Defining these OUTSIDE any component prevents React Flow from treating them
// as new object references on every re-render, which would unmount + remount
// all nodes (catastrophic for a 25–50 node graph). DO NOT move these inside
// any component or useCallback. (02-RESEARCH.md §Pitfall 1, T-02-14)
// ---------------------------------------------------------------------------

/** Registered custom node types — mechanic and conceptual both render GraphNode. */
const nodeTypes = {
  mechanic: GraphNode,
  conceptual: GraphNode,
} as const;

/** Registered custom edge types — all prerequisite edges render GraphEdge. */
const edgeTypes = {
  prerequisite: GraphEdge,
} as const;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

/** Props for the public RoadmapGraph export and the internal GraphCanvas. */
export interface RoadmapGraphProps {
  /** Full set of graph display nodes from the content pipeline. */
  nodes: GraphDisplayNode[];
  /** Active pathway — drives spotlight dimming and fitView on mount. */
  pathway: Pathway;
  /**
   * When `true`, the graph mounts in explore mode: all nodes are at 100%
   * opacity and the camera is fitted to the full graph rather than the
   * pathway subset. The "Back to pathway" toggle is still available.
   *
   * Defaults to `false` (guided-pathway spotlight mode).
   *
   * Use this on preview routes that need to demonstrate the full-graph or
   * mastery-state surfaces without requiring a manual "Explore full map" click.
   */
  initialExploring?: boolean;
}

// ---------------------------------------------------------------------------
// GraphCanvas — the inner client-only component
//
// This component is only rendered post-hydration inside <ClientOnly>. It reads
// from useReactFlow() (which requires ReactFlowProvider) and therefore cannot
// be exported directly — consumers must go through the <RoadmapGraph> wrapper.
// ---------------------------------------------------------------------------

function GraphCanvas({ nodes: rawNodes, pathway, initialExploring }: RoadmapGraphProps) {
  const { fitView, setNodes } = useReactFlow();

  // ------------------------------------------------------------------
  // State: whether "Explore full map" is active
  // ------------------------------------------------------------------

  const [exploring, setExploring] = useState(initialExploring ?? false);

  // ------------------------------------------------------------------
  // Derived: set of pathway node IDs (fast membership tests)
  // ------------------------------------------------------------------

  const pathwaySet = useMemo(
    () => new Set(pathway.steps),
    [pathway.steps]
  );

  // ------------------------------------------------------------------
  // Layout computation (pure dagre — synchronous, deterministic)
  //
  // useMemo with [rawNodes] dep — recomputes only when the node array
  // changes (content rebuild). Node data references stay stable within
  // a render cycle to minimise unnecessary re-renders. (GRAPH-06)
  // ------------------------------------------------------------------

  const { nodes: layoutNodes, edges } = useMemo(
    () => computeLayout(rawNodes, "TB"),
    [rawNodes]
  );

  // ------------------------------------------------------------------
  // Derived nodes with mastery state + pathway dim applied
  //
  // Keep in useMemo keyed on [layoutNodes, pathwaySet, exploring] so
  // node data references stay stable and React.memo inside GraphNode
  // short-circuits correctly (Profiler note, 02-RESEARCH.md).
  //
  // Non-pathway nodes get opacity 0.2 + pointer-events none on first
  // load. "Explore full map" lifts all nodes to opacity 1 / auto.
  // ------------------------------------------------------------------

  const displayNodes: Node[] = useMemo(() => {
    return layoutNodes.map((n) => {
      const masteryState = getMockMastery(n.id);
      const isPathwayNode = pathwaySet.has(n.id);

      // Dim non-pathway nodes when not exploring (D-08, D-09)
      const style =
        !exploring && !isPathwayNode
          ? { opacity: 0.2, pointerEvents: "none" as const }
          : { opacity: 1, pointerEvents: "auto" as const };

      return {
        ...n,
        data: { ...n.data, masteryState },
        style,
      };
    });
  }, [layoutNodes, pathwaySet, exploring]);

  // ------------------------------------------------------------------
  // On-mount fitView: scope to pathway nodes (Pitfall 3 — call in
  // useEffect, never during render; v12.5+ handles timing without hacks)
  // ------------------------------------------------------------------

  useEffect(() => {
    if (initialExploring) {
      // Explore mode: fit to ALL nodes — no pathway filter so the full graph
      // is framed and all mastery states are visible without manual interaction.
      fitView({ padding: 0.15, duration: 800 });
    } else {
      // Guided-pathway mode: fit camera to pathway steps only (D-08, D-09)
      fitView({
        nodes: pathway.steps.map((id) => ({ id })),
        padding: 0.2,
        duration: 800,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty — runs once on mount; initialExploring is an init value

  // ------------------------------------------------------------------
  // setNodes when exploring state or displayNodes change
  //
  // Call setNodes to push the updated style/data to React Flow's
  // internal node store — required when we change node style imperatively.
  // ------------------------------------------------------------------

  useEffect(() => {
    setNodes(displayNodes);
  }, [displayNodes, setNodes]);

  // ------------------------------------------------------------------
  // handleExplore: toggle explore mode + refit camera
  //
  // wrapped in useCallback so the reference is stable (GRAPH-06)
  // ------------------------------------------------------------------

  const handleExplore = useCallback(() => {
    setExploring((prev) => {
      const nextExploring = !prev;

      // Camera refit happens after state update + layout in next effect,
      // but we can queue it now — v12.5+ applies fitView after setNodes.
      if (nextExploring) {
        // Explore: fit to ALL nodes
        setTimeout(() => {
          fitView({ duration: 800, padding: 0.15 });
        }, 0);
      } else {
        // Back to pathway: fit to pathway nodes
        setTimeout(() => {
          fitView({
            nodes: pathway.steps.map((id) => ({ id })),
            padding: 0.2,
            duration: 800,
          });
        }, 0);
      }

      return nextExploring;
    });
  }, [fitView, pathway.steps]);

  // ------------------------------------------------------------------
  // Hover handlers — drive edge highlight via graph-store (Pitfall 5)
  //
  // Both wrapped in useCallback with stable [edges] dep (GRAPH-06).
  // Use getState() to avoid subscribing the canvas component itself to
  // the Zustand store (only GraphEdge components subscribe).
  // ------------------------------------------------------------------

  const handleNodeMouseEnter: NodeMouseHandler = useCallback(
    (_event, node) => {
      useGraphStore.getState().setHoveredNode(node.id, edges);
    },
    [edges]
  );

  const handleNodeMouseLeave: NodeMouseHandler = useCallback(
    (_event, _node) => {
      useGraphStore.getState().setHoveredNode(null, edges);
    },
    [edges]
  );

  // ------------------------------------------------------------------
  // onNodeClick — no-op stub for Phase 2; Phase 3 wires the detail panel
  // ------------------------------------------------------------------

  const handleNodeClick: NodeMouseHandler = useCallback(
    (_event, _node) => {
      // Phase 3: open node detail panel
    },
    []
  );

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Pathway banner — fixed overlay with pathway identity + explore CTA */}
      <PathwayBanner
        pathway={pathway}
        totalNodes={rawNodes.length}
        exploring={exploring}
        onToggleExplore={handleExplore}
      />

      {/* ReactFlow canvas — fills remaining height */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <ReactFlow
          nodes={displayNodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          nodesDraggable={false}
          onlyRenderVisibleElements
          colorMode="dark"
          minZoom={0.25}
          maxZoom={2.0}
          fitView
          fitViewOptions={
            initialExploring
              ? { padding: 0.15 }
              : { nodes: pathway.steps.map((id) => ({ id })), padding: 0.2 }
          }
          onNodeMouseEnter={handleNodeMouseEnter}
          onNodeMouseLeave={handleNodeMouseLeave}
          onNodeClick={handleNodeClick}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// RoadmapGraph — public export
//
// Wraps GraphCanvas in <ClientOnly> + <ReactFlowProvider>.
//
// <ClientOnly> prevents SSR hydration mismatch — @xyflow/react requires DOM
// measurement at mount time; the canvas must not render on the server.
// (02-RESEARCH.md §Pitfall 2, T-02-13 mitigation, PLAN must_haves Pitfall 2)
//
// <ReactFlowProvider> is required for useReactFlow() (fitView, setNodes) to
// work inside GraphCanvas. It must be an ancestor of any component that calls
// useReactFlow().
//
// Fallback: obsidian-950 placeholder div with pulse animation — matches the
// canvas background so the transition is seamless on hydration.
// ---------------------------------------------------------------------------

/**
 * Top-level interactive graph canvas component.
 *
 * Wraps the @xyflow/react canvas in <ClientOnly> + <ReactFlowProvider>.
 * Props are typed to `GraphDisplayNode[]` + `Pathway` — the ADR 002 boundary
 * ensures no NodeFrontmatter fields leak into the graph engine.
 *
 * Usage:
 * ```tsx
 * // Guided-pathway spotlight (default)
 * <RoadmapGraph nodes={graphDisplayNodes} pathway={beginnerPathway} />
 *
 * // Start in full-map / explore mode
 * <RoadmapGraph nodes={graphDisplayNodes} pathway={beginnerPathway} initialExploring />
 * ```
 */
export function RoadmapGraph(props: RoadmapGraphProps) {
  return (
    <ClientOnly
      fallback={
        <div
          style={{
            height: "calc(100dvh - 56px)",
            backgroundColor: "var(--color-obsidian-950)",
          }}
          className="animate-pulse"
        />
      }
    >
      <ReactFlowProvider>
        <GraphCanvas {...props} />
      </ReactFlowProvider>
    </ClientOnly>
  );
}
