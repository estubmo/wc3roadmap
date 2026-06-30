---
phase: 06-self-assessment-quizzes
plan: "04"
subsystem: quiz-grading
status: complete
tags: [tdd, pure-utility, quiz, grading]
dependency_graph:
  requires: [06-01]
  provides: [quiz-grading-engine]
  affects: [06-05, 06-09]
tech_stack:
  added: []
  patterns: [pure-module, fisher-yates-shuffle, deep-module]
key_files:
  created:
    - src/lib/quiz-grading.ts
    - src/lib/quiz-grading.test.ts
  modified: []
decisions:
  - PASS_THRESHOLD explicit table {3:3,4:3,5:4} encodes D-05; 3q=3/3 not 2/3 (Pitfall 2 avoided)
  - gradeAnswers grades by isCorrect flag on shuffled option — no canonical-index remap needed (shuffle-by-value insight)
  - shuffle uses Fisher-Yates on a spread copy; prepareQuiz spreads questions too — source arrays never mutated
  - gradeQuiz throws for total outside {3,4,5}; undefined threshold signals author error at call site
metrics:
  duration: "2m"
  completed: "2026-06-30"
  tasks_completed: 2
  tests_passed: 35
---

# Phase 06 Plan 04: Quiz Grading Engine Summary

**One-liner:** Pure Fisher-Yates shuffle + explicit PASS_THRESHOLD table enforcing 3q→3/3, 4q→3/4, 5q→4/5 grading rules via `gradeQuiz`/`gradeAnswers`/`prepareQuiz`.

## What Was Built

A self-contained, dependency-free grading engine at `src/lib/quiz-grading.ts` satisfying QUIZ-02. The module exposes five exports behind a minimal interface:

- `PASS_THRESHOLD` — explicit `Record<number, number>` table `{3:3, 4:3, 5:4}` per D-05. The 3-question case is 3/3 (100%), not 2/3 — the "at most one wrong" heuristic does NOT apply to 3q.
- `gradeQuiz(total, correctCount)` — throws for totals outside {3,4,5}; returns `correctCount >= PASS_THRESHOLD[total]`.
- `gradeAnswers(shuffledQuestions, selectedOptionIndexes)` — grades by `isCorrect` flag on the shuffled option at the selected index; null selections count as missed; returns `{passed, correctCount, missedIndexes}`.
- `shuffle<T>(arr)` — Fisher-Yates on a spread copy; never mutates source.
- `prepareQuiz(questions)` — returns `shuffle(questions).map(q => ({...q, options: shuffle(q.options)}))`. Options carry their canonical `isCorrect` flags so no index remapping is needed at grade time.

## TDD Gate Compliance

| Gate | Commit | Status |
|------|--------|--------|
| RED (test) | 1cf562d | PASS — import fails on missing module |
| GREEN (impl) | 60a73f9 | PASS — 35/35 tests pass |
| REFACTOR | N/A | Not needed — implementation was clean |

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Write failing grading tests (RED) | 1cf562d | src/lib/quiz-grading.test.ts |
| 2 | Implement the grading engine (GREEN) | 60a73f9 | src/lib/quiz-grading.ts |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — this is a pure utility module with no UI or data-source wiring.

## Threat Flags

None — this plan introduces no new network endpoints, auth paths, or schema changes at trust boundaries. Client-side grading is an accepted tradeoff per T-06-07 (ADR 010; no money/competitive consequence, answer key stays in GPL MDX content).

## Self-Check: PASSED

- [x] `src/lib/quiz-grading.ts` exists
- [x] `src/lib/quiz-grading.test.ts` exists
- [x] Commit 1cf562d exists (RED gate)
- [x] Commit 60a73f9 exists (GREEN gate)
- [x] 35/35 tests pass (`npx vitest run src/lib/quiz-grading.test.ts`)
- [x] `npx tsc --noEmit` exits 0
