---
phase: 09-guided-pathways-launch
plan: 09
subsystem: ui
tags: [react, xyflow, motion, pathway, progress, mastery]

# Dependency graph
requires:
  - phase: 09-guided-pathways-launch
    provides: "computePathwayProgress pure derivation (09-01) + GraphDisplayNode.stale (09-04)"
provides:
  - "PathwayBanner mastery-tied completion progress bar (rune-500 fill, 'Fundamentals complete' at 100%)"
  - "RoadmapGraph displayNodes enriched with transient stepIndex/pathwayTotal/isNextStep/stale node.data"
affects: [09-11]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "computePathwayProgress called once in a useMemo, shared by banner + node-data derivation (single source of truth)"
    - "Transient per-node overlay data (stepIndex/isNextStep/stale) lives in node.data, never in Zod schema"

key-files:
  created: []
  modified:
    - src/components/graph/PathwayBanner.tsx
    - src/components/graph/RoadmapGraph.tsx

key-decisions:
  - "AnimatePresence label crossfade (0.2s) used for the progress->complete swap, per UI-SPEC Animation Contract"
  - "stale read via rawNodes.find(id).stale ?? false — mirrors filteredDisplayNodes lookup convention"

patterns-established:
  - "Pathway progress derived once (pathwayProgress memo) and threaded into both banner props and node.data"
  - "Mastered-only counting (D-02) surfaced as a proportion fill, never on the node face (F-01 hierarchy)"

requirements-completed: [PATH-04, PATH-01]

coverage:
  - id: D1
    description: "PathwayBanner shows a rune-500 fill bar + 'N of total mastered' driven by mastered-only counting, with progressbar aria"
    requirement: "PATH-04"
    verification:
      - kind: other
        ref: "grep progressbar + 'Fundamentals complete' in PathwayBanner.tsx; npx tsc --noEmit (exit 0)"
        status: pass
    human_judgment: true
    rationale: "Visual fidelity (6px track, fill animation, 240px max-width, label opacity/color) needs a human eye against UI-SPEC; grep+tsc prove structure only"
  - id: D2
    description: "At 100% the bar shows a quiet 'Fundamentals complete' (rune-400) with no confetti/toast/shimmer (D-03/PROG-05)"
    requirement: "PATH-04"
    verification:
      - kind: other
        ref: "grep 'Fundamentals complete' in PathwayBanner.tsx; no toast/confetti/sound imports added"
        status: pass
    human_judgment: true
    rationale: "No-fanfare completion state is a design-intent judgment; automation cannot assert the absence of perceived fanfare"
  - id: D3
    description: "Each pathway node carries stepIndex + isNextStep in node.data, computed client-side via computePathwayProgress"
    requirement: "PATH-01"
    verification:
      - kind: unit
        ref: "vitest run — 38 files / 541 tests pass (pathway-progress.test.ts covers computePathwayProgress)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Graph node receives the stale flag from its GraphDisplayNode projection"
    requirement: "PATH-01"
    verification:
      - kind: unit
        ref: "vitest run — full suite green; tsc --noEmit exit 0 (data shape typechecks)"
        status: pass
    human_judgment: false

# Metrics
duration: 12min
completed: 2026-07-03
status: complete
---

# Phase 09 Plan 09: Pathway Progress Bar + Node Step Data Summary

**Mastery-tied completion bar in PathwayBanner (rune-500 motion fill, "Fundamentals complete" at 100%) plus RoadmapGraph node.data enriched with transient stepIndex/pathwayTotal/isNextStep/stale from a single computePathwayProgress call.**

## Performance

- **Duration:** 12 min
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Replaced the static "{N} of {total} nodes" line with a 6px rune-500 progress bar over an obsidian-700 track, animated via motion/react (0.4s easeOut), with `role="progressbar"` + aria-valuenow/min/max.
- Progress label is now a live status (13px/600, opacity 0.85) reading "{N} of {total} mastered"; at 100% it crossfades (AnimatePresence, 0.2s) to "Fundamentals complete" in rune-400 — no confetti/toast/sound (D-03/PROG-05).
- Removed the dead `totalNodes` prop entirely; PathwayBanner now takes `masteredCount`/`total`.
- RoadmapGraph calls `computePathwayProgress` once (memoized) and threads its result into both the banner props and each node's `data` (stepIndex 1-based, pathwayTotal, isNextStep, stale passthrough).

## Task Commits

Each task was committed atomically:

1. **Task 1: PathwayBanner progress bar** - `73f58a6` (feat)
2. **Task 2: RoadmapGraph displayNodes enrichment + banner feed** - `690ed3c` (feat)

## Files Created/Modified
- `src/components/graph/PathwayBanner.tsx` - Progress bar (motion fill + aria + label swap); totalNodes → masteredCount/total.
- `src/components/graph/RoadmapGraph.tsx` - pathwayProgress + stepIndexMap memos; node.data merge of stepIndex/pathwayTotal/isNextStep/stale; banner call site updated.

## Decisions Made
- Used a `pathwayProgress` useMemo so `computePathwayProgress` runs once and feeds both consumers (banner + node data), avoiding rule duplication (matches 09-01 intent).
- `stale` read from `rawNodes.find((r) => r.id === n.id)?.stale ?? false`, mirroring the existing `filteredDisplayNodes` lookup convention.
- `stepIndex` left `undefined` for non-pathway nodes (badge only renders for pathway steps).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
Tasks 1 and 2 are type-coupled: removing `totalNodes` from PathwayBanner breaks the RoadmapGraph call site until Task 2 updates it. Both edits were implemented and verified together (tsc clean + 541 tests green) before committing per-task; the Task-1-only commit is not independently compilable by design. No pre-commit hook runs tsc, so no intermediate gate was tripped.

## Next Phase Readiness
- 09-11 (GraphNode overlays) can now consume `stepIndex`, `pathwayTotal`, `isNextStep`, and `stale` directly from node.data — no further RoadmapGraph changes required for the step badge, "Next" cue, or staleness marker.

## Self-Check: PASSED

- FOUND: src/components/graph/PathwayBanner.tsx
- FOUND: src/components/graph/RoadmapGraph.tsx
- FOUND: .planning/phases/09-guided-pathways-launch/09-09-SUMMARY.md
- FOUND commit: 73f58a6
- FOUND commit: 690ed3c

---
*Phase: 09-guided-pathways-launch*
*Completed: 2026-07-03*
