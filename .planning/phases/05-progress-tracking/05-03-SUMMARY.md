---
phase: 05-progress-tracking
plan: "03"
subsystem: database
tags: [drizzle, neon, postgres, schema, progress-tracking]

requires:
  - phase: 04-auth-database
    provides: "users table with stable UUID PK (AUTH-04) — the FK target for nodeProgress.userId"

provides:
  - "nodeProgress Drizzle table (node_progress) with surrogate PK, unique(userId,nodeId), FK cascade, source + patchId"
  - "nodeProgressRelations + usersRelations extended — db.query.nodeProgress.findMany works"
  - "node_progress table live in Neon (drizzle-kit push applied, idempotent second run confirms)"
  - "Schema smoke test extended with nodeProgress column assertions"

affects:
  - "05-04 (setNodeMastery server fn — upsert targets uniqueIndex(progress_user_node_unique))"
  - "05-04 (getUserProgress server fn — uses db.query.nodeProgress.findMany)"
  - "Phase 7 (w3champions auto-detection writes source='auto' to this table)"

tech-stack:
  added: []
  patterns:
    - "TEXT not pgEnum for masteryState — hyphen in 'in-progress' breaks pgEnum DDL (Pitfall 1)"
    - "Surrogate text PK + uniqueIndex upsert design (onConflictDoUpdate target)"
    - "D-04 source + D-05 patchId designed in from day one — avoids Phase-7 migration"
    - "drizzle-kit push to live Neon via DATABASE_URL_DIRECT (non-pooled, Pitfall 5)"

key-files:
  created: []
  modified:
    - "src/db/schema.ts — nodeProgress table + nodeProgressRelations + usersRelations extended"
    - "src/db/schema.test.ts — nodeProgress structural smoke test (10 new assertions)"

key-decisions:
  - "TEXT not pgEnum for masteryState — hyphen in 'in-progress' breaks pgEnum DDL; validation lives in MasteryStateSchema (Zod)"
  - "Surrogate text PK + uniqueIndex(userId,nodeId) upsert design — onConflictDoUpdate target for 05-04 setNodeMastery"
  - "source and patchId columns designed in now (D-04, D-05) — avoids schema migration when Phase 7 auto-detection ships"
  - "onDelete cascade on userId FK — deleting a user removes all progress rows (T-05-03b: no orphaned cross-user data)"

patterns-established:
  - "uniqueIndex(name).on(col1, col2) in pgTable index array — upsert target pattern"
  - "index(name).on(col) alongside uniqueIndex — covering index for bulk fetch"
  - "nodeProgressRelations + usersRelations many() extension — required for db.query relational builder"

requirements-completed: [PROG-01, PROG-02]

coverage:
  - id: D1
    description: "nodeProgress Drizzle table defined in src/db/schema.ts with surrogate PK, unique(userId,nodeId) index, userId FK cascade, source, patchId columns"
    requirement: PROG-01
    verification:
      - kind: unit
        ref: "src/db/schema.test.ts#nodeProgress table > is defined (PROG-01)"
        status: pass
      - kind: unit
        ref: "src/db/schema.test.ts#nodeProgress table > has source column (D-04)"
        status: pass
      - kind: unit
        ref: "src/db/schema.test.ts#nodeProgress table > has patchId column (D-05)"
        status: pass
    human_judgment: false
  - id: D2
    description: "nodeProgressRelations exported and usersRelations includes nodeProgress: many(nodeProgress)"
    requirement: PROG-02
    verification:
      - kind: unit
        ref: "npx tsc --noEmit — exit 0 confirms relational wiring compiles"
        status: pass
    human_judgment: false
  - id: D3
    description: "node_progress table live in Neon database (drizzle-kit push applied)"
    requirement: PROG-01
    verification:
      - kind: other
        ref: "npx drizzle-kit push — '[✓] Changes applied'; second run shows '[i] No changes detected'"
        status: pass
    human_judgment: false

