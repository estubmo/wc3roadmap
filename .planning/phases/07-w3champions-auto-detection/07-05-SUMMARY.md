---
phase: 07-w3champions-auto-detection
plan: 05
subsystem: api
tags: [auto-detection, pure-function, deep-module, mmr-tiers, tdd, vitest]

# Dependency graph
requires:
  - phase: 07-01
    provides: mmr-tiers.ts ordinal registry (tierIndex) for mmrTier gte comparison
  - phase: 07-04
    provides: AutoDetectCriteriaSchema (mmrTier|gamesPlayed discriminated union) in src/schemas/node.ts
provides:
  - "detectMasterySignals(nodes, signals, existingProgressNodeIds) — pure zero-I/O eligibility function"
  - "AutoDetectableNode + W3cSignals exported interfaces (input contract for the sync server fn)"
  - "Structural AUTO-03 (MECHANIC-only) + D-05 (untouched-only) guarantees, unit-proven"
affects: [07-07, syncW3championsHandler, w3champions-sync]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure deep module: 3-arg interface hiding MECHANIC-filter + untouched-filter + ordinal-threshold logic"
    - "Ordinal tier comparison via tierIndex registry (never string compare) — mirrors patches.ts precedent"

key-files:
  created:
    - src/lib/detect-mastery-signals.ts
    - src/lib/detect-mastery-signals.test.ts
  modified: []

key-decisions:
  - "detectMasterySignals is PURE — only dependency is ./mmr-tiers; zero db/fetch/auth imports (caller owns I/O)"
  - "Filter order runs the two structural guarantees first (MECHANIC-only, then untouched-only) before any threshold evaluation"
  - "mmrTier === null (unranked, D-10c) short-circuits meetsThreshold to false regardless of gte"

patterns-established:
  - "Pattern: pure detection function unit-tested with plain fixtures, no mocking (mirrors mmr-tiers.test.ts)"

requirements-completed: [AUTO-03]

coverage:
  - id: D1
    description: "CONCEPTUAL nodes can never auto-advance — MECHANIC-only structural filter (AUTO-03, T-07-05a)"
    requirement: "AUTO-03"
    verification:
      - kind: unit
        ref: "src/lib/detect-mastery-signals.test.ts#CONCEPTUAL nodes never emit"
        status: pass
    human_judgment: false
  - id: D2
    description: "Nodes with an existing progress row are never emitted — untouched-only filter (D-05, T-07-05b)"
    verification:
      - kind: unit
        ref: "src/lib/detect-mastery-signals.test.ts#untouched-only (D-05, T-07-05b)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Single signal+threshold match (D-02): gamesPlayed inclusive gte, mmrTier ordinal via tierIndex, null unranked never fires (D-10c)"
    verification:
      - kind: unit
        ref: "src/lib/detect-mastery-signals.test.ts#gamesPlayed threshold / mmrTier ordinal threshold / unranked signal"
        status: pass
    human_judgment: false

# Metrics
duration: 2min
completed: 2026-07-01
status: complete
---

# Phase 07 Plan 05: detect-mastery-signals Summary

**Pure zero-I/O `detectMasterySignals` deep module emitting MECHANIC-only, untouched-only, ordinal-threshold auto-advance candidates — AUTO-03 and D-05 proven by 14 Wave-0 unit tests.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-07-01T18:02:xxZ
- **Completed:** 2026-07-01T18:04:25Z
- **Tasks:** 2
- **Files modified:** 2 (both created)

## Accomplishments
- `detectMasterySignals(nodes, signals, existingProgressNodeIds)` — a 3-argument pure filter chain hiding the MECHANIC-filter (AUTO-03), untouched-filter (D-05), and single signal+threshold comparison (D-02).
- Structural guarantees are unit-proven: a CONCEPTUAL node is filtered out before any criterion is evaluated (T-07-05a), and a node in `existingProgressNodeIds` is never emitted (T-07-05b).
- Ordinal mmrTier comparison delegates to `tierIndex` (07-01 registry); unranked `mmrTier === null` short-circuits to false (D-10c). gamesPlayed uses an inclusive `>= gte` boundary.
- Zero I/O: the module imports nothing from db, fetch, or auth — its sole dependency is the pure `./mmr-tiers`. The caller (07-07) owns fetch + cache + persistence.

## Task Commits

Each task was committed atomically (TDD RED → GREEN):

1. **Task 1: Wave-0 unit test (RED)** - `4202744` (test)
2. **Task 2: detectMasterySignals implementation (GREEN)** - `7723f50` (feat)

**Plan metadata:** docs commit (this SUMMARY + STATE + ROADMAP)

_No REFACTOR commit needed — the GREEN implementation matched the RESEARCH Pattern 3 reference cleanly._

## Files Created/Modified
- `src/lib/detect-mastery-signals.ts` - Pure `detectMasterySignals` + `AutoDetectableNode` + `W3cSignals` exports; private `meetsThreshold`.
- `src/lib/detect-mastery-signals.test.ts` - 14 Wave-0 tests covering AUTO-03 "CONCEPTUAL", D-05 "untouched", gamesPlayed boundary, mmrTier ordinal threshold, D-10c null-unranked, and output shape.

## Decisions Made
- Kept the interface field names (`AutoDetectableNode`, `W3cSignals`) exactly as RESEARCH Pattern 3 designed them against the real `NodeSummary`/`nodeType` shape — no drift.
- `AutoDetectableNode` is a structural subset of `NodeFrontmatter` rather than importing the Zod-inferred type, keeping the pure module free of schema/zod coupling (deep-module discipline).

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `detectMasterySignals` is ready to be wired into `syncW3championsHandler` (07-07) after fetch + existing-progress load.
- The caller must cap `masteryState: "in-progress"` (D-04), hardcode `source: "auto"`, and use a plain additive insert that never overwrites (D-05/D-06) — this function only proposes untouched candidates.

## Self-Check: PASSED
- FOUND: src/lib/detect-mastery-signals.ts
- FOUND: src/lib/detect-mastery-signals.test.ts
- FOUND: commit 4202744 (test RED)
- FOUND: commit 7723f50 (feat GREEN)

---
*Phase: 07-w3champions-auto-detection*
*Completed: 2026-07-01*
