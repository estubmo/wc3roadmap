---
phase: 06-self-assessment-quizzes
plan: "03"
subsystem: graph-store / progress-hydration
tags: [zustand, sourceMap, hydration, progress, quiz]
status: complete
dependency_graph:
  requires: [06-01, 06-02]
  provides: [sourceMap-slice, initSourceMap, setSource]
  affects: [src/lib/graph-store.ts, src/components/graph/ProgressProvider.tsx]
tech_stack:
  added: []
  patterns: [sourceMap-parallel-to-masteryMap, useShallow-subscription, new-object-semantics]
key_files:
  modified:
    - src/lib/graph-store.ts
    - src/components/graph/ProgressProvider.tsx
decisions:
  - sourceMap is store-only state — never added to GraphDisplayNode projection (ADR 002/005 / T-06-06)
  - sourceMap typed as Record<string, string> (not enum) — widened to absorb future source values without store changes
  - initSourceMap called immediately after initMasteryMap in same useEffect — single loop, no separate effect
metrics:
  duration: 2m
  completed: "2026-06-30"
  tasks_completed: 2
  files_modified: 2
---

# Phase 06 Plan 03: sourceMap Slice + ProgressProvider Hydration Summary

**One-liner:** Added `sourceMap` slice (parallel to `masteryMap`) to graph store and wired hydration from `progressRecords[].source` in `ProgressProvider` so quiz-source visuals render correctly after page refresh.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add sourceMap slice to graph-store | 13eee53 | src/lib/graph-store.ts |
| 2 | Hydrate sourceMap in ProgressProvider | f1c91f8 | src/components/graph/ProgressProvider.tsx |

## What Was Built

### Task 1 — sourceMap slice in `src/lib/graph-store.ts`

Extended the `GraphStore` interface with three new members mirroring the `masteryMap` slice:

- `sourceMap: Record<string, string>` — per-node source map keyed by nodeId, initialized empty
- `setSource(nodeId, source)` — optimistic single-node update using new-object spread semantics (Pitfall 3 from 05-RESEARCH.md)
- `initSourceMap(map)` — bulk-initialize from server response, called by ProgressProvider on hydration

JSDoc explicitly flags: consumers must use `useShallow`; source must NOT appear in any `GraphDisplayNode` projection (ADR 002/005 / T-06-06). Implementation placed after `initMasteryMap` in the store, directly parallel to the masteryMap block.

### Task 2 — sourceMap hydration in `src/components/graph/ProgressProvider.tsx`

Extended Effect A (the server progress hydration useEffect):

- `initSourceMap` pulled from store with same `useGraphStore((s) => s.initSourceMap)` selector pattern as `initMasteryMap`
- The hydration loop now builds `sourceMap[r.nodeId] = r.source` alongside `map[r.nodeId] = r.masteryState` — single pass, no extra iteration
- `initSourceMap(sourceMap)` called immediately after `initMasteryMap(map)`
- `initSourceMap` added to the effect dependency array (ESLint exhaustive-deps compliant)

Resolves Pitfall 4 from 06-RESEARCH.md: previously `source` was silently discarded at hydration, meaning quiz-mastered nodes showed no quiz label after a page refresh.

## Deviations from Plan

None — plan executed exactly as written.

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes introduced. `sourceMap` is client-side Zustand state derived from already-authorized server progress records (T-06-06 disposition: mitigated — source never enters GraphDisplayNode projection, confirmed by grep of `src/schemas/graph.ts`).

## Verification

- `npx tsc --noEmit` — exits 0 (both tasks)
- `npx vitest run src/lib/local-progress.test.ts` — 18/18 passed (no regression in hydration)
- `src/schemas/graph.ts` grep confirms no `source` or `sourceMap` field in GraphDisplayNode projection

## Known Stubs

None. `sourceMap` is real store state wired to real server data. No placeholder values.

## Self-Check: PASSED

- src/lib/graph-store.ts — FOUND (modified)
- src/components/graph/ProgressProvider.tsx — FOUND (modified)
- Commit 13eee53 — FOUND
- Commit f1c91f8 — FOUND
- GraphDisplayNode projection — no source field leaked (FOUND clean)
