---
phase: 08-replay-parsing
plan: 06
subsystem: database
tags: [drizzle, postgres, neon, replay-cache, schema]

# Dependency graph
requires:
  - phase: 05-progress-tracking
    provides: nodeProgress table + source column (D-04), surrogate-PK + uniqueIndex convention
  - phase: 07-w3champions-integration
    provides: w3championsSync single-row cache table shape (analog for replayAnalysis)
provides:
  - replayAnalysis (replay_analysis) table — gameId-keyed global signals cache (D-17)
  - nodeProgress.source column comment documents "replay" as a valid value (D-01)
  - Live database has the replay_analysis table (drizzle-kit push confirmed)
affects: [08-replay-parsing (later plans that write/read replayAnalysis, e.g. 08-11 server write path)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Global (non-per-user) cache table: single-column uniqueIndex on a public identifier (gameId), not (userId, X)"
    - "Raw source fact (buildNumber) stored alongside its resolved/derived value (patchId) rather than only the derived value"

key-files:
  created: []
  modified:
    - src/db/schema.ts
    - src/db/schema.test.ts

key-decisions:
  - "replayAnalysis uses a global gameId-only unique index (not per-user) per D-17 — a replay is a public match artifact, so any user pulling/uploading the same gameId reuses one cached row"
  - "signals stored as text() (JSON-stringified ReplaySignals), never raw .w3g bytes — T-08-06a mitigation"
  - "Both buildNumber (raw header fact) and patchId (resolved) are stored per D-12, avoiding re-parse if patch resolution logic changes later"
  - "nodeProgress.source required no DDL change (already text()) — only the doc comment was extended to mention 'replay' as a valid app-layer value (D-01)"

patterns-established:
  - "Global cache table pattern: replayAnalysis mirrors w3championsSync's surrogate-PK + single-column uniqueIndex shape but keys on a public identifier instead of userId"

requirements-completed: [REPLAY-08, REPLAY-05]

coverage:
  - id: D1
    description: "replayAnalysis table exists with columns id, gameId, signals, patchId, buildNumber, createdAt, updatedAt, and a unique index on gameId alone"
    requirement: "REPLAY-08"
    verification:
      - kind: unit
        ref: "src/db/schema.test.ts#replayAnalysis table"
        status: pass
  - id: D2
    description: "The live Neon database physically has the replay_analysis table and the gameId unique index after drizzle-kit push (types alone do not prove this)"
    requirement: "REPLAY-05"
    verification:
      - kind: other
        ref: "npx drizzle-kit push (no destructive prompt) + information_schema.columns / pg_indexes query against DATABASE_URL_DIRECT confirming replay_analysis table + replay_analysis_game_id_unique index"
        status: pass
    human_judgment: false
  - id: D3
    description: "nodeProgress.source column comment documents 'replay' as a valid value (D-01)"
    verification:
      - kind: other
        ref: "src/db/schema.ts nodeProgress.source doc comment (manual test executed: grep-verified the comment lists manual/auto/quiz/replay)"
        status: pass
    human_judgment: false

duration: 12min
completed: 2026-07-02
status: complete
---

# Phase 08 Plan 06: Replay Analysis Cache Table Summary

**Added the `replayAnalysis` gameId-keyed global signals cache table (D-17) to the Drizzle schema and pushed it to the live Neon database — the physical prerequisite for the Phase 8 cache gate ("a replay with a known gameId is never re-parsed").**

## Performance

- **Duration:** 12 min
- **Started:** 2026-07-02T10:46:00Z
- **Completed:** 2026-07-02T10:58:00Z
- **Tasks:** 2 completed
- **Files modified:** 2

## Accomplishments
- `replayAnalysis` (`replay_analysis`) table added: surrogate text PK, `gameId` unique index (global cache per D-17, not per-user), `signals` text column (JSON-stringified `ReplaySignals`, never raw `.w3g` bytes), `patchId` + raw `buildNumber` (D-12), timestamps
- `nodeProgress.source` doc comment updated to enumerate `"manual" | "auto" | "quiz" | "replay"` (D-01) — no DDL change, column was already `text()`
- `npx drizzle-kit push` applied the additive change to the live Neon database with no interactive/destructive prompt
- Live-DB verification query confirmed `replay_analysis` table + `replay_analysis_game_id_unique` unique index physically exist (types alone would not have proven this)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add replayAnalysis cache table + update source comment** - `26ea1d1` (feat)
2. **Task 2: [BLOCKING] Push additive schema to the database** - no code diff (schema was already committed in Task 1); `npx drizzle-kit push` applied it directly to the live database, verified via `information_schema`/`pg_indexes` query

**Plan metadata:** (this commit)

_Note: Task 2 is a verification/deployment step against the already-committed schema, not a separate file change — the plan's `<files_modified>` lists `src/db/schema.ts` because that file is the trigger for the push, but no new diff was produced by the push itself._

## Files Created/Modified
- `src/db/schema.ts` - Added `replayAnalysis` table export + relations comment context; updated `nodeProgress.source` doc comment
- `src/db/schema.test.ts` - Added `replayAnalysis` table describe block asserting all columns and the gameId-only unique index shape

## Decisions Made
- Global (not per-user) unique index on `gameId` alone, matching D-17's "gameId is a public match identifier" cache-gate design — mirrors `w3championsSync`'s single-row-cache shape but keys on a different (public) identifier.
- Stored both the raw `buildNumber` (immutable source fact from the replay header) and the resolved `patchId`, per D-12, so future patch-resolution logic changes never require re-parsing cached replays.
- `signals` is `text()` (JSON-stringified), following the project's established text()-over-structured-column convention (seen in `masteryState`, `source`, `mmrTier`) — deliberately never storing raw `.w3g` bytes (T-08-06a mitigation).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. `npx drizzle-kit push` ran without any interactive/destructive prompt (as expected for a purely additive change) and completed cleanly; live-database verification via a direct SQL query against `information_schema.columns` and `pg_indexes` confirmed the table and its unique index exist exactly as designed.

## User Setup Required

None - no external service configuration required. The live database push used the project's existing `DATABASE_URL_DIRECT` credential (already configured in `.env`), with explicit user authorization for this additive schema push.

## Next Phase Readiness
- `replayAnalysis` table is live and ready for the 08-11 server write path (upload/pull orchestration) to query/insert against, using the presence-based cache gate: `db.query.replayAnalysis.findFirst({ where: eq(replayAnalysis.gameId, gameId) })`.
- `nodeProgress.source` is documented to accept `"replay"`; the corresponding `ProgressRecordSchema` Zod enum extension (app-layer validation) is a separate downstream plan task, not part of this plan's scope.

---
*Phase: 08-replay-parsing*
*Completed: 2026-07-02*
