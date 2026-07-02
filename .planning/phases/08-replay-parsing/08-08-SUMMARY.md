---
phase: 08-replay-parsing
plan: 08
subsystem: api
tags: [w3champions, fetch, tanstack-query, ssrf-guard, replay]

# Dependency graph
requires:
  - phase: 07-mastery-detection
    provides: "w3champions-client.ts SSRF-guarded fetch discipline + opaque D-10 bucket vocabulary; w3champions-keys.ts client-safe key-factory precedent"
provides:
  - "fetchReplayBytes(gameId) — SSRF-guarded, unauthenticated replay-bytes download primitive"
  - "replayKeys client-safe TanStack Query key factory (all/byGameId/analysisStatus)"
affects: [08-11 auto-pull server function, 08-12 replay UI hooks, 08-13 replay analysis surface]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Opaque status-bucket result (ok/rate-limited/no-data/unreachable) reused verbatim from the Phase 7 w3champions client for a second endpoint"
    - "Hardcoded-host + encodeURIComponent SSRF guard reused verbatim across two client functions in the same module"

key-files:
  created:
    - src/lib/replay-keys.ts
  modified:
    - src/lib/w3champions-client.ts
    - src/lib/w3champions-client.test.ts

key-decisions:
  - "fetchReplayBytes lives in the existing w3champions-client.ts (not a new file) — single module owns every outbound call to the w3champions host, matching the Phase 7 deep-module precedent"
  - "Replay download bucket vocabulary is a distinct ReplayDownloadStatus type (not a reuse of W3cSyncStatus) — ok returns bytes here vs signals there, keeping the two result shapes honest even though the bucket names overlap"

patterns-established: []

requirements-completed: [REPLAY-05]

coverage:
  - id: D1
    description: "fetchReplayBytes(gameId) downloads .w3g bytes from the public w3champions replay endpoint, mapping every outcome to an opaque status bucket"
    requirement: "REPLAY-05"
    verification:
      - kind: unit
        ref: "src/lib/w3champions-client.test.ts#fetchReplayBytes"
        status: pass
    human_judgment: false
  - id: D2
    description: "replay-keys.ts client-safe TanStack Query key factory with no fetch/db/server imports"
    verification:
      - kind: unit
        ref: "npx tsc --noEmit (typechecks clean, zero imports in module)"
        status: pass
    human_judgment: false

duration: 8min
completed: 2026-07-02
status: complete
---

# Phase 08 Plan 08: Replay Auto-Pull Download Primitive Summary

**`fetchReplayBytes(gameId)` in `w3champions-client.ts` downloads `.w3g` bytes from the public, unauthenticated w3champions replay endpoint with the same SSRF guard and opaque-bucket discipline as the Phase 7 sync client, plus a new client-safe `replay-keys.ts` query-key factory.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-07-02T10:34:41Z
- **Completed:** 2026-07-02T10:42:00Z
- **Tasks:** 2 completed
- **Files modified:** 3 (1 created, 2 modified)

## Accomplishments
- `fetchReplayBytes(gameId)` added to `src/lib/w3champions-client.ts`: builds the outbound URL only from the hardcoded `W3C_BASE_URL` host + `encodeURIComponent(gameId)`, maps `429` → `rate-limited`, non-`ok` → `no-data`, thrown fetch → `unreachable`, and `200` → `{ status: "ok", bytes: Buffer }`.
- `src/lib/replay-keys.ts` created: client-safe `replayKeys` tuple factory (`all`, `byGameId`, `analysisStatus`) with zero imports — safe for the future UI hooks (08-12) to import without pulling server-only code into the bundle.
- Test suite covers all four buckets plus an exact-URL-shape assertion; full RED→GREEN TDD cycle followed for Task 1.

## Task Commits

Each task was committed atomically:

1. **Task 1: fetchReplayBytes with SSRF guard + opaque rate-limit bucket** — TDD (RED → GREEN):
   - `00070d8` (test): add failing test for fetchReplayBytes
   - `f107d79` (feat): implement fetchReplayBytes with SSRF guard + opaque buckets
2. **Task 2: replay-keys.ts client-safe query-key factory** - `3c1e9e9` (feat)

**Plan metadata:** (this commit)

_Note: Task 1 used TDD — RED commit precedes GREEN commit, per plan `tdd="true"`._

## Files Created/Modified
- `src/lib/w3champions-client.ts` - added `fetchReplayBytes`, `ReplayDownloadStatus`, `ReplayDownloadResult`
- `src/lib/w3champions-client.test.ts` - added `fetchReplayBytes` describe block (5 tests: ok/rate-limited/no-data/unreachable/URL-shape)
- `src/lib/replay-keys.ts` - new client-safe query-key factory

## Decisions Made
- Kept `fetchReplayBytes` inside `w3champions-client.ts` rather than a new file — the module already owns the SSRF-guarded fetch discipline for this host; adding a second exported function keeps that discipline in one place instead of duplicating the hardcoded-host pattern.
- `ReplayDownloadResult`'s `ok` branch carries `bytes: Buffer` while `W3cSyncResult`'s `ok` branch carries `signals` — deliberately not unified into one generic result type, since the plan explicitly separates "download primitive" (this plan) from "signal orchestration" (07-06 precedent), and forcing a shared generic would leak an unused field onto one of the two call sites.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `fetchReplayBytes` is ready for the auto-pull server function (08-11) to call directly — it already returns an opaque, principal-safe result with no upstream leakage.
- `replayKeys` is ready for the UI hooks (08-12) — `byGameId` and `analysisStatus` key shapes are in place even though nothing calls them yet in this plan.
- Pitfall 8 (shared egress rate-limit partition) is documented as an accepted watch item in the module JSDoc, per T-08-08c — no action needed until traffic grows.

---
*Phase: 08-replay-parsing*
*Completed: 2026-07-02*

## Self-Check: PASSED

All created/modified files and task commit hashes verified present on disk / in git history.
