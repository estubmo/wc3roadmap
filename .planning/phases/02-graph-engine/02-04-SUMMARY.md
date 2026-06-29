---
phase: 02-graph-engine
plan: "04"
subsystem: graph-layout
tags: [dagre, layout, bfs, pure-functions, graph-engine]
status: complete

dependency_graph:
  requires: [02-01, 02-02]
  provides: [graph-layout, pathway-utils]
  affects: [02-08, 02-09]

tech_stack:
  added:
    - "@dagrejs/dagre (Graph + layout named imports)"
    - "@xyflow/react (Node + Edge types, type-only)"
  patterns:
    - "Pure function deep module: simple signature hiding dagre rank assignment"
    - "BFS with visited-set guard for diamond-safe ancestor traversal"

key_files:
  created:
    - src/lib/graph-layout.ts
    - src/lib/graph-layout.test.ts
    - src/lib/pathway-utils.ts
    - src/lib/pathway-utils.test.ts
  modified: []

decisions:
  - "Use named imports { Graph, layout } from @dagrejs/dagre — avoids ambiguity with default export"
  - "Use relative imports (../schemas/graph) instead of #/ alias — vitest config has no alias resolver"
  - "Visited-set guard in computeAncestorEdgeIds starts queue with nodeId itself — ensures root node is marked visited before loop so self-edges (if any) are not collected"

metrics:
  duration: "6m"
  completed: "2026-06-29"
  tasks: 2
  files: 4
---

# Phase 02 Plan 04: Dagre Layout + Ancestor BFS Summary

**One-liner:** Synchronous dagre TB layout (`computeLayout`) and BFS ancestor-chain traversal (`computeAncestorEdgeIds`) as pure functions with 18 passing unit tests.

## What Was Built

### Task 1: `src/lib/graph-layout.ts` + `src/lib/graph-layout.test.ts`

`computeLayout(nodes, direction = 'TB')` converts a `GraphDisplayNode[]` DAG into React Flow `Node[]` + `Edge[]` using `@dagrejs/dagre`. Key implementation details:

- **Dagre config:** `rankdir: direction`, `ranksep: 80`, `nodesep: 40`
- **Edge direction:** `g.setEdge(prereqId, n.id)` — prereq-first so fundamentals sit at the top (Pitfall 7)
- **Position centering:** `x - NODE_WIDTH/2, y - NODE_HEIGHT/2` (dagre returns centre, React Flow needs top-left)
- **Node type mapping:** `MECHANIC → 'mechanic'`, `CONCEPTUAL → 'conceptual'`
- **Node data:** full `GraphDisplayNode` fields spread into `data`
- **Constants:** `NODE_WIDTH = 160`, `NODE_HEIGHT = 80` (from UI-SPEC)

**10 tests:** all nodes present, numeric positions, TB depth ordering, edge ids/source/target/type, node type mapping, data fields, determinism, empty input.

### Task 2: `src/lib/pathway-utils.ts` + `src/lib/pathway-utils.test.ts`

`computeAncestorEdgeIds(nodeId, edges)` walks the incoming-edge graph upward from `nodeId` using BFS, collecting edge IDs for the `motion.path` highlight in `GraphEdge` (D-03).

- **BFS upward:** for each edge where `edge.target === current`, collect `edge.id` and enqueue `edge.source`
- **Visited guard:** `Set<string>` prevents revisiting nodes in diamond shapes and cycles (T-02-06)
- **Return value:** `Set<string>` consumed via `.has(edgeId)` per-edge selector (Pitfall 5)
- **Safe defaults:** unknown node id and root node both return empty Set without throwing

**8 tests:** full ancestor chain, sibling branch excluded, mid-chain node, root node, unknown id, diamond DAG (visited guard), empty edges, `.has()` semantics.

## Test Results

```
Test Files  12 passed (12)
Tests      142 passed (142)
```

Both new test suites pass. No regressions in existing tests.

## Deviations from Plan

### Auto-fixed Issues

None — plan executed as specified with one minor deviation:

**1. [Rule 3 - Deviation] Relative imports instead of `#/` alias**
- **Found during:** Task 1 implementation
- **Issue:** `vitest.config.ts` has no `resolve.alias` for `#/*` → `./src/*`. Using `#/schemas/graph` would cause import resolution failure in vitest node environment.
- **Fix:** Used `../schemas/graph` relative path in `graph-layout.ts`. All existing tests in the codebase use relative paths for the same reason.
- **Files modified:** `src/lib/graph-layout.ts` (import path only — same schema, same type)
- **Impact:** None — behavior identical, tests pass, TypeScript resolves correctly via tsconfig `paths` in build context.

## Threat Model Compliance

| Threat ID | Mitigation | Implemented |
|-----------|-----------|-------------|
| T-02-06 | visited-set guard in computeAncestorEdgeIds | YES — `visited.add(current)` before queue processing, `!visited.has(edge.source)` check before enqueue |

## Known Stubs

None.

## Commits

| Hash | Type | Description |
|------|------|-------------|
| e8f36e2 | test | add failing tests for computeLayout dagre layout fn (RED) |
| 77073d7 | feat | implement computeLayout dagre DAG layout pure function (GREEN) |
| 0e4e1e3 | test | add failing tests for computeAncestorEdgeIds BFS fn (RED) |
| 2e3a737 | feat | implement computeAncestorEdgeIds BFS ancestor chain fn (GREEN) |

## Self-Check: PASSED

- [x] `src/lib/graph-layout.ts` exists
- [x] `src/lib/graph-layout.test.ts` exists
- [x] `src/lib/pathway-utils.ts` exists
- [x] `src/lib/pathway-utils.test.ts` exists
- [x] All 4 commits present in git log
- [x] 18 new tests pass (10 + 8), 142 total, 0 failures
- [x] `grep -n "setEdge(" src/lib/graph-layout.ts` shows prereq-first argument order
- [x] T-02-06 mitigation present (visited-set guard)
