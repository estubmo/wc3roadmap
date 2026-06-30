---
phase: 05-progress-tracking
plan: "06"
subsystem: progress-ui
tags: [progress, mastery, mutation, optimistic-update, toast, tdd]
status: complete

dependency_graph:
  requires: ["05-01", "05-04", "05-05"]
  provides: ["useProgressMutation", "MasteryControls"]
  affects: ["05-08"]

tech_stack:
  added: []
  patterns:
    - "useMutation optimistic update with Zustand snapshot/rollback"
    - "TDD RED/GREEN/REFACTOR for React component"
    - "Radix ToggleGroup (type=single) → role=radio + aria-checked"
    - "viteReact plugin added to vitest.config.ts for .tsx test support"

key_files:
  created:
    - src/hooks/useProgressMutation.ts
    - src/components/graph/MasteryControls.tsx
    - src/components/graph/MasteryControls.test.tsx
  modified:
    - vitest.config.ts

decisions:
  - "Radix ToggleGroup (type=single) uses role=radio + aria-checked, not aria-pressed — test assertion updated accordingly"
  - "vitest.config.ts extended with viteReact() plugin and *.test.tsx include — required for JSX transformation in component tests"
  - "onSettled invalidation gated on session presence — signed-out users have no server query to sync"
  - "Forward-ref pattern (mutateRef) enables Retry toast action to re-fire the mutation with same vars without circular deps"

metrics:
  duration: "6min"
  completed_date: "2026-06-30"
  tasks_completed: 2
  files_created: 3
  files_modified: 1
---

# Phase 05 Plan 06: Marking Interaction — useProgressMutation + MasteryControls Summary

Optimistic mutation hook and gamification-free three-state mastery controls, fully tested.

## What Was Built

**`src/hooks/useProgressMutation.ts`** — `useProgressMutation()` hook wrapping TanStack Query's `useMutation` with:
- `mutationFn` branching on session: signed-in → `setNodeMastery` server fn; signed-out → `setLocalMastery` localStorage write
- `onMutate`: cancels in-flight queries, snapshots prior Zustand `masteryMap[nodeId]`, fires optimistic `setNodeMastery` in the store
- `onError`: rolls back Zustand store to snapshot, fires `toast.error("Couldn't save your progress")` with Retry action (duration: Infinity)
- `onSettled`: invalidates `progressKeys.byUser()` only when signed-in (no server query to sync when signed-out)

**`src/components/graph/MasteryControls.tsx`** — `MasteryControls({ nodeId, currentState })` component with:
- Shadcn `ToggleGroup` (type="single") containing three `ToggleGroupItem`s: Untouched / In Progress / Mastered
- `onValueChange` → `mutation.mutate({ nodeId, masteryState })` (ignores empty/unchanged values)
- Active-state inline styles using CSS variables matching the UI-SPEC mastery color contract
- Signed-out caption ("Sign in with Battle.net...") rendered when `useSession()` returns no session
- Zero gamification text — no counts, percentages, XP, streaks, or leaderboards (PROG-05, D-10)

**`src/components/graph/MasteryControls.test.tsx`** — 5-test suite (jsdom, vi.mock):
- Three buttons with correct labels
- Active-state detection via `aria-checked="true"` or `data-state="on"`
- Mutation fired with correct payload on click
- Signed-out hint renders
- No gamification text fragments in rendered output

## TDD Gate Compliance

- RED commit: `test(05-06): add failing test for MasteryControls` (dc52a0a) — 4/5 tests failed against stub
- GREEN commit: `feat(05-06): implement MasteryControls three-state selector` (ad21bac) — 5/5 pass
- REFACTOR: not needed — component is clean and straightforward

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added viteReact plugin to vitest.config.ts**
- Found during: Task 2 setup
- Issue: vitest.config.ts only included `*.test.ts`, not `*.test.tsx`. No React JSX plugin was configured, which would cause component tests to fail to parse.
- Fix: Added `viteReact()` to plugins and updated include pattern to `*.test.{ts,tsx}`
- Files modified: `vitest.config.ts`
- Commit: 0f78a7b

**2. [Rule 1 - Bug] Test assertion corrected: `aria-pressed` → `aria-checked`**
- Found during: Task 2 GREEN verification
- Issue: The test was written assuming Radix ToggleGroup uses `aria-pressed="true"` for the active item. In practice, Radix ToggleGroup with `type="single"` uses `role="radiogroup"` on the root and `role="radio"` + `aria-checked="true"` on items (not `aria-pressed`). The test assertion returned null.
- Fix: Updated the test to check `aria-checked === "true"` OR `data-state === "on"` — both confirm the active state.
- Files modified: `src/components/graph/MasteryControls.test.tsx`
- Commit: ad21bac

## Known Stubs

None. Both files implement their full planned behavior.

## Threat Flags

None. No new network endpoints, auth paths, file access patterns, or schema changes beyond what the plan's threat model covers. The three-state ToggleGroup emits only `MasteryState` enum values; the server fn (05-04) re-validates via Zod before persistence (T-05-06a satisfied).

## Self-Check

- [x] `src/hooks/useProgressMutation.ts` exists
- [x] `src/components/graph/MasteryControls.tsx` exists
- [x] `src/components/graph/MasteryControls.test.tsx` exists
- [x] Commits: 0f78a7b (hook), dc52a0a (RED test), ad21bac (GREEN component)
- [x] `npm test -- MasteryControls`: 5/5 pass
- [x] `npx tsc --noEmit`: exits 0
