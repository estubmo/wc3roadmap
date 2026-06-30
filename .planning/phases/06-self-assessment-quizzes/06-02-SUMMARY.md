---
phase: 06-self-assessment-quizzes
plan: "02"
subsystem: persistence
tags: [drizzle, schema, quiz, progress, srs]
status: complete

dependency_graph:
  requires: [06-01]
  provides: [quiz_progress table, source enum with quiz, quizProgress relations]
  affects: [06-05 recordQuizPass server fn, future SRS scheduler]

tech_stack:
  added: []
  patterns:
    - quizProgress table mirrors nodeProgress structural template
    - boolean + integer pg-core types added to schema imports
    - source enum widened at Zod layer (no DDL change) — TEXT column pattern

key_files:
  created: []
  modified:
    - src/schemas/progress.ts
    - src/db/schema.ts

decisions:
  - source: z.enum([manual, auto, quiz]) — quiz value stamped server-side only by recordQuizPass (D-12/D-13)
  - quizProgress separate from nodeProgress — mastery display decoupled from SRS retention model (D-07)
  - lapseCount designed in now — cannot reconstruct from attemptCount retroactively (D-08 FSRS forward hook)
  - boolean + integer added to pg-core imports; TEXT not pgEnum for quiz fields (same pattern as masteryState)

metrics:
  duration: 6m
  completed: "2026-06-30"
---

# Phase 6 Plan 02: Quiz Persistence Schema Summary

Persistence foundation for quiz-driven mastery: source enum widened to `manual|auto|quiz`, and a separate `quizProgress` Drizzle table added with all SRS seed fields.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Widen source enum in src/schemas/progress.ts | f9083b3 | src/schemas/progress.ts |
| 2 | Add quizProgress table + relations to src/db/schema.ts | 67a70b2 | src/db/schema.ts |
| 3 | [BLOCKED] Apply quizProgress table to Neon via drizzle-kit push | — | — |

## Task 3 Blocker — DB Push

**Status:** BLOCKED — `DATABASE_URL_DIRECT` not set in this environment.

**What was done:** Schema code and Drizzle definitions are complete and TypeScript-verified (`npx tsc --noEmit` exits 0). The `quiz_progress` table DDL is ready to push.

**What the user must do:**

```bash
# Set the non-pooled direct connection string from Neon Console ("Direct connection" toggle)
export DATABASE_URL_DIRECT="postgresql://..."

# Apply the quiz_progress table to Neon
cd /home/eirikmo/projects/wc3roadmap
npx drizzle-kit push
```

**Expected output:** drizzle-kit reports `quiz_progress` table created (or already in sync on re-run). No interactive prompts expected — additive table with no rename ambiguity.

**Why this is BLOCKING:** TypeScript compiles from the schema file, not the live DB. The 06-05 server function (`recordQuizPass`) will fail at runtime with a "relation does not exist" error if the push is skipped. The push MUST run before 06-05 is executed.

## Deviations from Plan

None — plan executed exactly as written for Tasks 1 and 2. Task 3 blocked by missing credentials (expected for CI-like environment without DB access).

## Artifacts Produced

### src/schemas/progress.ts

- `source` enum widened: `z.enum(["manual", "auto", "quiz"]).default("manual")`
- JSDoc updated: `"quiz"` stamped only by `recordQuizPass` server fn (D-13)

### src/db/schema.ts

- `integer` added to drizzle pg-core imports (alongside existing `boolean`)
- `quizProgress` pgTable defined with 9 columns:
  - `id` text PK
  - `userId` text FK → users.id (cascade)
  - `nodeId` text
  - `passed` boolean default false
  - `lastAttemptAt` timestamp defaultNow
  - `attemptCount` integer default 0
  - `lapseCount` integer default 0 (FSRS forward hook — D-08)
  - `createdAt` / `updatedAt` timestamps
- `uniqueIndex("quiz_progress_user_node_unique")` on (userId, nodeId) — upsert target
- `index("quiz_progress_userId_idx")` on userId — covering index (T-06-05)
- `quizProgressRelations` exported with `user` one relation
- `quizProgress: many(quizProgress)` added to `usersRelations`

## Threat Surface Scan

No new trust boundaries introduced beyond what the plan's threat model covers. All new surface matches T-06-03/T-06-04/T-06-05 in the plan's STRIDE register:
- `source` TEXT enforced at Zod layer (T-06-03)
- `userId` FK with cascade (T-06-04)
- `quiz_progress_userId_idx` covering index (T-06-05)

## Known Stubs

None. This plan is schema-only — no UI components or data bindings.

## Self-Check: PASSED

- `src/schemas/progress.ts` — `"quiz"` present in source enum ✓
- `src/db/schema.ts` — `quizProgress` table with all 9 columns including `lapseCount` ✓
- `quizProgressRelations` exported ✓
- `quizProgress: many(quizProgress)` in `usersRelations` ✓
- `npx tsc --noEmit` — exits 0 ✓
- Commits f9083b3 and 67a70b2 exist ✓
