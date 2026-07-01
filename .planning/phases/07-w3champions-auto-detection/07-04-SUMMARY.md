---
phase: 07-w3champions-auto-detection
plan: 04
subsystem: schema
tags: [zod, content-collections, discriminated-union, auto-detect, mmr-tiers]

# Dependency graph
requires:
  - phase: 07-01
    provides: TIER_IDS ordinal tier registry (mmr-tiers.ts) consumed by the mmrTier variant
provides:
  - AutoDetectCriteriaSchema (discriminated union over signal) + AutoDetectCriteria type in src/schemas/node.ts
  - autoDetect optional field on NodeFrontmatterSchema
  - field-for-field mirror of autoDetect in content-collections.ts (parallel-schema-sync)
affects: [07-05, 07-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Content-driven auto-detect criteria (D-01): eligibility in node frontmatter, not a central rule table"
    - "Single signal+threshold discriminated union (D-02): no compound rule engine"

key-files:
  created: []
  modified:
    - src/schemas/node.ts
    - content-collections.ts

key-decisions:
  - "D-01: auto-detect eligibility lives in per-node content, not a central rule table — authors add/tune eligible MECHANIC nodes without touching detection code"
  - "D-02: single signal+threshold discriminated union over `signal` (mmrTier | gamesPlayed), not a compound rule engine"
  - "autoDetect is .optional() with graceful default — absent means the node never auto-advances, same convention as quiz"

patterns-established:
  - "AutoDetectCriteriaSchema mirrors the existing CitationSchema/QuizSchema discriminated-union + parallel-schema-sync patterns exactly"

requirements-completed: [AUTO-02]

coverage:
  - id: D1
    description: "NodeFrontmatterSchema accepts an optional per-node autoDetect criterion (discriminated union over signal: mmrTier via z.enum(TIER_IDS) | gamesPlayed via int positive)"
    requirement: "AUTO-02"
    verification:
      - kind: automated
        ref: "npx tsc --noEmit (exit 0)"
        status: pass
      - kind: unit
        ref: "npm test — 372 tests pass across 26 files"
        status: pass
    human_judgment: false
  - id: D2
    description: "content-collections.ts mirrors the autoDetect field field-for-field (parallel-schema-sync, CI-enforced)"
    requirement: "AUTO-02"
    verification:
      - kind: automated
        ref: "grep autoDetect content-collections.ts (present) + npx tsc --noEmit (exit 0)"
        status: pass
    human_judgment: false

# Metrics
duration: 5min
completed: 2026-07-01
status: complete
---

# Phase 07 Plan 04: Node autoDetect Criterion Schema Summary

**Per-node `autoDetect` criterion (a single-signal discriminated union over mmrTier/gamesPlayed) added to the node content schema and mirrored field-for-field in the content-collections pipeline, gracefully optional so authors opt nodes into auto-detection from frontmatter alone.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-07-01T19:56Z
- **Completed:** 2026-07-01T20:00Z
- **Tasks:** 2 completed
- **Files modified:** 2

## Accomplishments
- Added `AutoDetectCriteriaSchema` — a Zod v4 discriminated union over `signal` (`mmrTier` with `gte: z.enum(TIER_IDS)`, `gamesPlayed` with `gte: z.number().int().positive()`) — plus the inferred `AutoDetectCriteria` type in `src/schemas/node.ts`.
- Wired `autoDetect: AutoDetectCriteriaSchema.optional()` onto `NodeFrontmatterSchema` using the same graceful-default convention as `quiz` (absent = never auto-advances, D-01).
- Mirrored the identical inline discriminated union in `content-collections.ts`, satisfying the CI-enforced parallel-schema-sync convention (imports `TIER_IDS` from `./src/lib/mmr-tiers`).

## Task Commits

Each task was committed atomically:

1. **Task 1: Add AutoDetectCriteriaSchema + autoDetect field to node.ts** - `4bbb45c` (feat)
2. **Task 2: Mirror autoDetect schema in content-collections.ts** - `8b480dd` (feat)

## Files Created/Modified
- `src/schemas/node.ts` - Added `AutoDetectCriteriaSchema` + `AutoDetectCriteria` type; imported `TIER_IDS`; added `autoDetect` optional field on `NodeFrontmatterSchema` with JSDoc noting D-01/D-02 and the mandatory mirror.
- `content-collections.ts` - Imported `TIER_IDS`; added inline `autoDetect` discriminated union identical to node.ts with a parallel-schema-sync note.

## Decisions Made
None new — followed the plan's D-01/D-02 decisions as specified. The schema deliberately reuses the existing `CitationSchema`/`QuizSchema` discriminated-union + parallel-sync conventions rather than introducing any new pattern.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Threat Mitigation

Both registered threats (T-07-04a malformed autoDetect frontmatter, T-07-04b schema drift) are mitigated as planned: the Zod discriminated union validates `signal`+`gte` at build/parse time (invalid criteria fail before reaching runtime), and the field is defined identically in both files per the CI-enforced parallel-schema-sync convention.

## Verification

- `npx tsc --noEmit` — exit 0
- `autoDetect` present in BOTH `src/schemas/node.ts` and `content-collections.ts` (grep)
- `npm test` — 372 tests pass across 26 files

## Self-Check: PASSED
- `src/schemas/node.ts` exists, exports `AutoDetectCriteriaSchema` (5 occurrences) — FOUND
- `content-collections.ts` contains `autoDetect` field — FOUND
- Commit `4bbb45c` — FOUND
- Commit `8b480dd` — FOUND
