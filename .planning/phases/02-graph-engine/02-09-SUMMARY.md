---
phase: 02-graph-engine
plan: 09
subsystem: graph
status: complete
tags: [reactflow, canvas, clientonly, memoization, pathway-spotlight, fitview]
created: 2026-06-29
duration: 3m
tasks_completed: 2
files_created: 1
files_modified: 0

dependency_graph:
  requires:
    - 02-04  # computeLayout (graph-layout.ts)
    - 02-06  # GraphNode, GraphEdge, MasteryBadge
    - 02-08  # graph-store, GraphEdge (edge highlight)
  provides:
    - RoadmapGraph  # assembled canvas for plan 10 route integration
  affects:
    - 02-10  # preview routes and graph route consume RoadmapGraph

tech_stack:
  added: []
  patterns:
    - ClientOnly from @tanstack/react-router (ReactNode children, not render prop)
    - useMemo for dagre layout + node data derivation
    - useEffect for on-mount fitView scoped to pathway nodes
    - setNodes to push derived display nodes into ReactFlow internal store
    - setTimeout 0 to queue fitView after exploring state toggle

key_files:
  created:
    - src/components/graph/RoadmapGraph.tsx
  modified: []

decisions:
  - ClientOnly children is ReactNode (not render prop) in @tanstack/react-router@1.170.16 — adjusted from RESEARCH.md example
  - Tasks 1 and 2 committed together (same file, single implementation pass) — noted as deviation below
  - setNodes called in useEffect on displayNodes change to push derived node styles into ReactFlow store
  - setTimeout 0 used to queue fitView after setExploring — v12.5+ handles timing but exploring state update is async
---

# Phase 02 Plan 09: RoadmapGraph Assembly Summary

**One-liner:** Client-only ReactFlow canvas with module-scope nodeTypes/edgeTypes, dagre layout via useMemo, guided-pathway spotlight with opacity-dim + fitView, and "Explore full map" toggle.

## What Was Built

Created `src/components/graph/RoadmapGraph.tsx` — the assembled interactive canvas component.

### Key implementation decisions

**Module-scope nodeTypes/edgeTypes (Pitfall 1 / T-02-14):**
Both `const nodeTypes = { mechanic: GraphNode, conceptual: GraphNode }` and `const edgeTypes = { prerequisite: GraphEdge }` are defined before any component function. React Flow uses referential equality on these objects — inline definitions would unmount and remount all nodes on every parent render.

**ClientOnly API discovery:** The installed `@tanstack/react-router@1.170.16` ships `ClientOnly` with `children: ReactNode` (not a render prop). RESEARCH.md showed `{() => <GraphCanvas />}` syntax but the actual implementation wraps `ReactFlowProvider + GraphCanvas` directly as React children.

**Layout derivation chain (all memoized):**
1. `computeLayout(rawNodes, 'TB')` → `{ layoutNodes, edges }` memoized on `[rawNodes]`
2. `displayNodes` derived from `layoutNodes` with masteryState injected via `getMockMastery` and pathway dim style applied — memoized on `[layoutNodes, pathwaySet, exploring]`
3. `setNodes(displayNodes)` called in a separate `useEffect` to push derived nodes into ReactFlow's internal store

**On-mount fitView (Pitfall 3):** Called inside `useEffect([], [])` — never during render. Scoped to `pathway.steps.map(id => ({ id }))` with padding 0.2 and duration 800.

**Explore toggle:** `handleExplore` wrapped in `useCallback([fitView, pathway.steps])`. Uses `setExploring(prev => !prev)` with a `setTimeout(0)` to queue the `fitView` call after the state update propagates.

**Hover edge highlight:** `onNodeMouseEnter` and `onNodeMouseLeave` call `useGraphStore.getState().setHoveredNode(nodeId, edges)` — read via `getState()` so the canvas component itself does not subscribe to the Zustand store (only GraphEdge components subscribe via per-edge boolean selectors).

**onNodeClick:** Intentional no-op stub — Phase 3 wires the detail panel.

## Acceptance Criteria Verification

- typecheck + build: PASS
- `grep -n "ClientOnly"` confirms canvas is client-only: lines 8, 29, 37, 288, 290, 305, 316, 330
- nodeTypes and edgeTypes at module scope: lines 64–74 (before any function)
- `nodesDraggable={false}` and `onlyRenderVisibleElements`: lines 266–267
- All handlers in `useCallback`: handleExplore (186), handleNodeMouseEnter (220), handleNodeMouseLeave (227), handleNodeClick (238)
- `grep -n "useMemo"` confirms memoized layout on [rawNodes]: lines 107, 120, 136
- On-mount fitView scoped to pathway.steps: useEffect at line 160
- handleExplore toggles exploring and refits camera: lines 186–210
- PathwayBanner rendered with exploring + onToggleExplore: lines 252–257

## Deviations from Plan

### Auto-adjusted: ClientOnly API (Rule 3 - Blocking)

**Found during:** Task 1 implementation
**Issue:** RESEARCH.md documented `{() => <GraphCanvas />}` (render prop pattern) for `<ClientOnly>`. The installed `@tanstack/react-router@1.170.16` types `children` as `ReactNode` — TypeScript error TS2322 on the render function.
**Fix:** Changed to direct children: `<ClientOnly><ReactFlowProvider><GraphCanvas /></ReactFlowProvider></ClientOnly>`
**Files modified:** src/components/graph/RoadmapGraph.tsx
**Commit:** 6fd9378

### Single commit for Tasks 1 and 2

**Context:** Both tasks target the same file. The full implementation (including Task 2's exploring state, fitView, PathwayBanner) was authored in a single pass covering both task actions.
**Impact:** One commit (6fd9378) satisfies the acceptance criteria for both tasks. No behavior difference — the plan says "Extend RoadmapGraph (same file)" for Task 2.

## Known Stubs

- `handleNodeClick` is an intentional no-op stub (Phase 3 wires the detail panel). Documented in code comment. Does not prevent the plan's goals from being achieved.

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes at trust boundaries. The canvas component is purely client-side rendering of pre-validated props.

T-02-13 (hydration mismatch / DoS) — mitigated by `<ClientOnly>` wrapper.
T-02-14 (re-render storm from inline nodeTypes) — mitigated by module-scope consts.

## Self-Check: PASSED

- src/components/graph/RoadmapGraph.tsx: FOUND
- commit 6fd9378: FOUND
