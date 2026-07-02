---
phase: 08-replay-parsing
plan: 03
subsystem: api
tags: [w3gjs, replay-parsing, vitest, tdd]

# Dependency graph
requires:
  - phase: 08-replay-parsing (08-01)
    provides: "w3gjs@4.1.0 installed + human-verified; committed real .w3g fixture (src/lib/__fixtures__/1v1-sample.w3g); ADR 011 inline-parse architecture decision"
provides:
  - "parseReplay(buffer): Promise<ParserOutput> — the sole server-side w3gjs import site"
  - "ReplayParseError — opaque parse-failure type, no internal detail leaks"
  - "Re-exported ParserOutput / Player types for downstream consumers (08-05 pure signal layer)"
affects: [08-05, 08-08, 08-11, 08-12]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Single-import-site deep module: only one file in the codebase imports w3gjs for parsing"
    - "Opaque error wrapping: try/catch around all-external-library calls collapses to one fixed-message Error subclass (mirrors w3champions-client.ts T-07-06c)"

key-files:
  created:
    - src/lib/replay-parser.ts
    - src/lib/replay-parser.test.ts
  modified: []

key-decisions:
  - "Player type derived structurally as ParserOutput[\"players\"][number] rather than imported — w3gjs's index.d.ts does not re-export Player as a named type (only a default class export from an internal module path)"

patterns-established:
  - "Server-only .w3g parse wrapper: new W3GReplay().parse(buffer) always wrapped in try/catch -> single opaque ReplayParseError; no upstream parser error strings ever leave the module"

requirements-completed: [REPLAY-01]

coverage:
  - id: D1
    description: "parseReplay(buffer) resolves a real .w3g fixture into a ParserOutput exposing buildNumber, version, duration, and per-player apm/groupHotkeys/units.order/buildings.order/upgrades.order/items.order/heroCollector/actions"
    requirement: "REPLAY-01"
    verification:
      - kind: unit
        ref: "src/lib/replay-parser.test.ts#parseReplay > resolves a real fixture with the full REPLAY-01 field shape"
        status: pass
    human_judgment: false
  - id: D2
    description: "A garbage/non-.w3g buffer rejects with an opaque ReplayParseError (no internal w3gjs detail leaked) instead of an unhandled crash"
    requirement: "REPLAY-01"
    verification:
      - kind: unit
        ref: "src/lib/replay-parser.test.ts#parseReplay > rejects a garbage buffer with an opaque ReplayParseError — no internal detail leaks"
        status: pass
    human_judgment: false

duration: 5min
completed: 2026-07-02
status: complete
---

# Phase 08 Plan 03: Replay Parser Wrapper Summary

**`parseReplay(buffer): Promise<ParserOutput>` — the single fail-safe server-side seam wrapping w3gjs, tested against the real committed `.w3g` fixture with an opaque `ReplayParseError` fail-safe for malformed input.**

## Performance

- **Duration:** 5min
- **Started:** 2026-07-02T13:23:43+02:00
- **Completed:** 2026-07-02T13:24:53+02:00
- **Tasks:** 1 (TDD: RED + GREEN)
- **Files modified:** 2

## Accomplishments
- `src/lib/replay-parser.ts` created as the sole server-side `w3gjs` import site — `parseReplay(buffer: Buffer): Promise<ParserOutput>` wraps `new W3GReplay().parse(buffer)` in try/catch
- Malformed/garbage buffers reject with one opaque `ReplayParseError` (fixed message, no upstream detail) — mirrors the `w3champions-client.ts` T-07-06c "no upstream error strings leave this module" discipline
- Re-exports `ParserOutput` and a structurally-derived `Player` type for the pure signal layer (08-05) to consume without ever importing `w3gjs` directly
- Test suite parses the real fixture from 08-01 (`src/lib/__fixtures__/1v1-sample.w3g`) and asserts every REPLAY-01 field: `buildNumber`, `version`, `duration`, and per-player `apm`, `groupHotkeys`, `units.order`, `buildings.order`, `upgrades.order`, `items.order`, `heroCollector`, `actions`

## Task Commits

Each task was committed atomically (TDD cycle):

1. **Task 1 (RED): failing test for parseReplay w3gjs wrapper** - `9aea0b5` (test)
2. **Task 1 (GREEN): implement parseReplay w3gjs wrapper** - `64f5c13` (feat)

No REFACTOR commit needed — the GREEN implementation was already minimal and clean (no duplication or cleanup opportunity found).

**Plan metadata:** (see final commit below)

## Files Created/Modified
- `src/lib/replay-parser.ts` - `parseReplay()` wrapper, `ReplayParseError`, re-exported `ParserOutput`/`Player` types
- `src/lib/replay-parser.test.ts` - real-fixture parse assertions + garbage-buffer opaque-rejection assertion

## Decisions Made
- `Player` type is derived structurally (`ParserOutput["players"][number]`) instead of imported from `w3gjs`, because `w3gjs`'s `index.d.ts` only exposes `Player` as a `default` class export from an internal module path, not as a named type export. This avoids reaching into `w3gjs` internals while still giving downstream consumers a proper `Player` type.

## Deviations from Plan

None - plan executed exactly as written. TDD RED/GREEN cycle followed; REFACTOR step was a no-op (nothing to clean up).

## Issues Encountered
- Initial implementation attempted `import type { Player } from "w3gjs"`, which fails to compile (`TS2614: Module '"w3gjs"' has no exported member 'Player'`) because `Player` is not re-exported as a named type in the package's `index.d.ts`. Fixed by deriving `Player` structurally from `ParserOutput["players"][number]` instead — resolved within the GREEN step before commit, not a separate deviation.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- 08-05 (pure semantic signal layer) can now import `parseReplay`, `ParserOutput`, and `Player` from `src/lib/replay-parser.ts` without ever touching `w3gjs` directly.
- 08-08/08-11/08-12 (server functions wiring upload/auto-pull paths) have a fail-safe parse boundary to call inline per ADR 011.
- No blockers.

---
*Phase: 08-replay-parsing*
*Completed: 2026-07-02*

## Self-Check: PASSED

- FOUND: src/lib/replay-parser.ts
- FOUND: src/lib/replay-parser.test.ts
- FOUND: .planning/phases/08-replay-parsing/08-03-SUMMARY.md
- FOUND commit: 9aea0b5
- FOUND commit: 64f5c13
