---
phase: 02-graph-engine
plan: 10
subsystem: graph
status: checkpoint-pending
tags: [index-route, loader, responsive, preview-routes, css-responsive-switch, graphdisplaynode-projection]
created: 2026-06-29
duration: 8min
tasks_completed: 2
tasks_pending_human: 1
files_created: 4
files_modified: 1

dependency_graph:
  requires:
    - 02-05  # PathwaySchema + pathway JSON (beginner-fundamentals.json)
    - 02-07  # MobileNodeList + PathwayBanner
    - 02-09  # RoadmapGraph assembled canvas
  provides:
    - index route loader (nodes + pathway)
    - four /preview acceptance routes (visual acceptance surfaces)
  affects:
    - phase 03  # node detail panel wires into index route

tech_stack:
  added: []
  patterns:
    - TanStack Start loader in createFileRoute (projects allNodes → GraphDisplayNode[])
    - Static JSON import via Vite (pathway bundled at build time, works SSR + client)
    - CSS-only responsive switch (hidden md:block / block md:hidden — Pitfall 4 / GRAPH-05)
    - 56px SSR-safe app control bar at route level
    - Preview routes as isolated acceptance surfaces (no loader, inline projection)

key_files:
  created:
    - src/routes/preview/pathway.tsx
    - src/routes/preview/mastery-states.tsx
    - src/routes/preview/full-map.tsx
    - src/routes/preview/mobile.tsx
  modified:
    - src/routes/index.tsx

decisions:
  - Static JSON import for pathway (import pathwayRaw from '../../pathways/beginner-fundamentals.json') used instead of readFileSync — works in both SSR and client-side navigation contexts; Vite bundles at build time
  - 56px route-level app control bar ("WC3 Roadmap") separate from PathwayBanner inside RoadmapGraph — provides structural SSR element for calc(100dvh - 56px) canvas height
  - Preview routes use inline projection (no shared helper) — each route is self-contained; 4×7 lines duplication is acceptable for dev-only surfaces
  - /preview/mobile uses max-width: 390px centered container (iPhone 14 Pro) — simulates mobile at any browser width without requiring viewport resize
  - PathwaySchema.safeParse used in loader and all preview routes → empty-state fallback on validation failure (T-02-16 mitigation)
---

# Phase 02 Plan 10: Graph Wiring + Preview Routes Summary

**One-liner:** Index route loader projects allNodes to GraphDisplayNode[] + loads PathwaySchema-validated pathway; CSS-only responsive switch renders desktop canvas and mobile list; four /preview routes provide isolated visual acceptance surfaces.

## What Was Built

### Task 1: Index route loader + responsive desktop/mobile render

Extended `src/routes/index.tsx` with:

**Loader:** Imports `allNodes` from content-collections, maps each node to the `GraphDisplayNode` projection (id, title, nodeType, race, prerequisites, difficulty — no citations/patch_context/body per ADR 002/005). Validates each via `GraphDisplayNodeSchema.safeParse`. Imports `pathways/beginner-fundamentals.json` as a static Vite module and validates via `PathwaySchema.safeParse` (T-02-16: invalid JSON → null pathway → empty-state fallback).

**Component:** Renders a 56px app control bar ("WC3 Roadmap" identity) + `<div className="hidden md:block" style={{ height: "calc(100dvh - 56px)" }}>` containing RoadmapGraph + `<div className="block md:hidden">` containing MobileNodeList. Both wrappers are SSR-rendered; Tailwind CSS hides the inappropriate one.

### Task 2: Four /preview acceptance routes

Created four routes in `src/routes/preview/`:

| Route | Surface | Key Demonstration |
|-------|---------|-------------------|
| `/preview/pathway` | Guided-pathway default | Non-pathway nodes dimmed 20%; camera fit to pathway steps; PathwayBanner + "Explore full map" |
| `/preview/mastery-states` | Three mastery states | Mastered/in-progress/untouched nodes via getMockMastery; MECHANIC+CONCEPTUAL shapes; edge highlight on hover |
| `/preview/full-map` | Full map + Profiler check | Click "Explore full map" → all nodes 100% opacity; pan/zoom/click for <3 re-render verification |
| `/preview/mobile` | Mobile node-card list | MobileNodeList in 390px container; "Your Pathway" + "All Nodes" sections; all three mastery states |

