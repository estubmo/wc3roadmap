---
phase: "05-progress-tracking"
plan: "05"
subsystem: "progress-primitives"
tags: ["progress", "localStorage", "zustand", "tanstack-query", "client"]
dependency_graph:
  requires: ["05-02"]
  provides: ["local-progress-store", "progress-keys-factory", "graph-store-masteryMap"]
  affects: ["05-06", "05-07", "05-08"]
tech_stack:
  added: []
  patterns:
    - "SSR guard pattern (typeof window === 'undefined')"
    - "TDD RED/GREEN cycle for localStorage module"
    - "Zustand additive slice extension"
    - "Typed readonly tuple query key factory"
key_files:
  created:
    - "src/lib/local-progress.ts"
    - "src/lib/local-progress.test.ts"
    - "src/lib/progress-keys.ts"
  modified:
    - "src/lib/graph-store.ts"
decisions:
  - "local-progress.ts uses type-only import of MasteryState from #/schemas/progress — stripped at runtime, SSR-safe"
  - "local-progress.test.ts deletes globalThis.window to simulate SSR (jsdom environment)"
  - "graph-store masteryMap slice additive only — no Phase 2/3 fields changed"
  - "setNodeMastery uses spread {...s.masteryMap, [nodeId]: state} for reference equality (Pitfall 3)"
metrics:
  duration: "3min"
  completed: "2026-06-30"
  tasks_completed: 3
  files_created: 3
  files_modified: 1
status: complete
---

# Phase 05 Plan 05: Client Progress Primitives Summary

**One-liner:** SSR-safe localStorage progress store (with merge flag), typed progressKeys query factory, and masteryMap Zustand slice for optimistic single-node updates.

## What Was Built

Three pure client-side modules that form the foundation for Phase 5 progress tracking:

1. **`src/lib/local-progress.ts`** — signed-out source of truth. Guards every function with `typeof window === "undefined"` so SSR bundles never touch localStorage (T-05-05c). `getLocalProgress()` returns `{}` on SSR and on malformed JSON (T-05-05b). Five exports: `getLocalProgress`, `setLocalMastery`, `clearLocalProgress`, `isAlreadyMerged`, `markMerged`. The `wc3rm:merged` flag prevents double-merge on subsequent sign-in events within the same browser (D-07).

2. **`src/lib/progress-keys.ts`** — typed readonly tuple query key factory. `progressKeys.all()` → `["progress"]`; `progressKeys.byUser()` → `["progress", "byUser"]`. Enables type-safe selective invalidation in `useProgressMutation.onSettled` (05-06) and `useQuery` (05-07).

3. **`src/lib/graph-store.ts` extended** — added `masteryMap` slice under `// --- Phase 5: mastery state map ---` section comment. Interface declares `masteryMap: Record<string, MasteryState>`, `setNodeMastery`, and `initMasteryMap`. `setNodeMastery` uses spread (`{ ...s.masteryMap, [nodeId]: state }`) to create a new object for React reference equality (Pitfall 3 from RESEARCH.md). JSDoc warns consumers to subscribe via `useShallow((s) => s.masteryMap)` to avoid hover/selection re-renders (Pitfall 2).

## TDD Gate Compliance

Task 1 followed the TDD RED/GREEN cycle:
- **RED:** `local-progress.test.ts` written first; tests failed with "Failed to resolve import" (source file absent)
- **GREEN:** `local-progress.ts` implemented; 18 tests pass

## Task Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | SSR-safe local-progress store + tests | 838fa6a | src/lib/local-progress.ts, src/lib/local-progress.test.ts |
| 2 | progressKeys query-key factory | f8e0c4e | src/lib/progress-keys.ts |
| 3 | Extend graph-store with masteryMap slice | 82f388b | src/lib/graph-store.ts |

## Verification Results

- `npm test -- local-progress` → 18 tests passed (all five behaviors + SSR guards + malformed JSON)
- `npm test` (full suite) → 280/280 tests passed (no regressions)
- `npx tsc --noEmit` → exits 0 after all three tasks

## Deviations from Plan

None — plan executed exactly as written.

## Threat Model Coverage

| Threat | Mitigation | Verified |
|--------|-----------|---------|
| T-05-05a: localStorage tampering | Values are non-authoritative; server validates at merge via MasteryStateSchema | By design |
| T-05-05b: malformed JSON DoS | try/catch in getLocalProgress returns {} | Test: "returns {} when the stored JSON is malformed" |
| T-05-05c: SSR localStorage leak | Every function guards typeof window === "undefined" | Tests: SSR guard describe block (5 tests) |

## Downstream Seams

- **05-06 useProgressMutation:** imports `progressKeys.byUser()` for `onSettled` invalidation and `setNodeMastery` for optimistic Zustand update
- **05-07 ProgressProvider:** imports `getLocalProgress` (merge payload), `isAlreadyMerged` / `markMerged` (gate), and `progressKeys.byUser()` as `queryKey`
- **05-08 RoadmapGraph seam swap:** replaces `getMockMastery` calls with `masteryMap[n.id] ?? "untouched"` using the Zustand `masteryMap`

## Self-Check: PASSED

- src/lib/local-progress.ts — FOUND
- src/lib/local-progress.test.ts — FOUND
- src/lib/progress-keys.ts — FOUND
- graph-store.ts masteryMap — FOUND (7 occurrences)
- Commit 838fa6a — verified
- Commit f8e0c4e — verified
- Commit 82f388b — verified
- All 280 tests passing — verified
