---
phase: 06-self-assessment-quizzes
plan: "08"
subsystem: ui
tags: [tanstack-query, zustand, optimistic-update, quiz, mastery, mutation]

requires:
  - phase: 06-05
    provides: recordQuizPass authedServerFn (two-table upsert, server-stamped source:"quiz")
  - phase: 06-03
    provides: sourceMap + setSource + initSourceMap in graph-store (Zustand)
  - phase: 05-06
    provides: useProgressMutation pattern (optimistic onMutate/rollback/invalidate template)

provides:
  - useQuizPassMutation hook — optimistic quiz-pass write with dual signed-in/signed-out path and source dimension

affects:
  - 06-09 (QuizTakeover wires useQuizPassMutation.mutate on pass)
  - 06-10 (human-verify checkpoint tests optimistic + rollback end-to-end)

tech-stack:
  added: []
  patterns:
    - "useQuizPassMutation mirrors useProgressMutation optimistic structure, adding previousSource snapshot + setSource(nodeId,'quiz') in onMutate"
    - "Source rollback is conditional: only call setSource in onError when previousSource !== undefined (no delete API on sourceMap)"

key-files:
  created:
    - src/hooks/useQuizPassMutation.ts
  modified: []

key-decisions:
  - "useQuizPassMutation: dual signed-in/out path — recordQuizPass (auth) vs setLocalMastery (signed-out); signed-out source is session-only (local-progress does not track source)"
  - "previousSource rollback is conditional (undefined check) — sourceMap has no delete API; onSettled invalidation self-corrects for signed-in users"
  - "Retry toast action preserved from useProgressMutation via mutateRef forward-reference"

patterns-established:
  - "Two-snapshot optimistic pattern: snapshot both masteryMap[nodeId] AND sourceMap[nodeId] before mutation; roll back independently on error"

requirements-completed: [QUIZ-02]

coverage:
  - id: D1
    description: "useQuizPassMutation exported from src/hooks/useQuizPassMutation.ts — optimistically sets mastered + source:quiz, persists via recordQuizPass (signed-in) or setLocalMastery (signed-out), rolls back both on error, invalidates progressKeys.byUser() on settle (signed-in only)"
    requirement: QUIZ-02
    verification:
      - kind: unit
        ref: "npx tsc --noEmit"
        status: pass
    human_judgment: true
    rationale: "End-to-end optimistic update + rollback requires runtime browser verification (no vitest coverage in this plan); verified at 06-10 human-verify checkpoint"

duration: 2min
completed: "2026-06-30"
status: complete
---

# Phase 06 Plan 08: useQuizPassMutation Summary

**TanStack Query optimistic mutation hook that sets node mastered + source:quiz immediately on quiz pass, with dual auth/anonymous persistence and full rollback on error**

## Performance

- **Duration:** 2 min
- **Started:** 2026-06-30T22:05:56Z
- **Completed:** 2026-06-30T22:08:52Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Created `src/hooks/useQuizPassMutation.ts` mirroring `useProgressMutation` with two new deltas: `previousSource` snapshot and `setSource(nodeId, "quiz")` in `onMutate`
- Dual persistence path: signed-in calls `recordQuizPass({ data: { nodeId } })` (authedServerFn, server-stamps source/masteryState/patchId); signed-out calls `setLocalMastery(nodeId, "mastered")`
- `onError` rolls back both mastery (`previousState ?? "untouched"`) and source (conditional on `previousSource !== undefined`); shows Retry toast via `mutateRef` forward-reference
- `onSettled` invalidates `progressKeys.byUser()` only when signed-in (mirrors `useProgressMutation` guard)
- `npx tsc --noEmit` passes with zero errors

## Task Commits

1. **Task 1: Implement useQuizPassMutation** - `13c02f1` (feat)

**Plan metadata:** committed with docs state update

## Files Created/Modified

- `src/hooks/useQuizPassMutation.ts` — optimistic quiz-pass mutation hook (176 lines)

## Decisions Made

- **Dual path preserved** — the plan specifies signed-in AND signed-out paths; PATTERNS.md showed signed-in only but the PLAN.md text is the definitive spec
- **Conditional source rollback** — `setSource` requires a string (no delete API); only roll back source when `previousSource !== undefined`; `onSettled` invalidation self-corrects for signed-in users
- **Retry toast included** — plan says "keep an optional Retry action like the analog"; `mutateRef` forward-reference pattern copied exactly from `useProgressMutation`

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- `useQuizPassMutation` ready for wiring at `src/components/quiz/QuizTakeover.tsx` (06-09)
- End-to-end optimistic update + rollback verified at 06-10 human-verify checkpoint

---
*Phase: 06-self-assessment-quizzes*
*Completed: 2026-06-30*
