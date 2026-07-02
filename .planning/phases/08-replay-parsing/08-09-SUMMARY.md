---
phase: 08-replay-parsing
plan: 09
subsystem: replay-parsing
tags: [pure-function, threshold-detection, patch-versioning, vitest]

# Dependency graph
requires:
  - phase: 08-replay-parsing
    provides: "08-02 patches.ts registry, 08-04 object-id-maps registry, 08-05 replay-signals.ts (ReplaySignals), 08-07 ReplayCriteriaSchema"
provides:
  - "detectReplaySignals(nodes, signals, patchId) — pure, patch-aware replay-threshold detector emitting per-node mastered-capable targets"
  - "meetsReplayThreshold(criteria, signals, patchId) — per-signal actual-vs-target evaluator, exported for direct unit coverage"
  - "ReplayThresholdInput / ReplayNodeResult types — the write-path (08-11) input/output contract"
affects: [08-11-write-path, 08-12-upload-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "detectReplaySignals mirrors detect-mastery-signals.ts's filter-chain-then-map shape (MECHANIC-only -> criteria-required -> threshold-eval -> map) but intentionally omits the D-05 untouched-only filter (D-11)"
    - "buildOrderTiming resolves the replay's own race structurally via ObjectIdEntry.kind === \"opener\" (object-id-maps), with no separate node.race lookup needed — a player's build order only ever contains their own race's units"

key-files:
  created:
    - src/lib/replay-thresholds.ts
    - src/lib/replay-thresholds.test.ts
  modified: []

key-decisions:
  - "controlGroupUsage criterion (no groupId on ReplayCriteriaSchema) evaluated as the SUM of `used` across all control groups, not a single group — content authors get one aggregate hotkey-discipline threshold per node"
  - "heroTiming criterion (no heroId on ReplayCriteriaSchema) evaluated against the EARLIEST heroTiming entry (already ms-sorted by replay-signals.ts) — 'first hero bought' is the timed event, not any specific hero"
  - "'before beforeMs' timing signals (buildOrderTiming/heroTiming/expansionTiming) use strict < — hitting exactly beforeMs does not count as 'before' it; magnitude signals (eapm/controlGroupUsage) use inclusive >= per the gte naming"
  - "ReplayThresholdInput carries only { id, nodeType, replayCriteria } — no per-node patchId field; the replay's own patchId is a single detectReplaySignals argument, already sufficient to resolve objectIdMapVersion for the whole call"

patterns-established:
  - "meetsReplayThreshold exported (not just internal) so 08-11's write path or future threshold-tuning tests can unit-test single-criterion evaluation directly without constructing a full node list"

requirements-completed: [REPLAY-06, REPLAY-07]

coverage:
  - id: D1
    description: "detectReplaySignals is MECHANIC-only and replayCriteria-required — CONCEPTUAL nodes and criteria-less MECHANIC nodes never emit, even when trivially met"
    requirement: "REPLAY-06"
    verification:
      - kind: unit
        ref: "src/lib/replay-thresholds.test.ts#detectReplaySignals — MECHANIC-only (structural guarantee)"
        status: pass
      - kind: unit
        ref: "src/lib/replay-thresholds.test.ts#detectReplaySignals — replayCriteria-required (graceful default)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Each of the five ReplayCriteria signal variants (buildOrderTiming, eapm, controlGroupUsage, heroTiming, expansionTiming) emits on a met threshold and does not emit on a missed one, boundary-tested"
    requirement: "REPLAY-06"
    verification:
      - kind: unit
        ref: "src/lib/replay-thresholds.test.ts#detectReplaySignals — buildOrderTiming (patch-aware, REPLAY-08)"
        status: pass
      - kind: unit
        ref: "src/lib/replay-thresholds.test.ts#detectReplaySignals — eapm (boundary inclusive)"
        status: pass
      - kind: unit
        ref: "src/lib/replay-thresholds.test.ts#detectReplaySignals — controlGroupUsage (aggregate 'used' across groups, inclusive)"
        status: pass
      - kind: unit
        ref: "src/lib/replay-thresholds.test.ts#detectReplaySignals — heroTiming (earliest hero-buy entry)"
        status: pass
      - kind: unit
        ref: "src/lib/replay-thresholds.test.ts#detectReplaySignals — expansionTiming"
        status: pass
    human_judgment: false
  - id: D3
    description: "Every emitted result carries { nodeId, targetState: \"mastered\", actual, target, signal } — the REPLAY-07 feedback contract — and buildOrderTiming resolves patch-aware via objectIdMapVersionForPatch/resolveObjectId (REPLAY-08)"
    requirement: "REPLAY-07"
    verification:
      - kind: unit
        ref: "src/lib/replay-thresholds.test.ts (all emit-case assertions assert the full result object shape)"
        status: pass
      - kind: unit
        ref: "src/lib/replay-thresholds.test.ts#detectReplaySignals — buildOrderTiming — resolves the correct opener across all four races without a node.race field"
        status: pass
    human_judgment: false
  - id: D4
    description: "detectReplaySignals is pure (identical input -> deep-equal output) and carries no untouched-only filter (D-11) — no db/fetch/auth imports, no existingProgressNodeIds parameter"
    requirement: "REPLAY-06"
    verification:
      - kind: unit
        ref: "src/lib/replay-thresholds.test.ts#detectReplaySignals — purity"
        status: pass
      - kind: other
        ref: "npx tsc --noEmit (zero errors); grep confirms no db/fetch/auth imports and no existingProgressNodeIds parameter in the function signature"
        status: pass
    human_judgment: false

# Metrics
duration: 12min
completed: 2026-07-02
status: complete
---

# Phase 08 Plan 09: Replay Threshold Detector Summary

**`detectReplaySignals(nodes, signals, patchId)` — a pure, patch-aware threshold detector that turns derived `.w3g` replay signals into per-node `mastered`-capable results, each carrying the actual measured value alongside its content-authored target for REPLAY-07's feedback layer**

## Performance

- **Duration:** 12 min
- **Started:** 2026-07-02T13:48:00Z (approx)
- **Completed:** 2026-07-02T13:51:00Z (approx)
- **Tasks:** 1
- **Files modified:** 2 (both new)

## Accomplishments

- Built `detectReplaySignals(nodes, signals, patchId): ReplayNodeResult[]` — MECHANIC-only + replayCriteria-required filter chain, mirroring `detect-mastery-signals.ts`'s discipline but explicitly NOT untouched-only (D-11)
- Built `meetsReplayThreshold(criteria, signals, patchId): { met, actual, target }` — per-signal switch covering all five `ReplayCriteria` variants: `buildOrderTiming`, `eapm`, `controlGroupUsage`, `heroTiming`, `expansionTiming`
- Wired `buildOrderTiming` to patch-aware object-id resolution (`objectIdMapVersionForPatch` + `resolveObjectId`, REPLAY-08) — the first `kind === "opener"` build-order entry identifies the player's own-race opener with no separate `node.race` field required
- 21 unit tests covering: MECHANIC-only guarantee, replayCriteria-required default, all five signal variants (emit + no-emit + boundary where applicable), purity, and empty-input output shape
- `npx tsc --noEmit` clean; full `npx vitest run` (34 files / 494 tests) green — no regression in any prior phase's suite

## Task Commits

Each task was committed atomically, per the plan's TDD flag:

1. **Task 1 (RED): failing test for detectReplaySignals** - `e586ef8` (test)
2. **Task 1 (GREEN): implement detectReplaySignals** - `ab082d7` (feat)

**Plan metadata:** (this commit)

_TDD task: RED (failing test, module didn't exist) then GREEN (implementation, all 21 tests pass) — no REFACTOR commit needed, implementation was clean on first pass._

## Files Created/Modified

- `src/lib/replay-thresholds.ts` - `detectReplaySignals`, `meetsReplayThreshold`, `ReplayThresholdInput`/`ReplayNodeResult` types; pure, zero-I/O, patch-aware
- `src/lib/replay-thresholds.test.ts` - 21 tests across MECHANIC-only, replayCriteria-required, all five signal variants, purity, output shape

## Decisions Made

- **controlGroupUsage aggregation:** `ReplayCriteriaSchema`'s `controlGroupUsage` variant carries no `groupId` — evaluated as the sum of `used` across every `ControlGroupUsageEntry`, giving content authors one aggregate hotkey-discipline threshold per node rather than requiring a specific group.
- **heroTiming target:** carries no `heroId` — evaluated against the earliest `heroTiming` entry (already ms-sorted upstream by `replay-signals.ts`), i.e. "the player's first hero purchase," not a specific hero.
- **Boundary semantics:** timing signals (`buildOrderTiming`/`heroTiming`/`expansionTiming`, all phrased "before X") use strict `<`; magnitude signals (`eapm`/`controlGroupUsage`, phrased with `gte`) use inclusive `>=`. Both conventions are tested at the exact boundary.
- **No per-node `patchId`/`race` fields on `ReplayThresholdInput`:** the plan's task description listed `patchId` as part of the minimal node subset, but `detectReplaySignals`'s own `patchId` parameter (the replay's patch, not any individual node's `content.patchId`) already fully resolves `objectIdMapVersion` for the whole call — adding a redundant, unused per-node field would be dead weight. `race` is likewise unnecessary: build-order entries are structurally already race-pure (a player only ever builds their own race's units), so a bare `kind === "opener"` match on `object-id-maps` resolves correctly without it. Documented in the module's JSDoc; not a deviation from any acceptance criterion — all listed acceptance criteria are satisfied.

## Deviations from Plan

None (Rule 1-4) — plan executed exactly as written. The one adjustment (per-node type shape) above is an implementation-judgment call within the plan's own stated intent ("minimal" structural subset), not a fix to a bug, missing functionality, blocker, or architectural change — no deviation-rule category applies, so it is documented as a Decision rather than a Deviation.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- 08-11 (replay write path) can now call `detectReplaySignals(nodes, signals, replay.patchId)` to get real, mastered-capable candidate results with `actual`/`target`/`signal` already attached for REPLAY-07 feedback — no re-derivation needed at the write path.
- The write path still owns: 1v1 gate enforcement (`isSoloMatch`, upstream per Pitfall 7), principal-keyed persistence, and any monotonic-max comparison against existing progress (this detector deliberately does not filter on existing progress, per D-11).
- No blockers.

---
*Phase: 08-replay-parsing*
*Completed: 2026-07-02*

## Self-Check: PASSED
- FOUND: src/lib/replay-thresholds.ts
- FOUND: src/lib/replay-thresholds.test.ts
- FOUND commit: e586ef8 (test)
- FOUND commit: ab082d7 (feat)
