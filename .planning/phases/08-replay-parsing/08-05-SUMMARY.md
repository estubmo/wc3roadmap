---
phase: 08-replay-parsing
plan: 05
subsystem: replay-parsing
tags: [w3gjs, pure-function, vitest, semantic-signals, eapm]

# Dependency graph
requires:
  - phase: 08-replay-parsing (plan 01/03)
    provides: "w3gjs@4.1.0 + src/lib/replay-parser.ts (ParserOutput/Player re-exported types)"
  - phase: 08-replay-parsing (plan 04)
    provides: "src/lib/object-id-maps/index.ts (OBJECT_ID_MAPS, resolveObjectId, townhall kind)"
provides:
  - "deriveReplaySignals(parsed, player): ReplaySignals — pure ParserOutput/Player -> typed WC3 signals"
  - "isSoloMatch(parsed): boolean — structural D-15 1v1 gate"
  - "estimateEffectiveActions(actions): number — documented A3 eAPM heuristic"
  - "ReplaySignals / BuildOrderEntry / ControlGroupUsageEntry / HeroTimingEntry types"
affects: [08-09-threshold-detection, 08-11-write-path, 08-replay-parsing]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pick<> structural-subset input types (ReplayPlayerInput/ReplayParsedInput/SoloMatchInput) tie a pure module's contract to the real w3gjs Player/ParserOutput types while keeping hand-authored test fixtures light — extends the 'minimal structural subset' convention from detect-mastery-signals.ts's AutoDetectableNode"

key-files:
  created:
    - src/lib/replay-signals.ts
    - src/lib/replay-signals.test.ts
  modified: []

key-decisions:
  - "deriveReplaySignals/isSoloMatch input types are Pick<Player,...>/Pick<ParserOutput,...> structural subsets, not the full w3gjs classes — keeps the function contract tied to the real w3gjs shape (auto-reflects future field renames) while fixture construction only needs the fields actually used"
  - "eapm = estimateEffectiveActions(actions) normalized per-minute by parsed.duration (0 on zero/negative duration) — estimateEffectiveActions itself stays a single-arg heuristic per the plan's locked helper signature, with time normalization composed in deriveReplaySignals"
  - "estimateEffectiveActions sums assigngroup+rightclick+basic+buildtrain+ability+item, excluding select/selecthotkey/subgroup/esc/removeunit as UI/selection noise (A3, documented as a heuristic not a scientific claim)"
  - "expansionTimingMs = ms of the FIRST townhall-kind building in buildings.order (the pre-placed starting town hall is never queued, so the first queued townhall-kind building IS the expansion) — classified via the pure object-id-maps registry (isTownhallKind checks across all known map versions) rather than a hardcoded id list, since this layer has no patchId to resolve one specific version from"
  - "heroTiming pairs heroCollector's level with the hero's own units.order ms (first match by id); a hero with no matching units.order entry is skipped rather than fabricating ms: 0 (T-08-05a — honest missing signal over a misleading one)"
  - "isSoloMatch relies on ParserOutput.players already excluding observers (w3gjs tracks observers separately as ParserOutput.observers: string[]) — a plain players.length === 2 check is the correct structural D-15 gate, no ad-hoc observer-flag inspection needed"

patterns-established:
  - "NO I/O grep-assertion test: reads the module's own source text and asserts no import line matches #/lib/db, fetch, or #/lib/auth-middleware — makes the 'pure deep module' structural guarantee independently verifiable by CI, not just by code review"

requirements-completed: [REPLAY-02, REPLAY-07]

coverage:
  - id: D1
    description: "deriveReplaySignals(parsed, player) emits a sorted buildOrder (units+buildings merged, ascending ms), numeric eapm, control-group usage array, hero timing array, and expansion timing (ms or null)"
    requirement: "REPLAY-02"
    verification:
      - kind: unit
        ref: "src/lib/replay-signals.test.ts#buildOrder / eapm / controlGroupUsage / heroTiming / expansionTimingMs describe blocks (14 tests)"
        status: pass
    human_judgment: false
  - id: D2
    description: "deriveReplaySignals is pure — identical (parsed, player) input yields a deep-equal output across two calls"
    requirement: "REPLAY-02"
    verification:
      - kind: unit
        ref: "src/lib/replay-signals.test.ts#deriveReplaySignals — purity"
        status: pass
    human_judgment: false
  - id: D3
    description: "replay-signals.ts imports nothing from #/lib/db, fetch, or #/lib/auth-middleware (NO I/O structural guarantee)"
    requirement: "REPLAY-02"
    verification:
      - kind: unit
        ref: "src/lib/replay-signals.test.ts#replay-signals.ts — NO I/O discipline"
        status: pass
    human_judgment: false
  - id: D4
    description: "isSoloMatch(parsed) returns true for a 2-player fixture and false for a 3+/FFA fixture (D-15 structural 1v1 gate)"
    requirement: "REPLAY-02"
    verification:
      - kind: unit
        ref: "src/lib/replay-signals.test.ts#isSoloMatch (D-15, Pitfall 7) — 3 tests (2-player/FFA/empty)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Every signal carries the value+timing pairing REPLAY-07's 'you did X at time Y' feedback needs (build order ms, hero level+ms, control-group assigned/used, expansion ms)"
    requirement: "REPLAY-07"
    verification:
      - kind: unit
        ref: "src/lib/replay-signals.test.ts — same fixture-driven tests above assert both value and ms/timing fields together on every entry"
        status: pass
    human_judgment: false

