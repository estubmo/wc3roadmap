---
phase: "05-progress-tracking"
plan: "07"
subsystem: "progress-tracking"
status: complete
tags: ["progress", "masteryMap", "localStorage", "merge", "ProgressProvider"]
dependency_graph:
  requires: ["05-01", "05-04", "05-05"]
  provides: ["ProgressProvider", "masteryMap-hydration", "first-sign-in-merge"]
  affects: ["src/routes/index.tsx", "graph-store.masteryMap"]
tech_stack:
  added: []
  patterns:
    - "useQuery(getUserProgress, enabled: !!session) → initMasteryMap for signed-in hydration"
    - "getLocalProgress() → initMasteryMap for signed-out hydration"
    - "useRef + wc3rm:merged flag dual-guard for one-time merge (Pitfall 4)"
    - "fill-gaps merge: mergeProgressOnSignIn → clearLocalProgress + markMerged + invalidateQueries"
key_files:
  created:
    - "src/components/graph/ProgressProvider.tsx"
  modified:
    - "src/routes/index.tsx"
decisions:
  - "ProgressProvider wraps only the non-empty graph content — EmptyState path is intentionally outside the provider"
  - "mergeInitiatedRef + isAlreadyMerged() dual-guard prevents both intra-session double-fire and cross-reload re-merge"
  - "session used as boolean (!!session) for query enabled flag; isPending not needed per plan spec"
  - "cast r.masteryState as MasteryState accepted: Zod validated at write time guarantees valid values"
metrics:
  duration: "4m"
  completed: "2026-06-30"
  tasks_completed: 2
  files_modified: 2
---

# Phase 05 Plan 07: ProgressProvider Summary

**One-liner:** ProgressProvider hydrates Zustand masteryMap from server (signed-in) or localStorage (signed-out) with one-time fill-gaps merge on first sign-in guarded by dual ref+flag.

## What Was Built

### Task 1 — ProgressProvider component (`5ef8d53`)

Created `src/components/graph/ProgressProvider.tsx` with three coordinated effects:

- **Effect A (signed-in hydrate):** `useQuery(progressKeys.byUser(), getUserProgress, enabled: !!session, staleTime: 5min)` — on data resolve, iterates rows and calls `initMasteryMap(map)` to populate Zustand.
- **Effect B (signed-out hydrate):** When `!session`, calls `initMasteryMap(getLocalProgress())` to hydrate from localStorage.
- **Effect C (one-time merge, D-07):** When session is present, guarded by `mergeInitiatedRef.current` (intra-session) AND `isAlreadyMerged()` (cross-reload Pitfall 4); reads local entries, calls `mergeProgressOnSignIn({ data: { records } })`, then `clearLocalProgress()` + `markMerged()` + `queryClient.invalidateQueries({ queryKey: progressKeys.byUser() })`; fires `toast.success("Progress synced", ...)` (5s) only when `result.merged > 0`.

Security (T-05-07a/b/c): merge payload validated server-side; dual guard enforces one-time semantics; masteryMap only ever holds the principal's own rows (getUserProgress is principal-keyed).

### Task 2 — Mount in home route (`3e31e28`)

Modified `src/routes/index.tsx` to wrap the `<main>` block (top bar + graph + NodeDetailPanel) in `<ProgressProvider>`. The `EmptyState` early-return path is intentionally outside the provider — no progress state needed when pathway/nodes are absent. Loader and projection logic unchanged.

## Verification

- `npx tsc --noEmit` exits 0 (both tasks verified individually)
- `grep -c "ProgressProvider" src/routes/index.tsx` → 3 (import + open/close tags)
- `grep -c "isAlreadyMerged\|mergeProgressOnSignIn\|initMasteryMap" src/components/graph/ProgressProvider.tsx` → 14

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — ProgressProvider wires to real server functions (getUserProgress, mergeProgressOnSignIn from 05-04) and real store actions (initMasteryMap from 05-05).

## Threat Flags

No new threat surface beyond the plan's registered T-05-07a/b/c threats. All mitigations applied.

## Self-Check: PASSED

- [x] `src/components/graph/ProgressProvider.tsx` exists
- [x] `src/routes/index.tsx` modified with ProgressProvider import and wrapping
- [x] Commit `5ef8d53` exists (Task 1)
- [x] Commit `3e31e28` exists (Task 2)