duration: 3min
completed: "2026-06-30"
status: complete
---

# Phase 05 Plan 03: nodeProgress Schema + Neon Push Summary

**nodeProgress Drizzle table (surrogate PK, unique(userId,nodeId) upsert target, source + patchId forward-designed) defined in code, smoke-tested, and live in Neon.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-06-30T07:37:39Z
- **Completed:** 2026-06-30T07:40:33Z
- **Tasks:** 3
- **Files modified:** 2

## Accomplishments

- Added `nodeProgress = pgTable("node_progress", ...)` to `src/db/schema.ts` with all required columns: surrogate `id` PK, `userId` FK to `users.id` (onDelete cascade), `nodeId`, `masteryState` (TEXT not pgEnum — hyphen in "in-progress" breaks DDL), `source` (default "manual", D-04), `patchId` (D-05), timestamps
- Added `uniqueIndex("progress_user_node_unique").on(userId, nodeId)` (the `onConflictDoUpdate` target for 05-04's `setNodeMastery`) and `index("progress_userId_idx")` for bulk fetch
- Exported `nodeProgressRelations` and extended `usersRelations` with `nodeProgress: many(nodeProgress)` — enables `db.query.nodeProgress.findMany` in 05-04
- Extended `src/db/schema.test.ts` with 10 new structural assertions (table name, all 8 columns including `source` and `patchId`); 142 tests pass
- Ran `npx drizzle-kit push` — `[✓] Changes applied`; second run confirmed `[i] No changes detected`

## Task Commits

1. **Task 1: Add nodeProgress table + relations to Drizzle schema** — `7667576` (feat)
2. **Task 2: Extend schema smoke test for nodeProgress** — `7207347` (test)
3. **Task 3: [BLOCKING] Push schema to Neon** — `0ad9f4d` (chore)

## Files Created/Modified

- `/home/eirikmo/projects/wc3roadmap/src/db/schema.ts` — nodeProgress table + nodeProgressRelations + usersRelations extended with `nodeProgress: many(nodeProgress)`
- `/home/eirikmo/projects/wc3roadmap/src/db/schema.test.ts` — 10 new structural smoke test assertions for nodeProgress table

## Decisions Made

- TEXT not pgEnum for `masteryState` — the hyphen in `"in-progress"` causes DDL quoting issues with pgEnum (RESEARCH.md Pitfall 1); Zod `MasteryStateSchema` owns the vocabulary constraint at the app layer
- Surrogate text PK + `uniqueIndex(userId,nodeId)` — the unique index is the `onConflictDoUpdate` target for 05-04's upsert; one row per user-node pair enforced at DB level (T-05-03a)
- `source` and `patchId` columns designed in now (D-04, D-05) — avoids a Phase-7 schema migration when auto-detection ships; both stamped server-side, never from client input
- `onDelete: "cascade"` on `userId` FK — user deletion cascades to all progress rows (T-05-03b: prevents orphaned cross-user data, IDOR impossible by construction)

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — `DATABASE_URL_DIRECT` was already set in `.env` from Phase 4. Push ran non-interactively (new table, no destructive diff).

## Next Phase Readiness

- `node_progress` table is live in Neon with the `uniqueIndex(userId,nodeId)` upsert target ready for 05-04 `setNodeMastery`
- `nodeProgressRelations` wired — `db.query.nodeProgress.findMany` resolves in 05-04 `getUserProgress`
- `source` and `patchId` columns are live — 05-04 server fn can stamp them on every write
- No blockers for 05-04

## Self-Check: PASSED

- `src/db/schema.ts` exists and contains `nodeProgress = pgTable`: confirmed
- `src/db/schema.test.ts` exists with nodeProgress assertions: confirmed
- Commits 7667576, 7207347, 0ad9f4d exist in git log: confirmed
- `npx drizzle-kit push` exited 0 and second run reports no pending diff: confirmed

---
*Phase: 05-progress-tracking*
*Completed: 2026-06-30*
