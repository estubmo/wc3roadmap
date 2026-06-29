---
phase: 02-graph-engine
plan: "05"
subsystem: content
tags: [pathway, validation, ci, zod, typescript]

requires:
  - phase: 02-02
    provides: PathwaySchema (Zod contract for pathway data files)
  - phase: 02-03
    provides: 13 seed nodes in content/nodes/ whose IDs steps reference

provides:
  - pathways/beginner-fundamentals.json — 8-step ordered pathway, schema-valid
  - scripts/validate-pathway.ts — pure validatePathwayStepIds validator
  - scripts/validate-pathway.test.ts — 6-test suite for the validator
  - validate-content.ts extended with pathway integrity check (4th validator)

affects:
  - 02-10 (route loader that parses this same JSON with PathwaySchema)
  - 09 (pathway content expansion and progress tracking)

tech-stack:
  added: []
  patterns:
    - "Pure validator pattern: pure fn accepting plain inputs, returning string[], aggregated by validate-content.ts orchestrator — same as validatePrerequisiteIds"
    - "PathwaySchema.safeParse at validation time — push schema error, skip integrity if parse fails (T-02-08)"

key-files:
  created:
    - pathways/beginner-fundamentals.json
    - scripts/validate-pathway.ts
    - scripts/validate-pathway.test.ts
  modified:
    - scripts/validate-content.ts

key-decisions:
  - "8-step pathway (supply-management → map-control → scouting → hotkey-discipline → hero-leveling → creep-routing → resource-banking → army-positioning) — roots first, dependents after, respecting prerequisite DAG"
  - "validatePathwayStepIds accepts plain { id, steps } and ReadonlySet<string> — decoupled from content-collections, fully unit-testable, mirrors validatePrerequisiteIds"
  - "No new npm script or CI edit — pathway check wired into existing validate-content.ts main() as 4th validator"

patterns-established:
  - "Pathway integrity validator: same pure validator + orchestrator aggregation pattern as node prerequisite validators"

requirements-completed: [GRAPH-01]

coverage:
  - id: D1
    description: "pathways/beginner-fundamentals.json — 8 ordered steps, schema-valid, subtitle matches UI-SPEC"
    requirement: GRAPH-01
    verification:
      - kind: unit
        ref: "node -e validation: step count 8, in range 8-12"
        status: pass
      - kind: integration
        ref: "npm run build:content && npm run validate — passes with valid pathway"
        status: pass
    human_judgment: false
  - id: D2
    description: "validatePathwayStepIds pure validator with 6-test suite"
    verification:
      - kind: unit
        ref: "scripts/validate-pathway.test.ts — 6 tests"
        status: pass
    human_judgment: false
  - id: D3
    description: "validate-content.ts extended — 4th validator, fails on bogus step ID, no new npm script"
    verification:
      - kind: integration
        ref: "npm run validate with bogus step ID injected — exit non-zero with descriptive error"
        status: pass
    human_judgment: false

duration: 8min
completed: 2026-06-29
status: complete
---

# Phase 02 Plan 05: Beginner Fundamentals Pathway + CI Integrity Check Summary

**Beginner Fundamentals pathway JSON (8 ordered steps) + pure validatePathwayStepIds validator wired into existing validate-content.ts orchestrator as the 4th CI check**

## Performance

- **Duration:** 8 min
- **Started:** 2026-06-29T01:38:18Z
- **Completed:** 2026-06-29T01:46:00Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- Created `pathways/beginner-fundamentals.json` with id, title, subtitle, and 8 ordered step IDs following the prerequisite DAG (roots first)
- Created `scripts/validate-pathway.ts` — pure `validatePathwayStepIds` function mirroring the `validatePrerequisiteIds` pattern; no fs or content-collections imports; fully unit-testable
- Extended `scripts/validate-content.ts` main() with a 4th validator that reads, Zod-parses, and integrity-checks the pathway; no new npm script; CI fail verified on bogus step ID

## Task Commits

1. **Task 1: Author Beginner Fundamentals pathway JSON** - `82c8ea0` (feat)
2. **Task 2: Pathway integrity validator + test** - `8cb1280` (feat)
3. **Task 3: Wire pathway validation into validate-content orchestrator** - `261b5dc` (feat)

## Files Created/Modified

- `pathways/beginner-fundamentals.json` — 8-step ordered pathway matching UI-SPEC subtitle
- `scripts/validate-pathway.ts` — pure validatePathwayStepIds validator (deep module)
- `scripts/validate-pathway.test.ts` — 6 tests: all-resolve, single bad step, multiple bad steps, empty steps, error message format, large set
- `scripts/validate-content.ts` — extended main() with 4th pathway integrity check; updated JSDoc and pass output message

## Decisions Made

- **8 steps chosen:** supply-management, map-control, scouting, hotkey-discipline, hero-leveling, creep-routing, resource-banking, army-positioning — all are beginner or intermediate difficulty, roots appear before dependents, covers macro + micro + mental foundations
- **validatePathwayStepIds signature:** `(pathway: { id, steps }, nodeIds: ReadonlySet<string>): string[]` — decoupled from filesystem, mirrors validatePrerequisiteIds exactly
- **Orchestrator extension pattern:** readFileSync + JSON.parse + PathwaySchema.safeParse + validatePathwayStepIds results pushed to same errors[] — no structural change to main()

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Pathway data file and integrity check are complete; plan 10 route loader can parse `pathways/beginner-fundamentals.json` with `PathwaySchema` at load time
- Phase 9 can extend PathwaySchema with progress tracking fields without changing the existing validate-pathway.ts validator

---
*Phase: 02-graph-engine*
*Completed: 2026-06-29*
