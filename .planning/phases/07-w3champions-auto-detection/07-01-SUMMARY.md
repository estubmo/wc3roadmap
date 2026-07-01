---
phase: 07-w3champions-auto-detection
plan: 01
subsystem: api
tags: [mmr, tiers, registry, ordinal, zod, w3champions, tdd]

# Dependency graph
requires:
  - phase: 01-foundation-schema
    provides: patches.ts singleton-registry pattern (private array + readonly view + ID tuple + lookup)
provides:
  - "src/lib/mmr-tiers.ts — project-owned ordinal MMR-tier registry (bronze..grandmaster)"
  - "TIER_IDS non-empty tuple for z.enum() in AutoDetectCriteriaSchema (07-04)"
  - "tierForMmr(mmr) — raw MMR integer to coarse tier id (07-06 client mmrTier signal)"
  - "tierIndex(id) — ordinal helper for gte threshold comparison (07-05 detectMasterySignals)"
affects: [07-04, 07-05, 07-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Singleton ordinal registry (patches.ts shape): private ascending _TIERS + readonly TIERS view + TIER_IDS tuple + pure lookups"
    - "Project-owned tier vocabulary decoupled from season-fragile w3champions League names (RESEARCH Pitfall 5)"

key-files:
  created:
    - src/lib/mmr-tiers.ts
    - src/lib/mmr-tiers.test.ts
  modified: []

key-decisions:
  - "Tier cutoffs are [ASSUMED] A3 round-number placeholders (bronze=0,silver=1000,gold=1200,platinum=1400,diamond=1600,master=1800,grandmaster=2000) — one-file recalibration, no migration (D-04 caps blast radius)"
  - "tierForMmr reverse-scans the ascending _TIERS (boundary-inclusive); tierIndex returns -1 for unknown ids (validated upstream via z.enum)"
  - "Plan behavior-block value tierForMmr(1453)===gold corrected to platinum — 1453 >= platinum cutoff 1400 per authoritative A3 cutoffs"

patterns-established:
  - "MMR-tier registry mirrors patches.ts exactly — future ordinal registries follow the same private-array/readonly-view/tuple/lookup shape"

requirements-completed: [AUTO-02]

coverage:
  - id: D1
    description: "tierForMmr maps a raw MMR integer to exactly one coarse tier id, boundary-inclusive, highest-qualifying"
    requirement: AUTO-02
    verification:
      - kind: unit
        ref: "src/lib/mmr-tiers.test.ts#tierForMmr — highest tier whose minMmr the mmr meets or exceeds (boundary inclusive)"
        status: pass
    human_judgment: false
  - id: D2
    description: "tierIndex is strictly ordinal and registry-order == index-order, enabling gte threshold comparison"
    requirement: AUTO-02
    verification:
      - kind: unit
        ref: "src/lib/mmr-tiers.test.ts#tierIndex — strictly ordinal, registry order == index order"
        status: pass
    human_judgment: false
  - id: D3
    description: "TIER_IDS is a non-empty tuple usable directly in z.enum (bronze first, grandmaster last)"
    requirement: AUTO-02
    verification:
      - kind: unit
        ref: "src/lib/mmr-tiers.test.ts#TIER_IDS — non-empty tuple usable in z.enum"
        status: pass
      - kind: other
        ref: "npx tsc --noEmit"
        status: pass
    human_judgment: false

# Metrics
duration: 4min
completed: 2026-07-01
status: complete
---

# Phase 07 Plan 01: MMR-Tier Registry Summary

**Project-owned ordinal MMR-tier registry (bronze..grandmaster) mirroring the patches.ts singleton pattern, with TIER_IDS z.enum tuple plus pure tierForMmr/tierIndex lookups — decoupled from season-fragile w3champions League names.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-07-01T17:39:48Z
- **Completed:** 2026-07-01T17:43:11Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Wrote the Wave-0 RED test encoding the boundary-inclusive lookup + strictly-ordinal index contract (9 assertions)
- Implemented `src/lib/mmr-tiers.ts` as a patches.ts-style singleton registry: private ascending `_TIERS`, readonly `TIERS` view, `TIER_IDS` tuple, `tierForMmr()`, `tierIndex()`
- Ordinal foundation now ready for the content schema (07-04), pure detection (07-05), and fetch client (07-06)
- File-level JSDoc cites RESEARCH Pitfall 5 (never use w3champions League names) and the [ASSUMED] A3 recalibration path

## Task Commits

Each task was committed atomically (TDD RED → GREEN):

1. **Task 1: Write the Wave-0 mmr-tiers unit test (RED)** - `31c2ed1` (test)
2. **Task 2: Implement mmr-tiers.ts registry (GREEN)** - `e85d383` (feat)

_No REFACTOR commit — GREEN implementation was already minimal and clean._

## Files Created/Modified
- `src/lib/mmr-tiers.ts` - Project-owned ordinal MMR-tier registry: TierEntry interface, private `_TIERS`, `TIERS`, `TIER_IDS`, `tierForMmr`, `tierIndex`
- `src/lib/mmr-tiers.test.ts` - 9-assertion Wave-0 unit test covering boundary lookup, ordinal index, and z.enum-ready tuple shape

## Decisions Made
- Shipped [ASSUMED] A3 round-number cutoffs (bronze=0, silver=1000, gold=1200, platinum=1400, diamond=1600, master=1800, grandmaster=2000). Recalibrate later against `/api/w3c-stats/mmr-distribution` — a one-file change, no downstream migration (D-04 already caps auto-detect at `in-progress`).
- `tierIndex` returns -1 for unknown ids rather than throwing; upstream `z.enum(TIER_IDS)` validation guarantees valid ids at the call site, unlike `getPatch` which is called on untrusted content ids.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrected contradictory expected value in the plan's behavior block**
- **Found during:** Task 1 (RED test authoring)
- **Issue:** The plan's `<behavior>` block asserted `tierForMmr(1453) === "gold"`, but its own `<action>` block and RESEARCH §Pattern 2 / A3 set `platinum` at `minMmr: 1400`. Since 1453 >= 1400, the highest-qualifying tier is `platinum`, not `gold`. Asserting `gold` would make a correct GREEN implementation impossible.
- **Fix:** Wrote the test asserting `tierForMmr(1453) === "platinum"`, anchored on the authoritative A3 cutoffs (the action block explicitly instructs "Use the round-number cutoffs from RESEARCH §Pattern 2 / A3 as the expected boundaries"). Added an explicit boundary case at 1400 → platinum. Documented the correction inline in the test.
- **Files modified:** src/lib/mmr-tiers.test.ts
- **Verification:** All 9 tests pass GREEN against the A3 cutoffs; `npx tsc --noEmit` exits 0.
- **Committed in:** 31c2ed1 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug — plan-spec internal contradiction)
**Impact on plan:** No scope change. The corrected value is the only reading consistent with the authoritative cutoffs the plan itself mandates. All acceptance criteria met.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `TIER_IDS` ready for `z.enum(TIER_IDS)` in `AutoDetectCriteriaSchema` (07-04)
- `tierIndex()` ready for ordinal `gte` comparison in `detectMasterySignals` (07-05)
- `tierForMmr()` ready for `mmrTier` signal derivation in `w3champions-client` (07-06)
- Open Question #1 (exact MMR cutoffs) remains a low-risk post-launch content-tuning pass — the registry is the single recalibration point.

## Self-Check: PASSED

- FOUND: src/lib/mmr-tiers.ts
- FOUND: src/lib/mmr-tiers.test.ts
- FOUND: .planning/phases/07-w3champions-auto-detection/07-01-SUMMARY.md
- FOUND commit: 31c2ed1 (test RED)
- FOUND commit: e85d383 (feat GREEN)

---
*Phase: 07-w3champions-auto-detection*
*Completed: 2026-07-01*
