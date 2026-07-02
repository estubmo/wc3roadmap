---
phase: 08-replay-parsing
plan: 02
subsystem: database
tags: [zod, vitest, mastery-ordinal, progress-schema]

# Dependency graph
requires:
  - phase: 05-progress-tracking
    provides: ProgressRecordSchema, MasteryStateSchema (D-03, D-04)
  - phase: 07-w3champions-auto-detection
    provides: mmr-tiers.ts ordinal-registry pattern (private array + readonly view + indexFn)
provides:
  - masteryStateIndex() ordinal helper for monotonic-max mastery comparisons (D-04)
  - MASTERY_STATES readonly registry view
  - ProgressRecordSchema.source enum extended with "replay" (D-01, Zod layer)
affects: [08-03, 08-04, 08-05, 08-06, replay write-path plans]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Ordinal-registry pattern reused a third time (patches.ts -> mmr-tiers.ts -> mastery-ordinal.ts): private array + public readonly view + pure indexFn"

key-files:
  created:
    - src/lib/mastery-ordinal.ts
    - src/lib/mastery-ordinal.test.ts
  modified:
    - src/schemas/progress.ts

key-decisions:
  - "masteryStateIndex ordinal order is the drift-guarded mirror of MasteryStateSchema.options — a runtime test (not just a comment) asserts they stay in sync (Pitfall 5)"
  - "source enum extended to include replay; DB source column is text() already, so no DDL/migration is required for this plan (D-01) — schema.ts comment update deferred to 08-06"

patterns-established:
  - "Ordinal-registry pattern (private const array `as const satisfies`, public readonly view, pure findIndex-based lookup) is now the standard idiom for any enum needing ordinal/monotonic comparison in this codebase"

requirements-completed: [REPLAY-06]

coverage:
  - id: D1
    description: "masteryStateIndex() returns 0/1/2 for untouched/in-progress/mastered and -1 for unknown ids, with a runtime drift-guard against MasteryStateSchema.options"
    requirement: "REPLAY-06"
    verification:
      - kind: unit
        ref: "src/lib/mastery-ordinal.test.ts"
        status: pass
    human_judgment: false
  - id: D2
    description: "ProgressRecordSchema.source enum accepts 'replay' as a valid value while keeping default 'manual', with no DDL change"
    requirement: "REPLAY-06"
    verification:
      - kind: unit
        ref: "src/schemas (124 tests, full suite green including progress.ts consumers)"
        status: pass
    human_judgment: false

# Metrics
duration: 8min
completed: 2026-07-02
status: complete
---

# Phase 08 Plan 02: Mastery Ordinal Registry + Replay Source Enum Summary

**Ordinal registry helper (`masteryStateIndex`) for monotonic-max mastery comparisons, plus `"replay"` added to the progress `source` enum — the two smallest, purely-additive foundations the replay write path depends on.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-07-02T12:15:00Z (approx)
- **Completed:** 2026-07-02T12:23:22Z
- **Tasks:** 2 completed
- **Files modified:** 3 (2 created, 1 modified)

## Accomplishments
- Created `src/lib/mastery-ordinal.ts` mirroring the `mmr-tiers.ts` ordinal-registry pattern: private `_MASTERY_STATES` array (`untouched`=0, `in-progress`=1, `mastered`=2), public readonly `MASTERY_STATES` view, and `masteryStateIndex(id)` returning -1 for unknown ids
- Added a runtime drift-guard test asserting `MASTERY_STATES` ids equal `MasteryStateSchema.options` in order — a future schema reorder now fails loudly here instead of silently corrupting the monotonic-max write comparison
- Extended `ProgressRecordSchema.source` enum from `["manual","auto","quiz"]` to `["manual","auto","quiz","replay"]` (default unchanged: `"manual"`), with JSDoc documenting `replay` as server-stamped-only, mastered-capable, and monotonic-max-upserted (D-01)

## Task Commits

Each task was committed atomically (TDD RED/GREEN for Task 1):

1. **Task 1 RED: failing test for masteryStateIndex** - `623599c` (test)
2. **Task 1 GREEN: implement masteryStateIndex ordinal registry** - `d1f7f10` (feat)
3. **Task 2: Extend progress source enum with "replay" (D-01)** - `d67af25` (feat)

_TDD task (Task 1) used two commits (test → feat) per the RED/GREEN gate; RED confirmed by temporarily removing the implementation file and re-running vitest before restoring it._

## Files Created/Modified
- `src/lib/mastery-ordinal.ts` - Ordinal registry (`MASTERY_STATES`) + `masteryStateIndex()` pure lookup helper
- `src/lib/mastery-ordinal.test.ts` - Ordinal correctness tests + drift-guard against `MasteryStateSchema.options`
- `src/schemas/progress.ts` - `source` enum extended with `"replay"`; JSDoc documents replay semantics (D-01)

## Decisions Made
- Mirrored `mmr-tiers.ts` exactly (private array + `as const satisfies` + readonly public view + pure `findIndex` helper) rather than introducing a new pattern — this is now the third instance of the ordinal-registry idiom in the codebase (`patches.ts`, `mmr-tiers.ts`, `mastery-ordinal.ts`)
- Did not touch `src/db/schema.ts` — the `source` column is already `text()` (no `pgEnum`), so widening the Zod enum requires zero DDL/migration (D-01). The schema.ts comment documenting the widened set is deferred to plan 08-06 per the plan's explicit scope boundary.

## Deviations from Plan

None — plan executed exactly as written. Task 1 followed the TDD RED/GREEN protocol explicitly (temporarily removed the implementation to confirm the test fails on `Cannot find module` before restoring it and confirming green), matching the plan's `tdd="true"` task attribute.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `masteryStateIndex()` and `MASTERY_STATES` are available for the replay write-path plans (08-03 onward) to implement the monotonic-max upsert comparison (D-04)
- `source: "replay"` is now a valid, typed value at the Zod layer; the server-side write path (later plans) is responsible for stamping it exclusively server-side (never trusting client input) — flagged in the plan's threat register as T-08-02a (accept, enforced at write sites in 08-11)
- No blockers for downstream 08-xx plans

---
*Phase: 08-replay-parsing*
*Completed: 2026-07-02*

## Self-Check: PASSED

- FOUND: src/lib/mastery-ordinal.ts
- FOUND: src/lib/mastery-ordinal.test.ts
- FOUND: "replay" in src/schemas/progress.ts
- FOUND: commit 623599c
- FOUND: commit d1f7f10
- FOUND: commit d67af25