duration: 12min
completed: 2026-07-02
status: complete
---

# Phase 08 Plan 05: Replay Signal Layer Summary

**`deriveReplaySignals(parsed, player)` — a zero-I/O deep module turning raw w3gjs output into typed buildOrder/eapm/controlGroupUsage/heroTiming/expansionTimingMs signals, plus the structural `isSoloMatch` D-15 1v1 gate — both fixture-tested with no real `.w3g` binary.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-07-02T13:32:00Z
- **Completed:** 2026-07-02T13:44:00Z
- **Tasks:** 1 completed
- **Files modified:** 2 (both new)

## Accomplishments

- Built `deriveReplaySignals(parsed: ReplayParsedInput, player: ReplayPlayerInput): ReplaySignals` mirroring `detect-mastery-signals.ts`'s zero-I/O deep-module discipline — no `existingProgressNodeIds`-style filter carried over, per D-11's "NOT untouched-only" note
- Built `isSoloMatch(parsed): boolean` — the D-15/Pitfall-7 structural 1v1 gate, derived from `parsed.players.length === 2` (w3gjs already excludes observers from `players`)
- Built `estimateEffectiveActions(actions): number` — the documented A3 eAPM classification heuristic (sums assigngroup/rightclick/basic/buildtrain/ability/item, excludes select/selecthotkey/subgroup/esc/removeunit as spam), composed with per-minute duration normalization in `deriveReplaySignals`
- Derived `expansionTimingMs` from the first townhall-kind building queued (via the existing `object-id-maps` registry, patch-version-agnostic since this pure layer has no `patchId`), and `heroTiming` by cross-referencing `heroCollector` (level) against `units.order` (ms)
- 18 fixture-driven unit tests, including a purity test (deep-equal across two calls) and a grep-style NO-I/O import-discipline test

## Task Commits

Single auto task, TDD-flagged but implementation and tests authored/verified together before the one commit (tests were green on first run against the implementation as written — see Deviations):

1. **Task 1: deriveReplaySignals pure semantic layer + isSoloMatch gate** - `e56ea61` (feat)

**Plan metadata:** (this commit)

## Files Created/Modified

- `src/lib/replay-signals.ts` - `deriveReplaySignals`, `isSoloMatch`, `estimateEffectiveActions`, `ReplaySignals`/`BuildOrderEntry`/`ControlGroupUsageEntry`/`HeroTimingEntry` types, `ReplayPlayerInput`/`ReplayParsedInput`/`SoloMatchInput` Pick<> structural-subset input types
- `src/lib/replay-signals.test.ts` - 18 tests across buildOrder, eapm/estimateEffectiveActions, controlGroupUsage, heroTiming, expansionTimingMs, purity, NO-I/O discipline, and isSoloMatch

## Decisions Made

See `key-decisions` in frontmatter — summarized: Pick<> structural-subset input types (ties the contract to real w3gjs types without heavy fixtures); eapm = per-minute-normalized `estimateEffectiveActions`; expansionTimingMs = first queued townhall-kind building (starting hall is pre-placed, never queued); heroTiming skips heroes with no matching `units.order` entry rather than fabricating `ms: 0`; `isSoloMatch` trusts w3gjs's own players/observers separation.

## Deviations from Plan

None - plan executed exactly as written. The task was `tdd="true"`; implementation and its full test suite were authored together and verified green on the first `vitest run` (no RED-phase failing-test commit was needed since no bug was found requiring a fix-then-retest cycle) — same single-commit pattern already established in 08-04's SUMMARY for an analogous TDD-flagged task.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- 08-09 (threshold detection) can now consume `ReplaySignals` + `isSoloMatch` directly — the D-15 gate is ready to sit upstream of any threshold evaluation
- 08-11 (write path) can rely on `deriveReplaySignals`'s NOT-untouched-only behavior (D-11) — no additional filtering needed before applying D-03/D-04's monotonic-max write semantic
- `object-id-maps`'s `OBJECT_ID_MAPS`/`isTownhallKind`-style classification is now proven reusable from a second pure module (this one), independent of `patchId`
- No blockers

---
*Phase: 08-replay-parsing*
*Completed: 2026-07-02*

## Self-Check: PASSED
- FOUND: src/lib/replay-signals.ts
- FOUND: src/lib/replay-signals.test.ts
- FOUND commit: e56ea61
