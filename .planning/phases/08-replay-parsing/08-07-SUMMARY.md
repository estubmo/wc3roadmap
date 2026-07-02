---
phase: 08-replay-parsing
plan: 07
subsystem: content-schema
tags: [zod, discriminated-union, content-collections, parallel-schema-sync]

# Dependency graph
requires:
  - phase: 07-w3champions-integration
    provides: AutoDetectCriteriaSchema discriminated-union + parallel-schema-sync pattern (node.ts + content-collections.ts)
provides:
  - "ReplayCriteriaSchema in src/schemas/node.ts — discriminated union over 5 replay signals (buildOrderTiming, eapm, controlGroupUsage, heroTiming, expansionTiming)"
  - "NodeFrontmatterSchema.replayCriteria optional field"
  - "field-for-field inline mirror in content-collections.ts"
affects: [08-09-replay-thresholds, 08-10-build-order-content-nodes]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Second discriminated-union content-eligibility field on NodeFrontmatterSchema (after autoDetect), same parallel-schema-sync discipline"

key-files:
  created: []
  modified:
    - src/schemas/node.ts
    - src/schemas/node.test.ts
    - content-collections.ts

key-decisions:
  - "Five D-09 race-agnostic signals modeled as separate discriminated-union variants (buildOrderTiming, eapm, controlGroupUsage, heroTiming, expansionTiming), single signal+threshold per node per D-02 precedent — no compound rule engine"
  - "beforeMs used for timing-target signals (buildOrderTiming, heroTiming, expansionTiming); gte used for magnitude-threshold signals (eapm, controlGroupUsage) — mirrors the AutoDetectCriteriaSchema field-naming split"

patterns-established:
  - "ReplayCriteriaSchema mirrors AutoDetectCriteriaSchema's discriminated-union + PARALLEL-SCHEMA SYNC NOTE + optional-field-on-NodeFrontmatterSchema convention exactly — future per-node content-eligibility criteria should follow this same three-part shape (schema definition, JSDoc sync note, content-collections.ts inline mirror)"

requirements-completed: [REPLAY-06, REPLAY-08]

coverage:
  - id: D1
    description: "ReplayCriteriaSchema parses each of the 5 D-09 signal variants and rejects unknown discriminants"
    requirement: REPLAY-06
    verification:
      - kind: unit
        ref: "src/schemas/node.test.ts#ReplayCriteriaSchema — signal variants"
        status: pass
    human_judgment: false
  - id: D2
    description: "NodeFrontmatterSchema accepts nodes with and without replayCriteria (graceful default, never advance from replay)"
    requirement: REPLAY-06
    verification:
      - kind: unit
        ref: "src/schemas/node.test.ts#NodeFrontmatterSchema — replayCriteria (REPLAY-06/08)"
        status: pass
    human_judgment: false
  - id: D3
    description: "content-collections.ts inline replayCriteria mirror is field-for-field identical to ReplayCriteriaSchema and the content build succeeds with it present"
    requirement: REPLAY-08
    verification:
      - kind: integration
        ref: "npm run build:content"
        status: pass
    human_judgment: false

# Metrics
duration: 12min
completed: 2026-07-02
status: complete
---

# Phase 08 Plan 07: Replay-Criteria Content Schema Summary

**ReplayCriteriaSchema (5-signal discriminated union) added to node.ts and mirrored field-for-field in content-collections.ts, so MECHANIC nodes can declare a single replay-mastery criterion in frontmatter.**

## Performance

- **Duration:** 12 min
- **Completed:** 2026-07-02T10:33:10Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- `ReplayCriteriaSchema` in `src/schemas/node.ts` — discriminated union over `buildOrderTiming`, `eapm`, `controlGroupUsage`, `heroTiming`, `expansionTiming`, each a single signal+threshold
- `NodeFrontmatterSchema.replayCriteria` optional field with graceful-absent default (never advance from replay if omitted)
- Field-for-field inline mirror added to `content-collections.ts` alongside the existing `autoDetect` mirror, with a cross-referencing PARALLEL-SCHEMA SYNC NOTE
- 12 new unit tests covering all 5 signal variants, unknown-discriminant rejection, wrong-field-name rejection (`beforeMs` on `eapm`), and the `NodeFrontmatterSchema` optional-field contract

## Task Commits

Each task was committed atomically:

1. **Task 1: ReplayCriteriaSchema in node.ts** - `eee0be9` (feat)
2. **Task 2: Mirror replayCriteria in content-collections.ts** - `026d517` (feat)

**Plan metadata:** (this commit)

## Files Created/Modified
- `src/schemas/node.ts` - Added `ReplayCriteriaSchema` (5-signal discriminated union) + inferred `ReplayCriteria` type + `NodeFrontmatterSchema.replayCriteria` optional field
- `src/schemas/node.test.ts` - Added `ReplayCriteriaSchema` and `NodeFrontmatterSchema — replayCriteria` describe blocks (12 tests)
- `content-collections.ts` - Added inline `replayCriteria` discriminated-union field mirroring `ReplayCriteriaSchema`, field-for-field

## Decisions Made
- Modeled all 5 D-09 signals as top-level discriminated-union variants (not nested under a shared timing/magnitude sub-shape) — matches the flat style of the existing `AutoDetectCriteriaSchema` variants and keeps each variant self-documenting.
- `beforeMs: z.number().int().positive()` for the three timing signals; `gte: z.number().int().positive()` for the two magnitude signals — no cross-signal field reuse, so an `eapm` criterion cannot accidentally be authored with `beforeMs` (verified by a dedicated rejection test).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `ReplayCriteriaSchema` is ready for the pure threshold detector (08-09) to read `node.replayCriteria` against parsed replay signals.
- The four canonical build-order nodes (08-10) now have a schema field (`replayCriteria: { signal: "buildOrderTiming", beforeMs: ... }`) to fill.
- No blockers.

---
*Phase: 08-replay-parsing*
*Completed: 2026-07-02*

## Self-Check: PASSED

All created/modified files found on disk; both task commits (`eee0be9`, `026d517`) found in git log.
