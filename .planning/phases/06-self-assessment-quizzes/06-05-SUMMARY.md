---
phase: 06-self-assessment-quizzes
plan: 05
subsystem: api
tags: [drizzle-orm, tanstack-start, server-functions, zod, vitest, tdd, quiz, progress]

requires:
  - phase: 06-02
    provides: quizProgress table in src/db/schema.ts (SRS seed schema)
  - phase: 05-progress-tracking
    provides: authMiddleware, authedServerFn pattern (ADR-007), nodeProgress table

provides:
  - RecordQuizPassInput (nodeId-only Zod schema, no server-stamp fields)
  - recordQuizPassHandler (two-table upsert; stamps mastered+quiz+CURRENT_PATCH)
  - recordQuizPass (createServerFn POST, principal-keyed per ADR-007)
  - RecordQuizAttemptInput (nodeId + passed boolean)
  - recordQuizAttemptHandler (pass delegates; fail path upserts quizProgress only)
  - recordQuizAttempt (createServerFn POST, principal-keyed per ADR-007)
  - 11 server-stamp regression tests (RED first, GREEN after implementation)

affects:
  - 06-09 (useQuizPassMutation will call recordQuizPass/recordQuizAttempt)
  - 06-06 (quiz grading engine feeds into recordQuizAttempt call)
  - future FSRS scheduler (lapseCount seed data from fail-after-pass tracking)

tech-stack:
  added: []
  patterns:
    - "Two-table upsert: recordQuizPass writes nodeProgress (mastery) then quizProgress (SRS) atomically"
    - "lapseCount via SQL CASE WHEN quizProgress.passed THEN +1 ELSE 0 END — increments only on fail-after-pass"
    - "Fail path: recordQuizAttemptHandler(passed=false) writes quizProgress only — nodeProgress never touched"
    - "vi.doMock + vi.resetModules + dynamic import per test (same pattern as progress.test.ts)"
    - "RecordQuizPassInput has nodeId only — Zod default stripping removes forged fields at parse layer"

key-files:
  created:
    - src/server/quiz.ts
    - src/server/quiz.test.ts
  modified: []

key-decisions:
  - "RecordQuizPassInput: nodeId-only — no userId/source/masteryState/patchId; Zod strips extras (T-06-05-01/T-06-05-02)"
  - "recordQuizPassHandler: two-table upsert (nodeProgress mastered+quiz+CURRENT_PATCH, then quizProgress passed=true)"
  - "lapseCount SQL CASE WHEN: reads existing row's passed value, increments only on fail-after-pass (D-08, Pitfall 6)"
  - "Fail path: quizProgress-only upsert; nodeProgress untouched per D-12 (fail never changes mastery)"
  - "createServerFn lexically visible at definition site — no factory wrapper per ADR-007 rule"
  - "recordQuizAttemptHandler delegates to recordQuizPassHandler on passed=true (DRY, consistent two-table path)"

patterns-established:
  - "Two-table quiz write: nodeProgress (mastery) + quizProgress (SRS signals) always co-updated on pass"
  - "lapseCount FSRS seed: SQL CASE guards increment — cannot be reconstructed retroactively"
  - "Quiz fail never touches nodeProgress — mastery only advances, never degrades"

requirements-completed: [QUIZ-02]

coverage:
  - id: D1
    description: "recordQuizPassHandler stamps source=quiz, masteryState=mastered, patchId=CURRENT_PATCH.id server-side; forged fields in data are stripped"
    requirement: QUIZ-02
    verification:
      - kind: unit
        ref: "src/server/quiz.test.ts#recordQuizPassHandler stamps source='quiz' regardless of any source field in data"
        status: pass
      - kind: unit
        ref: "src/server/quiz.test.ts#recordQuizPassHandler stamps masteryState='mastered' regardless of any masteryState in data"
        status: pass
      - kind: unit
        ref: "src/server/quiz.test.ts#recordQuizPassHandler stamps patchId=CURRENT_PATCH.id regardless of any patchId in data"
        status: pass
      - kind: unit
        ref: "src/server/quiz.test.ts#recordQuizPassHandler writes userId from principal.id, not from any forged field in data"
        status: pass
    human_judgment: false
  - id: D2
    description: "recordQuizPassHandler produces two insert/values calls — nodeProgress then quizProgress; quizProgress carries passed=true and attemptCount=1"
    requirement: QUIZ-02
    verification:
      - kind: unit
        ref: "src/server/quiz.test.ts#recordQuizPassHandler produces TWO insert/values calls (nodeProgress then quizProgress)"
        status: pass
      - kind: unit
        ref: "src/server/quiz.test.ts#recordQuizPassHandler quizProgress values carry passed=true and attemptCount=1 on first insert"
        status: pass
    human_judgment: false
  - id: D3
    description: "recordQuizAttemptHandler fail path writes quizProgress only — nodeProgress untouched (D-12: fail never changes mastery)"
    requirement: QUIZ-02
    verification:
      - kind: unit
        ref: "src/server/quiz.test.ts#recordQuizAttemptHandler on passed=false produces ONE insert to quizProgress only"
        status: pass
      - kind: unit
        ref: "src/server/quiz.test.ts#recordQuizAttemptHandler on passed=false sets passed=false in the quizProgress upsert"
        status: pass
    human_judgment: false
  - id: D4
    description: "recordQuizAttempt exported as createServerFn POST with authMiddleware — principal-keyed per ADR-007"
    requirement: QUIZ-02
    verification:
      - kind: unit
        ref: "src/server/quiz.test.ts#recordQuizAttemptHandler on passed=true delegates to the pass path"
        status: pass
    human_judgment: false