All four routes pass `generate-routes + typecheck + build`.

## Acceptance Criteria Verification

### Task 1
- generate-routes: PASS
- build:content: PASS
- typecheck: PASS
- build: PASS
- Loader returns GraphDisplayNode[] (projection only — `grep "citations\|patch_context\|body" src/routes/index.tsx` returns nothing in code)
- `hidden md:block` desktop wrapper at line 158; `block md:hidden` mobile wrapper at line 166
- `grep -nE "innerWidth|window\." src/routes/index.tsx` → no code matches (only comment)

### Task 2
- generate-routes: PASS (all 4 routes in routeTree.gen.ts lines 13–16)
- typecheck: PASS
- build: PASS
- Each route renders its target surface per UI-SPEC Preview Artifacts checklist
- All three mastery states and both node shapes covered across previews

## Deviations from Plan

### Auto-adjusted: static JSON import instead of readFileSync

**Found during:** Task 1 implementation
**Issue:** The plan action says "reads + JSON.parses pathways/beginner-fundamentals.json". In TanStack Start, route loaders run on both the server (SSR) and the client (for navigation). `readFileSync` from `node:fs` only works in Node.js — it would crash on client-side navigation to `/`.
**Fix:** Used `import pathwayRaw from "../../pathways/beginner-fundamentals.json"` — Vite bundles JSON imports at build time, making the data available in all contexts (SSR + client). The T-02-16 mitigation (`PathwaySchema.safeParse` for crash protection) is preserved.
**Files modified:** src/routes/index.tsx (+ all 4 preview routes)

## Pending: Task 3 (Human Visual Verification)

Task 3 is a `checkpoint:human-verify` gate. Implementation tasks 1 and 2 are committed. Human verification is awaited.

**How to verify:** Run `npm run dev` and visit the four preview routes at http://localhost:3000.

## Known Stubs

None that block the plan's goals. The `handleNodeClick` no-op in RoadmapGraph is an intentional Phase 2 stub (Phase 3 wires the detail panel) — carried from plan 09.

## Threat Surface Scan

No new network endpoints, auth paths, or schema changes at trust boundaries.
- T-02-15 (information disclosure: content fields leaking): Loader projection to GraphDisplayNode[] confirmed — no citations/patch_context/body in loader return or preview route data.
- T-02-16 (malformed pathway JSON): PathwaySchema.safeParse with empty-state fallback in all five render paths (index + 4 previews).

## Self-Check: PASSED

- src/routes/index.tsx: FOUND (modified)
- src/routes/preview/pathway.tsx: FOUND (created)
- src/routes/preview/mastery-states.tsx: FOUND (created)
- src/routes/preview/full-map.tsx: FOUND (created)
- src/routes/preview/mobile.tsx: FOUND (created)
- commit 9270d01 (Task 1): FOUND
- commit 8a3e981 (Task 2): FOUND

## Checkpoint Fix (post-verification)

**Issue found during human visual verification:** `/preview/pathway`, `/preview/full-map`, and `/preview/mastery-states` all rendered byte-identical output on load because `RoadmapGraph` hardcoded `useState(false)` for `exploring`, making all three routes start in guided-pathway spotlight mode.

**Fix (commit f2be796):**
- Added `initialExploring?: boolean` to `RoadmapGraphProps` (JSDoc documented, default `false`)
- Threaded prop into `GraphCanvas`; `useState(initialExploring ?? false)`
- On-mount `fitView` effect: `initialExploring=true` → fit all nodes (`padding: 0.15`); `false` → pathway-scoped fit
- `<ReactFlow fitViewOptions>` conditioned on same flag
- `/preview/full-map` + `/preview/mastery-states` now pass `initialExploring` (explore mode on load)
- `/preview/pathway` and `/src/routes/index.tsx` unchanged (spotlight default)
- `typecheck` exit 0; 148/148 tests pass

Human visual verification still pending.
