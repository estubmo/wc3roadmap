---
phase: 09-guided-pathways-launch
plan: 04
subsystem: graph-schema
tags: [schema, adr, staleness, graph-projection, boundary]
status: complete
requires:
  - src/schemas/graph.ts (GraphDisplayNodeSchema)
  - src/lib/staleness.ts (isStale predicate, 09-02)
  - docs/adr/002-content-graph-decoupling.md
  - docs/adr/005-graph-display-node.md
provides:
  - GraphDisplayNode.stale (typed boolean projection field)
  - docs/adr/013-graph-projection-staleness-widening.md
affects:
  - 09-10 (index.tsx loader populates stale via isStale)
  - 09-11 (GraphNode renders on-canvas staleness marker off node.stale)
tech-stack:
  added: []
  patterns:
    - "ADR-gated GraphDisplayNode projection widening (ADR 005/006 rule)"
    - "derived boolean crosses boundary; source content fields never do"
key-files:
  created:
    - docs/adr/013-graph-projection-staleness-widening.md
  modified:
    - src/schemas/graph.ts
    - src/lib/graph-layout.test.ts
decisions:
  - "GraphDisplayNodeSchema widened with single stale boolean under ADR 013 (D-09) — first projection widening since ADR 006; source content fields (meta_volatile, patchId) never cross the boundary"
metrics:
  duration: 2m
  completed: 2026-07-03
---

# Phase 9 Plan 04: Graph Projection Staleness Widening Summary

Added a single `stale: z.boolean()` field to `GraphDisplayNodeSchema` (D-09) and authored ADR 013 documenting the deliberate, ADR-gated ADR-002 boundary widening, so the on-canvas staleness marker reads a typed boolean off the node projection without pulling content fields onto the graph layer.

## What Was Built

### Task 1 — stale field on GraphDisplayNodeSchema (commit 98cbe1a)
- Added `stale: z.boolean()` to the `GraphDisplayNodeSchema.extend({...})` block with a doc-comment citing D-09/D-08 and ADR 013, noting it is populated in the 09-10 loader via the single `isStale` predicate and is a deliberate ADR-002 widening.
- Updated both header projection-field lists (file-level list and schema-level list) to include `stale — ADR 013`.
- Did NOT add `stepIndex` or `isNextStep` — those are pathway-derived transient `node.data` fields computed client-side in RoadmapGraph (09-09), never schema fields (RESEARCH Anti-Patterns).

### Task 2 — ADR 013 (commit 2b2937c)
- Created `docs/adr/013-graph-projection-staleness-widening.md` cloning the ADR 005 shape (Status: Accepted; Date; Phase 9; Context / Decision / Consequences / Alternatives).
- Context: staleness (`meta_volatile` + `patchId` vs `CURRENT_PATCH`) is content-derived, but D-08 requires an on-canvas marker; pulling the source fields onto the graph would violate ADR 002.
- Decision: add exactly one derived boolean (`stale`), computed in the loader via the single `isStale` predicate (`src/lib/staleness.ts`) — only the derived boolean crosses the boundary.
- Consequences: the projection boundary is not frozen, only ADR-gated (first widening since ADR 006); future additions still require their own ADR.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added stale to graph-layout.test.ts fixtures**
- **Found during:** Task 1
- **Issue:** Making `stale` a required field broke 4 existing `GraphDisplayNode[]` test fixtures in `src/lib/graph-layout.test.ts` — `tsc --noEmit` reported TS2741 (property `stale` missing). These were the only literals in the project typed to `GraphDisplayNode` (tsc checks the whole project; no other files errored).
- **Fix:** Added `stale: false` to each of the 4 fixtures.
- **Files modified:** src/lib/graph-layout.test.ts
- **Commit:** 98cbe1a

## Verification

- `grep -n "stale" src/schemas/graph.ts` — present in both header lists and the extend block.
- `npx tsc --noEmit` — clean (TSC_CLEAN) after fixture fix.
- `test -f docs/adr/013-...md && grep -qi "Accepted"` and references to D-09 / isStale / ADR 002 — OK.

## Threat Surface

T-09-04 (Information Disclosure, graph projection boundary) mitigated as planned: only a single derived boolean crosses the boundary; the source content fields (`meta_volatile`, `patchId`) stay on the content layer, to be enforced by explicit field-by-field projection in 09-10. No new packages. No new threat surface introduced.

## Self-Check: PASSED
- FOUND: src/schemas/graph.ts (stale field)
- FOUND: docs/adr/013-graph-projection-staleness-widening.md
- FOUND: commit 98cbe1a
- FOUND: commit 2b2937c
