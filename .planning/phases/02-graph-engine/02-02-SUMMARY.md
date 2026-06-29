---
phase: 02-graph-engine
plan: "02"
subsystem: graph-schemas
tags: [schema, zod, graph, pathway, tdd, adr]
status: complete

dependency_graph:
  requires:
    - 01-foundation-schema/01-01 (NodeSummarySchema, NodeFrontmatterSchema base)
  provides:
    - GraphDisplayNodeSchema — typed graph-display projection (ADR 005)
    - PathwaySchema — validated pathway data contract (D-10)
  affects:
    - 02-03 through 02-10 — all graph engine plans import GraphDisplayNode

tech_stack:
  added: []
  patterns:
    - Zod .extend() projection — NodeSummary + difficulty for graph face
    - TDD (RED/GREEN) for both schema modules
    - ADR pattern for boundary decisions

key_files:
  created:
    - src/schemas/graph.ts
    - src/schemas/graph.test.ts
    - src/schemas/pathway.ts
    - src/schemas/pathway.test.ts
    - docs/adr/005-graph-display-node.md
  modified:
    - CONTEXT.md

decisions:
  - GraphDisplayNodeSchema extends NodeSummarySchema with difficulty only (ADR 005)
  - PathwaySchema uses .min(1) on all string fields and steps array
  - graph.ts imports no content-surface types (ADR 002 boundary preserved)

metrics:
  duration: "6m"
  completed: 2026-06-29
  tasks_completed: 3
  files_changed: 6
---

# Phase 02 Plan 02: Graph Data Contract Schemas Summary

GraphDisplayNodeSchema (NodeSummary + difficulty via .extend()) and PathwaySchema (validated pathway JSON contract) authored with TDD, plus ADR 005 documenting the projection decision and 5 new CONTEXT.md domain terms.

## What Was Built

### Task 1: GraphDisplayNodeSchema projection (TDD)
- `src/schemas/graph.ts` — `NodeSummarySchema.extend({ difficulty })` projection
- `src/schemas/graph.test.ts` — 14 tests covering acceptance, difficulty rejection, NodeSummary field rejection, and ADR 002 boundary stripping
- ADR 002 boundary preserved: no content-surface imports in graph.ts

### Task 2: PathwaySchema (TDD)
- `src/schemas/pathway.ts` — `z.object({ id, title, subtitle, steps[] })` all with `.min(1)` constraints
- `src/schemas/pathway.test.ts` — 11 tests covering acceptance, empty steps rejection, empty string rejection, missing field rejection

### Task 3: ADR 005 + CONTEXT.md
- `docs/adr/005-graph-display-node.md` — records the projection decision, rationale (D-04 requires difficulty, NodeFrontmatter is off-limits per ADR 002), consequences, and alternatives
- `CONTEXT.md` — 5 new Phase 02 terms: GraphDisplayNode, pathway step, ancestor chain/prerequisite-chain highlight, spotlight, mastery encoding

## Test Results

- `graph.test.ts`: 14/14 pass
- `pathway.test.ts`: 11/11 pass
- Boundary check: `grep NodeFrontmatter|citations|patch_context|meta_volatile src/schemas/graph.ts` → no matches

## Commits

| Task | Type | Hash | Description |
|------|------|------|-------------|
| 1 (RED) | test | 969314f | add failing tests for GraphDisplayNodeSchema (TDD RED) |
| 1 (GREEN) | feat | f6fbabe | implement GraphDisplayNodeSchema projection (TDD GREEN) |
| 2 (RED) | test | 80337eb | add failing tests for PathwaySchema (TDD RED) |
| 2 (GREEN) | feat | afe9066 | implement PathwaySchema for pathway data contract (TDD GREEN) |
| 3 | docs | 635d5f3 | add ADR 005 and extend CONTEXT.md with Phase 2 graph terms |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] graph.ts JSDoc mentioned forbidden field names**
- **Found during:** Task 1 acceptance check
- **Issue:** Initial JSDoc listed `NodeFrontmatter`, `citations`, `patch_context` by name to explain what must NOT be imported. The acceptance `grep` matched these comment lines, technically failing the "no matches" criterion.
- **Fix:** Simplified JSDoc to reference "content-surface types or fields" without listing specific names — intent preserved, grep clean.
- **Files modified:** `src/schemas/graph.ts`
- **Commit:** f6fbabe (included in GREEN commit)

## TDD Gate Compliance

| Gate | Commit | Status |
|------|--------|--------|
| Task 1 RED | 969314f | PASS — tests failed with "Cannot find module './graph'" |
| Task 1 GREEN | f6fbabe | PASS — 14 tests pass |
| Task 2 RED | 80337eb | PASS — tests failed with "Cannot find module './pathway'" |
| Task 2 GREEN | afe9066 | PASS — 11 tests pass |

## Self-Check: PASSED

- [x] `src/schemas/graph.ts` exists
- [x] `src/schemas/graph.test.ts` exists (14 tests passing)
- [x] `src/schemas/pathway.ts` exists
- [x] `src/schemas/pathway.test.ts` exists (11 tests passing)
- [x] `docs/adr/005-graph-display-node.md` exists with Context/Decision/Consequences
- [x] `CONTEXT.md` contains GraphDisplayNode, pathway step, ancestor chain, spotlight, mastery encoding
- [x] All 5 commits exist in git log
- [x] No content-surface imports in graph.ts (ADR 002 boundary clean)
