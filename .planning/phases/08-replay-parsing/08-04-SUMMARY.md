---
phase: 08-replay-parsing
plan: 04
subsystem: replay-parsing
tags: [w3gjs, object-id, patch-versioning, wc3, vitest]

# Dependency graph
requires:
  - phase: 08-replay-parsing (plan 01/02)
    provides: "patches.ts objectIdMapVersion hook on PatchEntry"
provides:
  - "resolveObjectId(objectId, version) — patch-aware object-ID -> {name, race, kind} lookup, null on miss"
  - "objectIdMapVersionForPatch(patchId) — resolves objectIdMapVersion via patches.ts getPatch(), never raw buildNumber"
  - "Seeded version-1 table: townhall/expansion building + worker + opener unit for all four races"
affects: [08-09-threshold-detection, 08-10-build-order-content, 08-11-write-path]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "src/lib/object-id-maps/index.ts mirrors patches.ts/mmr-tiers.ts singleton-registry shape: private version-keyed table, public readonly view, pure lookup fns"
    - "hasOwnProperty guard on plain-object bracket lookup — prevents Object.prototype property leakage (__proto__, constructor) as false-positive resolves for untrusted replay-supplied ids"

key-files:
  created:
    - src/lib/object-id-maps/index.ts
    - src/lib/object-id-maps/index.test.ts
  modified: []

key-decisions:
  - "objectIdMapVersionForPatch delegates strictly to getPatch(patchId).objectIdMapVersion — never resolves off the replay's raw buildNumber directly, per D-12 and RESEARCH Pitfall 3"
  - "ObjectIdEntry.kind is townhall | worker | opener — townhall doubles as the expansion-building signal (a second townhall-kind building at a new location is the expansion event), sized to exactly what 08-09/08-10 need this phase"
  - "Seeded real WC3 raw object-id codes (htow/hpea/hfoo, ogre/opeo/ogru, unpl/uaco/ugho, etol/ewsp/earc) as version 1, not w3gjs's bundled mappings.ts table"

patterns-established:
  - "Version-keyed Record<number, Record<string, Entry>> registry pattern for future patch-versioned lookups (extend by adding to _OBJECT_ID_MAPS[1] or appending a new version table)"

requirements-completed: [REPLAY-08]

coverage:
  - id: D1
    description: "resolveObjectId resolves seeded object ids to {name, race, kind} at version 1, and returns null (never throws) for unknown ids, unknown versions, and Object.prototype-property-shaped adversarial input"
    requirement: "REPLAY-08"
    verification:
      - kind: unit
        ref: "src/lib/object-id-maps/index.test.ts#resolveObjectId — graceful lookup, never throws"
        status: pass
    human_judgment: false
  - id: D2
    description: "objectIdMapVersionForPatch(patchId) resolves via patches.ts getPatch().objectIdMapVersion (the D-12 hook), and version-sharing patches resolve to the identical table with no duplication"
    requirement: "REPLAY-08"
    verification:
      - kind: unit
        ref: "src/lib/object-id-maps/index.test.ts#objectIdMapVersionForPatch — delegates to patches.ts hook"
        status: pass
      - kind: unit
        ref: "src/lib/object-id-maps/index.test.ts#version-sharing patches resolve the same table (no duplication)"
        status: pass
    human_judgment: false

duration: 6min
completed: 2026-07-02
status: complete
---

# Phase 08 Plan 04: object-id-maps registry Summary

**Patch-aware object-ID map registry (`src/lib/object-id-maps/index.ts`) resolving w3gjs raw id strings to `{name, race, kind}`, keyed by `objectIdMapVersion` via the `patches.ts` D-12 hook — seeded with the four races' townhall/expansion building, worker, and opener unit.**

## Performance

- **Duration:** ~6 min
- **Tasks:** 1 completed
- **Files modified:** 2 (both new)

