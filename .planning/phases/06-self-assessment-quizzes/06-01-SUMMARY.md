---
phase: 06-self-assessment-quizzes
plan: "01"
subsystem: schemas
tags: [quiz, schema, validation, content-collections, zod]
depends_on:
  requires: []
  provides: [QuizSchema, QuizQuestionSchema, QuizOptionSchema, quiz-field-on-NodeFrontmatterSchema]
  affects: [src/schemas/node.ts, content-collections.ts, src/schemas/node.test.ts]
tech_stack:
  added: []
  patterns: [parallel-schema-sync, superRefine-exactly-one-correct, Zod-v4-error-idiom]
key_files:
  created: []
  modified:
    - src/schemas/node.ts
    - content-collections.ts
    - src/schemas/node.test.ts
decisions:
  - "QuizSchema defined as z.array(QuizQuestionSchema).min(3).max(5) — enforces QUIZ-01 at both runtime and build time"
  - "QuizQuestionSchema uses superRefine to count isCorrect===true options — exactly-one-correct is a structural parse-time constraint (QUIZ-03)"
  - "explanation is a required z.string().min(1) on QuizQuestionSchema — forces authors to justify recall depth (QUIZ-03 guardrail)"
  - "quiz: QuizSchema.optional() on NodeFrontmatterSchema — D-04 graceful default; no quiz = no CTA button"
  - "QuizQuestionSchema is not exported (private to node.ts); question-level tests go through QuizSchema to avoid leaking internal structure"
  - "content-collections.ts transform adds belt-and-suspenders count guard (throws on <3 or >5) even though Zod schema already rejects these at parse time"
metrics:
  duration: 5m
  completed: "2026-06-30"
  tasks_completed: 3
  files_modified: 3
status: complete
---

# Phase 6 Plan 1: Quiz Schema Foundation Summary

QuizSchema with 3–5 multiple-choice questions, exactly-one-correct superRefine, and required explanation enforced in both src/schemas/node.ts (runtime/test) and content-collections.ts (build-time) — parallel-schema sync maintained. 18 new unit tests pass.

## What Was Built

### Task 1 — QuizSchema in src/schemas/node.ts (commit 10a6536)

Added three new Zod schemas and their inferred types:

- `QuizOptionSchema` — `{ text: string.min(1), isCorrect: boolean }`
- `QuizQuestionSchema` — `{ text, options(2–5, superRefine exactly-one-correct), explanation(required) }`
- `QuizSchema` — `z.array(QuizQuestionSchema).min(3).max(5)`

Exported types: `QuizOption`, `QuizQuestion`, `Quiz`.

Added `quiz: QuizSchema.optional()` to `NodeFrontmatterSchema.extend({})`. PARALLEL-SCHEMA SYNC NOTE comment added pointing to content-collections.ts.

### Task 2 — Mirror quiz schema + count guard into content-collections.ts (commit e191936)

Mirrored the quiz schema field-for-field as an inline `quiz:` field in the content-collections schema object. Includes `superRefine` exactly-one-correct and `explanation` required enforcement at build time.

Added a belt-and-suspenders count guard in `transform()` that throws with a named-node error message if `document.quiz.length < 3 || > 5`. Zod superRefine handles exactly-one-correct and explanation at parse time (before transform runs); noted in a comment.

Build passes for all 13 existing nodes (none have a quiz field — all are treated as `quiz: undefined`).

### Task 3 — QuizSchema tests in src/schemas/node.test.ts (commit ecf0fd5)

Added `describe("QuizSchema", ...)` and sibling blocks. 18 new test cases:

**QUIZ-01 count bounds:** accepts 3/4/5 questions; rejects 0, 2, 6.

**QUIZ-03 exactly-one-correct:** rejects question with 0 correct options; rejects question with 2 correct options.

**QUIZ-03 explanation required:** rejects question with missing `explanation`; rejects question with `explanation: ""`.

**D-04 graceful default:** `NodeFrontmatterSchema` accepts CONCEPTUAL node with quiz omitted (undefined); accepts CONCEPTUAL node with valid 3-question quiz.

Total test suite: 55 tests (37 pre-existing + 18 new). All pass.

## Verification

```
npx tsc --noEmit            → 0 errors
npm run build:content       → 13 documents, 0 errors
npx vitest run node.test.ts → 55 tests passed
```

## Deviations from Plan

None — plan executed exactly as written.

`QuizQuestionSchema` was kept unexported (internal to node.ts). The plan action said "import `QuizSchema` (and `NodeFrontmatterSchema`)" for the test file. Question-level validation is tested through `QuizSchema` by constructing 3-question arrays with one invalid question — this is consistent with the exported API surface.

## Threat Surface Scan

No new network endpoints or auth paths introduced. Schema changes are build-time/runtime validation only — same trust boundary as existing citation schemas (MDX author → content pipeline).

T-06-01 mitigated: Zod `.min(3).max(5)` + `superRefine` exactly-one-correct + required `explanation` fail the build.
T-06-02 mitigated: Both files updated in the same commit wave; sync note comments in both; build validates content shape, tests validate runtime shape.

## Self-Check: PASSED

| Item | Status |
|------|--------|
| src/schemas/node.ts | FOUND |
| content-collections.ts | FOUND |
| src/schemas/node.test.ts | FOUND |
| 06-01-SUMMARY.md | FOUND |
| Commit 10a6536 (feat: QuizSchema in node.ts) | FOUND |
| Commit e191936 (feat: mirror to content-collections) | FOUND |
| Commit ecf0fd5 (test: quiz schema tests) | FOUND |
