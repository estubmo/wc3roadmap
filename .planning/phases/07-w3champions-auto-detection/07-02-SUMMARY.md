---
phase: 07-w3champions-auto-detection
plan: 02
subsystem: database
tags: [drizzle, postgres, neon, schema, cache, ttl]

# Dependency graph
requires:
  - phase: 04-auth-database
    provides: users table (stable UUID progress key), drizzle+Neon wiring, DATABASE_URL_DIRECT
  - phase: 05-progress-tracking
    provides: nodeProgress surrogate-PK + FK-cascade + unique-index pattern; [BLOCKING] push precedent
provides:
  - w3championsSync single-row-per-user cache table (surrogate PK, FK cascade, nullable mmrTier, gamesPlayed, lastSyncedAt)
  - uniqueIndex(userId) upsert target for 07-07 syncW3champions onConflictDoUpdate
  - w3championsSyncRelations + usersRelations extension so db.query.w3championsSync.findFirst resolves
  - w3champions_sync table live in Neon (drizzle-kit push applied, idempotent second run confirms)

affects: [07-07 sync handler, 07-04 mmr-tiers consumer, TTL gate / rate-limit design]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Single-row cache: uniqueIndex on userId ALONE (vs (userId,nodeId) for per-node tables)"
    - "DB row (lastSyncedAt) as durable TTL gate — survives tabs/devices, unlike TanStack staleTime"

key-files:
  created: []
  modified:
    - src/db/schema.ts
    - src/db/schema.test.ts

key-decisions:
  - "uniqueIndex(userId) alone — single-row cache, one sync row per user (not per-nodeId like node_progress)"
  - "mmrTier nullable (D-10c): null = unranked / no ladder data this season; TTL gate still holds"
  - "lastSyncedAt is authoritative rate-limit gate in DB, not TanStack staleTime (AUTO-04 criterion 3)"
  - "text()-over-pgEnum for mmrTier, following nodeProgress.source Pitfall-1 convention"
  - "nodeProgress NOT re-migrated — source+patchId already present from Phase 5"

patterns-established:
  - "Single-row-per-user cache table: surrogate PK + FK cascade + uniqueIndex(userId) alone"

requirements-completed: [AUTO-04]

# Coverage metadata
coverage:
  - id: D1
    description: "w3championsSync table defined in Drizzle schema with surrogate PK, FK userId cascade, nullable mmrTier, non-null gamesPlayed, lastSyncedAt TTL column"
    requirement: "AUTO-04"
    verification:
      - kind: unit
        ref: "src/db/schema.test.ts#w3championsSync table"
        status: pass
      - kind: other
        ref: "npx tsc --noEmit — exits 0"
        status: pass
    human_judgment: false
  - id: D2
    description: "w3champions_sync table live in Neon via drizzle-kit push; single-row-per-user uniqueIndex(userId) upsert target exists"
    requirement: "AUTO-04"
    verification:
      - kind: other
        ref: "npx drizzle-kit push — '[✓] Changes applied'; second run '[i] No changes detected'"
        status: pass
    human_judgment: false

# Metrics
duration: 8min
completed: 2026-07-01
status: complete
---

# Phase 7 Plan 02: w3championsSync Cache Table Summary

**Added the `w3champions_sync` single-row-per-user Drizzle cache table (unique index on `userId` alone) and pushed it live to Neon — the durable `lastSyncedAt` TTL gate behind AUTO-04 / criterion 3.**

## Performance

- **Duration:** ~8 min
- **Completed:** 2026-07-01
- **Tasks:** 3 completed
- **Files modified:** 2

## Accomplishments

- Defined `w3championsSync = pgTable("w3champions_sync", …)`: surrogate `text` PK, `userId` FK → `users.id` `onDelete: "cascade"`, nullable `mmrTier`, non-null `gamesPlayed` (default 0), non-null `lastSyncedAt`, plus `createdAt`/`updatedAt` following the `nodeProgress` convention.
- Enforced one cache row per user via `uniqueIndex("w3c_sync_user_unique").on(table.userId)` — the `onConflictDoUpdate` target for the 07-07 `syncW3champions` handler.
- Registered `w3championsSyncRelations` and extended `usersRelations` with `w3championsSync: many(w3championsSync)` so `db.query.w3championsSync.findFirst` resolves in the 07-07 TTL gate.
- Extended the schema smoke test with a `w3championsSync` block asserting table name and `id`/`userId`/`mmrTier`/`gamesPlayed`/`lastSyncedAt` columns.
- Applied `[BLOCKING]` `npx drizzle-kit push` to the live Neon DB via `DATABASE_URL_DIRECT`; `[✓] Changes applied`, and a second run reported `[i] No changes detected` — confirming idempotency and that `node_progress` was untouched.

## Verification

- `npx tsc --noEmit` — exits 0.
- `npm test -- schema` — 161 tests pass (includes the new `w3championsSync` block).
- `npx drizzle-kit push` — `[✓] Changes applied`; second run `[i] No changes detected` (no pending diff; `node_progress` unaltered).

## Deviations from Plan

None — plan executed exactly as written.

Note: the plan frontmatter's `user_setup` referenced `DATABASE_URL_DIRECT` in `.env.local`; in this project the var lives in `.env` (already present from Phase 4, per 05-03 precedent). drizzle-kit auto-loaded it — no manual setup or auth gate required.

## Threat Mitigations Applied

- **T-07-02a (Tampering):** `uniqueIndex(userId)` enforces exactly one cache row per user; the 07-07 upsert target is principal-keyed and atomic.
- **T-07-02b (Information Disclosure):** FK to `users.id` + cascade; combined with 07-07 principal-keyed queries (ADR 007), cross-user cache reads/writes are impossible by construction.
- **T-07-02-SC (push to live DB):** new table only, non-destructive diff; `DATABASE_URL_DIRECT` kept in gitignored env, never committed.

## Notes for Downstream Plans

- **07-07 sync handler:** upsert with `target: [w3championsSync.userId]` (userId alone, not a composite). Read via `db.query.w3championsSync.findFirst({ where: eq(w3championsSync.userId, principal.id) })` for the TTL gate.
- `mmrTier` can be `null` (unranked / no ladder data this season) — handle the no-data case downstream; the sync row still exists so the TTL gate holds.

## Self-Check: PASSED