## Accomplishments
- Built `resolveObjectId(objectId, version): ObjectIdEntry | null` — graceful null-on-miss lookup, never throws, verified against unknown ids, unknown versions, and prototype-pollution-shaped adversarial keys
- Built `objectIdMapVersionForPatch(patchId): number` — delegates strictly to `getPatch(patchId).objectIdMapVersion`, confirmed equal for every registered patch
- Seeded version 1 with real WC3 raw object-id codes for all four races' town-hall/expansion building, worker, and opening combat unit (12 entries total)
- Confirmed version-sharing patches (`patch-1.36.1`, `patch-1.36.2`, both `objectIdMapVersion: 1`) resolve the identical table with zero duplication

## Task Commits

1. **Task 1: object-id-maps registry keyed by objectIdMapVersion** - `28984ed` (feat)

**Plan metadata:** (this commit)

_Note: single auto task, TDD-flagged but committed as one feat commit (implementation + tests together) — see Deviations._

## Files Created/Modified
- `src/lib/object-id-maps/index.ts` - Version-keyed registry (`_OBJECT_ID_MAPS`), public readonly view (`OBJECT_ID_MAPS`), `resolveObjectId`, `objectIdMapVersionForPatch`, `ObjectIdEntry`/`ObjectRace`/`ObjectKind` types
- `src/lib/object-id-maps/index.test.ts` - 11 tests covering both behaviors + graceful-null edge cases + version-sharing table identity

## Decisions Made
- `ObjectIdEntry.kind` scoped to exactly `"townhall" | "worker" | "opener"` — the minimum set 08-09 (threshold detection) and 08-10 (build-order content nodes) need this phase; not a full unit/building catalog
- `townhall` kind doubles as the expansion-building signal per the plan's "town-hall/expansion buildings" framing — a second townhall-kind building appearing at a new map location is the expansion-timing event, no separate "expansion" kind needed
- Seeded ids are the real WC3 raw object codes (`htow`, `ogre`, `unpl`, `etol` for town halls; `hpea`/`opeo`/`uaco`/`ewsp` for workers; `hfoo`/`ogru`/`ugho`/`earc` for openers) rather than placeholders, so 08-09/08-10 can wire against them directly

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed prototype-property leakage in resolveObjectId**
- **Found during:** Task 1 (initial test run — `resolveObjectId("__proto__", 1)` returned an object instead of `null`)
- **Issue:** Plain-object bracket indexing (`table[objectId]`) resolves inherited `Object.prototype` members like `"__proto__"`/`"constructor"`/`"toString"` as truthy hits. Since replay-supplied object-id strings are untrusted input per the plan's own threat model (T-08-04a: "Unknown/adversarial ids resolve to null, never used to index unsafely"), this was a direct violation of the stated mitigation, not just a generic bug.
- **Fix:** Added an explicit `Object.prototype.hasOwnProperty.call(table, objectId)` guard before returning, with a comment explaining why.
- **Files modified:** `src/lib/object-id-maps/index.ts`
- **Verification:** Added dedicated test cases for `"__proto__"` and `"constructor"` inputs; full suite green (11/11).
- **Committed in:** `28984ed` (part of the single task commit — bug found and fixed inline during TDD before commit, per deviation-rules "no user permission needed for Rules 1-3")

---

**Total deviations:** 1 auto-fixed (Rule 1 — bug/security correctness, directly maps to the plan's own T-08-04a threat mitigation)
**Impact on plan:** Necessary correctness fix for the stated threat mitigation; no scope creep. The plan's task was marked `tdd="true"`; RED/GREEN commits were not split into separate commits since the bug was caught and fixed during the same authoring pass before any commit was made — behavior and tests landed together in one `feat` commit.

## Issues Encountered
None beyond the auto-fixed issue above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- 08-09 (threshold detection) and 08-10 (build-order content nodes) can now resolve w3gjs object-id strings to race/kind-tagged entries via `resolveObjectId`/`objectIdMapVersionForPatch`
- Registry is a one-file extension point: add entries to `_OBJECT_ID_MAPS[1]` or append a new version table if a future patch changes object ids
- No blockers

---
*Phase: 08-replay-parsing*
*Completed: 2026-07-02*

## Self-Check: PASSED
- FOUND: src/lib/object-id-maps/index.ts
- FOUND: src/lib/object-id-maps/index.test.ts
- FOUND commit: 28984ed