duration: 3min
completed: 2026-06-30
status: complete
---

# Phase 06 Plan 05: Quiz Server Functions Summary

**Principal-keyed quiz-pass write path (ADR-007) with two-table upsert — nodeProgress stamped mastered+quiz+CURRENT_PATCH, quizProgress SRS signals with lapseCount FSRS hook; 11 server-stamp regression tests pass**

## Performance

- **Duration:** 3 min
- **Started:** 2026-06-30T20:53:32Z
- **Completed:** 2026-06-30T20:56:26Z
- **Tasks:** 2 (RED + GREEN)
- **Files modified:** 2 created

## Accomplishments

- `recordQuizPass` / `recordQuizPassHandler`: two-table upsert, stamps `source:"quiz"` + `masteryState:"mastered"` + `CURRENT_PATCH.id` server-side; `RecordQuizPassInput` has `nodeId` only — Zod strips any forged fields
- `recordQuizAttempt` / `recordQuizAttemptHandler`: delegates to pass path on `passed=true`; fail path upserts `quizProgress` only (nodeProgress untouched per D-12)
- lapseCount via `SQL CASE WHEN quizProgress.passed THEN lapseCount + 1 ELSE lapseCount END` — FSRS forward hook, increments only on fail-after-pass (D-08, Pitfall 6)
- 11 server-stamp regression tests written RED-first, all GREEN after implementation; `tsc --noEmit` exits 0

## Task Commits (TDD)

1. **Task 1: Write failing server-stamp tests (RED)** - `8e6e1ae` (test)
2. **Task 2: Implement quiz server functions (GREEN)** - `2f8758c` (feat)

## Files Created/Modified

- `/home/eirikmo/projects/wc3roadmap/src/server/quiz.ts` - RecordQuizPassInput, recordQuizPassHandler, recordQuizPass, RecordQuizAttemptInput, recordQuizAttemptHandler, recordQuizAttempt; two-table upsert; lapseCount CASE expression
- `/home/eirikmo/projects/wc3roadmap/src/server/quiz.test.ts` - 11 server-stamp regression tests (vi.doMock + vi.resetModules + dynamic import pattern; mirrors progress.test.ts)

## Decisions Made

- `RecordQuizPassInput` has only `nodeId` — no `userId`/`source`/`masteryState`/`patchId`; Zod strips extras at parse (defense-in-depth for T-06-05-01/T-06-05-02)
- lapseCount SQL CASE guards the increment — must read existing row's `passed` value; a pre-pass fail is not a lapse
- Fail path writes `quizProgress` only — nodeProgress mastery state never degrades (D-12)
- `recordQuizAttemptHandler(passed=true)` delegates to `recordQuizPassHandler` — DRY, consistent two-table path
- `createServerFn` lexically visible at definition site — no factory wrapper (ADR-007; TanStack Start compiler requires static extraction)

## Deviations from Plan

None - plan executed exactly as written. TDD sequence: RED (Task 1 commit `8e6e1ae`) then GREEN (Task 2 commit `2f8758c`).

## TDD Gate Compliance

- RED gate commit: `8e6e1ae` — `test(06-05): add failing server-stamp regression tests (RED)` — 11 tests failing on missing `#/server/quiz`
- GREEN gate commit: `2f8758c` — `feat(06-05): implement quiz server functions (GREEN)` — all 11 tests pass

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `recordQuizPass` and `recordQuizAttempt` are ready for consumption by `useQuizPassMutation` (06-09)
- `recordQuizAttemptHandler` accepts `{ nodeId, passed }` — the grading engine (06-06) computes `passed` and passes it through
- lapseCount seed data will be available from day one of the quiz feature

---
*Phase: 06-self-assessment-quizzes*
*Completed: 2026-06-30*
