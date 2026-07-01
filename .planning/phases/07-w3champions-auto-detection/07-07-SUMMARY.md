---
phase: 07-w3champions-auto-detection
plan: 07
subsystem: server
tags: [w3champions, auto-detection, sync, server-fn, tdd, authorization]
status: complete
requires:
  - "authMiddleware / AuthedContext (ADR 007/008)"
  - "w3championsSync table + SYNC_TTL_MS (07-02, 07-06)"
  - "fetchW3championsSignals (07-06)"
  - "detectMasterySignals (07-05)"
  - "nodeProgress table + CURRENT_PATCH (Phase 5, patches registry)"
provides:
  - "syncW3championsHandler / syncW3champions server fn"
  - "getW3championsSyncStatusHandler / getW3championsSyncStatus server fn"
  - "SyncResult { status, advanced } contract for the 07-08 client hook"
affects:
  - "src/hooks/useSyncW3championsMutation.ts (07-08 — consumes syncW3champions)"
  - "src/components/profile sync UI (07-08 — consumes getW3championsSyncStatus)"
tech-stack:
  added: []
  patterns:
    - "principal-keyed server fn (no userId body channel, ADR 007)"
    - "durable DB-TTL cache gate (single fetch per SYNC_TTL_MS)"
    - "additive plain insert (onConflictDoNothing) — one-way ratchet, never DoUpdate"
    - "server-stamped fields (masteryState/source/patchId/userId hardcoded)"
key-files:
  created:
    - src/server/w3champions.ts
    - src/server/w3champions.test.ts
  modified: []
decisions:
  - "Auto nodeProgress write uses .onConflictDoNothing() (not plain bare insert) — defensive concurrency guard that still satisfies the NEVER-DoUpdate monotonic contract (D-06)"
  - "TTL hit reports status 'cached' and still runs detectMasterySignals over cached signals — additive + untouched-only makes repeated in-window syncs idempotent"
  - "battleTag/gateway coerced with ?? '' — inferred better-auth User type makes them nullable; a missing value degrades to a no-data/unreachable bucket (AUTO-05 failure-safe) rather than a type error"
metrics:
  duration: ~6m
  completed: 2026-07-01
  tasks: 2
  files: 2
---

# Phase 7 Plan 7: w3champions Sync Server Function Summary

Principal-keyed `syncW3champions` + `getW3championsSyncStatus` server functions: a durable DB-TTL single-fetch gate, an in-progress ceiling, an additive plain-insert one-way ratchet, and failure buckets that never disturb manual/quiz progress — all four invariants proven by a Wave-0 server test.

## What Was Built

`src/server/w3champions.ts` — the orchestrating deep module where every AUTO requirement converges. It wraps the pure `detectMasterySignals` eligibility function (07-05) with the four responsibilities that function deliberately does not own:

1. **Authorization (ADR 007, AUTO-01):** reads `userId/battleTag/gateway` only from `context.principal` via `authMiddleware`. There is no client-input channel for them — the sync fn takes no meaningful `data`. Cross-user write (IDOR) is structurally impossible.
2. **TTL gate (AUTO-04, criterion 3):** the per-user `w3championsSync` row is the durable rate-limit gate. A `lastSyncedAt` within `SYNC_TTL_MS` skips the outbound fetch and reuses cached signals. Because it lives in the DB it survives tabs/devices — two back-to-back syncs make exactly ONE upstream fetch.
3. **Auto-write (D-04/D-05/D-06):** for each untouched candidate returned by `detectMasterySignals`, a PLAIN `insert` (`.onConflictDoNothing()`) stamps `masteryState: "in-progress"` (ceiling — never "mastered"), `source: "auto"`, `patchId: CURRENT_PATCH.id`, `userId: principal.id`. NO `onConflictDoUpdate` on the nodeProgress path — auto is additive-only and can never overwrite/downgrade a manual or quiz row.
4. **Failure safety (AUTO-05, criterion 4):** `unreachable`/`no-data` return `{ status, advanced: [] }` with zero writes; `rate-limited` falls back to the cached row's signals when present (D-10b, not an error). Only opaque bucket statuses are surfaced.

Also exposes `getW3championsSyncStatusHandler` — a principal-keyed read of the `w3championsSync` row (or null) for the "Last synced Xm ago" UI (07-08).

Both handlers are exported as named async functions (testable without the TanStack Start runtime), wired to lexically-direct `createServerFn(...).middleware([authMiddleware]).handler(...)` exports (compiler-visibility constraint honored — no factory wrapper).

## Verification Results

- `npx vitest run src/server/w3champions.test.ts` — 14/14 green (authorization, TTL, ceiling, monotonic, AUTO-05 buckets, status read)
- `npx tsc --noEmit` — exits 0
- `npm test` — 412/412 green across 29 files
- Grep confirms the only `onConflictDoUpdate` is on the `w3champions_sync` cache table; the nodeProgress auto path uses `onConflictDoNothing`

TDD gates: `test(07-07)` RED commit (4b1b394) → `feat(07-07)` GREEN commit (dff4569).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Nullable battleTag/gateway on inferred User type**
- **Found during:** Task 2 (tsc verification)
- **Issue:** `fetchW3championsSignals(principal.battleTag, principal.gateway)` failed tsc — the inferred better-auth `User` type makes `battleTag`/`gateway` (input:false additionalFields) `string | null | undefined`, not `string`.
- **Fix:** coerce with `?? ""`. A missing value degrades gracefully to a no-data/unreachable bucket (consistent with AUTO-05 failure-safety) rather than crashing.
- **Files modified:** src/server/w3champions.ts
- **Commit:** dff4569

### Intentional refinement (within plan latitude)

- The plan permitted "optionally `.onConflictDoNothing()` for defensive concurrency, but NEVER DoUpdate." Chose `.onConflictDoNothing()` over a bare insert: it keeps the additive-only guarantee under concurrent syncs and gives the monotonic test a clean positive assertion, while still satisfying the NEVER-DoUpdate contract.

## Known Stubs

None. Both server functions are fully wired to real dependencies (db, w3champions-client, detect-mastery-signals, content-collections). No placeholder data paths.

## Threat Flags

None. All surface is covered by the plan's `<threat_model>` (T-07-07a..e): principal-keyed authorization, additive-only write, DB-TTL cost gate, opaque bucket statuses, server-stamped fields. No new endpoints, auth paths, or trust boundaries beyond those specified. No new npm dependencies (T-07-07-SC).

## Self-Check: PASSED

- FOUND: src/server/w3champions.ts
- FOUND: src/server/w3champions.test.ts
- FOUND commit: 4b1b394 (test RED)
- FOUND commit: dff4569 (feat GREEN)
