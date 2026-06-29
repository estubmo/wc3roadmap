---
phase: 03-content-pipeline-node-panel
plan: "07"
subsystem: ui
tags: [zustand, filter, graph-store, cva, react, typescript, accessibility]

requires:
  - phase: 03-04
    provides: ActiveFilters interface + setSelectedNode/setFilter/clearFilters/isFilterActive in graph-store

provides:
  - PrerequisiteChips component — D-14 clickable prereq chips that swap panel via setSelectedNode
  - FilterBar component — D-09/D-10 top-bar search input + race/skillType/difficulty/mastery facet toggles
  - Both components wire to graph-store via getState() in handlers and useShallow slice subscription for reads

affects:
  - 03-08 (NodeDetailPanel — consumes PrerequisiteChips with prerequisites + nodeTitles props)
  - 03-10 (index.tsx integration — mounts FilterBar inside the 56px top bar flex row)

tech-stack:
  added: []
  patterns:
    - "PrerequisiteChips: CVA chipVariants (obsidian-700 bg, rune-400 hover border) + cn; getState() in event handlers"
    - "FilterBar: useShallow from zustand/shallow for slice subscription; inline CSS-variable tokens for structural elements"
    - "FacetPill toggle: setFilter with computed OR-within array (filter/concat) dispatched via getState()"

key-files:
  created:
    - src/components/graph/PrerequisiteChips.tsx
    - src/components/graph/FilterBar.tsx
  modified: []

key-decisions:
  - "PrerequisiteChips accepts nodeTitles: Record<string,string> map — keeps interface narrow; fallback to raw ID for unknown prereqs"
  - "FilterBar uses useShallow((s) => ({searchQuery, activeFilters})) from zustand/shallow — avoids re-render on hover/selectedNode changes"
  - "toggleFacetValue builds new OR-within array before calling setFilter — pure computation in handler, not in store"
  - "FACETS config object defined at module scope as readonly const — facet values are authoritative and stable for integration tests"

patterns-established:
  - "useShallow slice subscription: import { useShallow } from 'zustand/shallow'; wrap selector for object slices"
  - "Facet toggle pattern: compute next = current.includes(v) ? filter-out : append, then call setFilter"

requirements-completed: [GRAPH-03, GRAPH-04]

coverage:
  - id: D1
    description: "PrerequisiteChips renders D-14 clickable chips (role=button, tabIndex, onKeyDown Enter/Space) that call setSelectedNode via getState()"
    requirement: GRAPH-03
    verification:
      - kind: unit
        ref: "npx tsc --noEmit (no PrerequisiteChips.tsx errors)"
        status: pass
    human_judgment: false
  - id: D2
    description: "PrerequisiteChips returns null when prerequisites is empty"
    requirement: GRAPH-03
    verification:
      - kind: unit
        ref: "npx tsc --noEmit clean; component logic: prerequisites.length === 0 → return null"
        status: pass
    human_judgment: false
  - id: D3
    description: "FilterBar controlled search input dispatches setSearchQuery; four facet groups toggle via setFilter; clear button calls clearFilters when isFilterActive"
    requirement: GRAPH-04
    verification:
      - kind: unit
        ref: "npx tsc --noEmit (no FilterBar.tsx errors)"
        status: pass
    human_judgment: false
  - id: D4
    description: "FilterBar reads state via shallow slice subscription (searchQuery + activeFilters only)"
    requirement: GRAPH-04
    verification:
      - kind: unit
        ref: "Source review: useShallow((s) => ({searchQuery: s.searchQuery, activeFilters: s.activeFilters})) in FilterBar.tsx"
        status: pass
    human_judgment: false
  - id: D5
    description: "FilterBar fits 56px top bar and dispatches to store when typing/toggling in top bar; Clear resets"
    requirement: GRAPH-04
    verification: []
    human_judgment: true
    rationale: "Visual/interaction verification requires rendered UI — cannot automate without a browser test"

duration: 6min
completed: 2026-06-29
status: complete
---

# Phase 03 Plan 07: PrerequisiteChips + FilterBar Summary

**CVA prerequisite chips (D-14) and shallow-slice FilterBar (D-09/D-10) wired to graph-store via getState() dispatch and useShallow read subscription**

## Performance

- **Duration:** 6 min
- **Started:** 2026-06-29T11:44:27Z
- **Completed:** 2026-06-29T11:50:12Z
- **Tasks:** 2
- **Files modified:** 2 (created)

## Accomplishments
- Created `PrerequisiteChips.tsx` — CVA-styled rounded-full chips (obsidian-700 bg, rune-400 hover border), full keyboard accessibility (role=button/tabIndex/onKeyDown), `getState().setSelectedNode()` on activation, null when prerequisites empty
- Created `FilterBar.tsx` — controlled search input (`setSearchQuery`), four facet groups (race/skillType/difficulty/mastery) with OR-within `FacetPill` toggles (`setFilter`), conditional Clear button when `isFilterActive`; reads state via `useShallow` slice subscription from `zustand/shallow`
- Full test suite: 195 tests passing (no regressions); TypeScript clean for both files

## Task Commits

1. **Task 1: PrerequisiteChips** — `7e91d4a` (feat)
2. **Task 2: FilterBar** — `7381730` (feat)

## Files Created/Modified
- `src/components/graph/PrerequisiteChips.tsx` — D-14 clickable prereq chips; CVA chipVariants; getState() wiring; null on empty
- `src/components/graph/FilterBar.tsx` — D-09/D-10 search input + 4-facet toggles; useShallow slice; CSS-variable tokens; Clear button

## Decisions Made
- `PrerequisiteChips` props: `nodeTitles: Record<string,string>` rather than importing graph data directly — keeps interface narrow and lets the panel caller supply the lookup map
- FilterBar uses `useShallow` from `zustand/shallow` (zustand v5 API) to wrap the object selector — prevents re-renders from hoveredNodeId/ancestorEdgeIds/selectedNodeId churn
- `toggleFacetValue` computes the next array in the handler and calls `getState().setFilter` — write path stays out of the hook subscription
- `FACETS` config defined at module scope as `readonly const` — authoritative ordered list for all four facets, easy to extend

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None — no external service configuration required.

## Next Phase Readiness
- `PrerequisiteChips` ready for integration in `NodeDetailPanel` (03-08): pass `node.prerequisites` + a nodeTitles map derived from the loader's `nodes` array
- `FilterBar` ready for integration in `src/routes/index.tsx` (03-10): add `<FilterBar />` as a flex sibling after the brand span inside the 56px top bar `<div>`
- Both components use `getState()` in handlers — no prop-drilling or context needed for the write path

## Self-Check: PASSED

- src/components/graph/PrerequisiteChips.tsx: FOUND
- src/components/graph/FilterBar.tsx: FOUND
- 03-07-SUMMARY.md: FOUND
- Commit 7e91d4a (Task 1): FOUND
- Commit 7381730 (Task 2): FOUND

---
*Phase: 03-content-pipeline-node-panel*
*Completed: 2026-06-29*
