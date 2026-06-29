---
phase: 03-content-pipeline-node-panel
plan: "04"
subsystem: ui
tags: [zustand, filter, graph-store, pure-functions, vitest, typescript]

requires:
  - phase: 03-01
    provides: filter-utils.test.ts RED scaffold (22 failing tests defining matchesFilter + isFilterActive contract)
  - phase: 03-03
    provides: GraphDisplayNodeSchema extended with skillType + tags fields (ADR-006)

provides:
  - ActiveFilters interface exported from graph-store.ts (race/skillType/difficulty/mastery facets)
  - selectedNodeId/setSelectedNode panel state in graph-store (D-02)
  - searchQuery/setSearchQuery + activeFilters/setFilter/clearFilters filter state in graph-store (D-10)
  - Pure matchesFilter function — title+tags search (OR) + AND-across/OR-within facets
  - Pure isFilterActive function — short-circuit helper for dim computation
  - filter-utils.test.ts: 22 unit tests GREEN

affects:
  - 03-05 (node-content-query — imports ActiveFilters shape from graph-store)
  - 03-06 and later (FilterBar, GraphCanvas dim computation — import matchesFilter/isFilterActive/ActiveFilters)
  - Phase 5 (mastery facet will replace getMockMastery with real persistence; matchesFilter signature unchanged)

tech-stack:
  added: []
  patterns:
    - "Pure filter module pattern: typed inputs, no React/DOM/Zustand state imports, type-only cross-module imports"
    - "AND-across/OR-within facet semantics for graph filter layer (D-10)"
    - "Zustand slice extension: add state + setters as a block below existing slice, never rewrite the file"

key-files:
  created:
    - src/lib/filter-utils.ts
  modified:
    - src/lib/graph-store.ts

key-decisions:
  - "ActiveFilters exported from graph-store.ts (not a separate types file) — co-located with the state that holds it; filter-utils imports it type-only"
  - "matchesFilter takes mastery as an explicit arg (not getMockMastery internally) — keeps it pure and phase-agnostic; Phase 5 passes real mastery without changing the signature"
  - "EMPTY_FILTERS constant defined at module scope and spread into initial state + clearFilters — prevents identity equality issues with object literals"

patterns-established:
  - "Pure filter predicate: zero Zustand/React/DOM imports in filter-utils.ts; all state passed as args"
  - "Facet logic: AND across active facets, OR within each facet — enforced by sequential early-return guards"

requirements-completed: [GRAPH-04]

coverage:
  - id: D1
    description: "graph-store.ts exports ActiveFilters interface and exposes selectedNodeId/setSelectedNode panel state"
    requirement: GRAPH-04
    verification:
      - kind: unit
        ref: "npx tsc --noEmit (no graph-store.ts errors)"
        status: pass
    human_judgment: false
  - id: D2
    description: "graph-store.ts exposes searchQuery/setSearchQuery/activeFilters/setFilter/clearFilters filter state"
    requirement: GRAPH-04
    verification:
      - kind: unit
        ref: "npx tsc --noEmit (no graph-store.ts errors)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Pure matchesFilter and isFilterActive functions with AND-across/OR-within semantics — 22 unit tests GREEN"
    requirement: GRAPH-04
    verification:
      - kind: unit
        ref: "src/lib/filter-utils.test.ts (22 tests: matchesFilter — no filters, free-text, race, skillType, AND across facets, mastery; isFilterActive)"
        status: pass
    human_judgment: false

duration: 3min
completed: 2026-06-29
status: complete
---

# Phase 03 Plan 04: Store Extension + Pure Filter Utilities Summary

**Zustand graph-store extended with panel-selection + filter state (D-02/D-10) and pure matchesFilter/isFilterActive functions — turns 22 RED filter-utils tests GREEN**

## Performance

- **Duration:** 3 min
- **Started:** 2026-06-29T11:25:50Z
- **Completed:** 2026-06-29T11:28:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Extended `graph-store.ts` with `selectedNodeId`/`setSelectedNode` (panel open/close, D-02), `searchQuery`/`setSearchQuery`, `activeFilters`/`setFilter`/`clearFilters`, and exported `ActiveFilters` interface — existing hover/ancestorEdge slice unchanged
- Created `filter-utils.ts` with pure `matchesFilter` (title+tags OR search + AND-across/OR-within facets per D-10) and `isFilterActive` (short-circuit for dim computation)
- All 22 filter-utils unit tests GREEN; TypeScript clean for both files

## Task Commits

1. **Task 1: Extend graph-store with panel-selection + filter state** — `5f69e14` (feat)
2. **Task 2: Implement pure matchesFilter + isFilterActive** — `40a8361` (feat)

## Files Created/Modified
- `src/lib/graph-store.ts` — Added ActiveFilters interface (exported), selectedNodeId/setSelectedNode, searchQuery/setSearchQuery, activeFilters/setFilter/clearFilters; hover slice intact
- `src/lib/filter-utils.ts` — Pure matchesFilter + isFilterActive; imports: GraphDisplayNode from schemas/graph, MasteryState from mock-mastery, ActiveFilters from graph-store (type-only)

## Decisions Made
- ActiveFilters co-located in graph-store.ts (not a separate types file) — imported type-only by filter-utils to keep module coupling explicit
- matchesFilter takes mastery as an explicit arg rather than calling getMockMastery internally — signature stays pure and phase-agnostic; Phase 5 passes real mastery without touching filter-utils
- EMPTY_FILTERS constant at module scope spread into initial state and clearFilters to avoid object-literal identity issues in Zustand

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None — no external service configuration required.

## Next Phase Readiness
- `matchesFilter` and `isFilterActive` ready for import by GraphCanvas (dim computation) and FilterBar
- `ActiveFilters` ready for import by FilterBar component in 03-06/03-07
- `selectedNodeId`/`setSelectedNode` ready for NodeDetailPanel (03-05/03-06)
- Phase 5 mastery facet: pass `getMasteryFromDB(nodeId)` to matchesFilter — no signature change needed

---
*Phase: 03-content-pipeline-node-panel*
*Completed: 2026-06-29*
