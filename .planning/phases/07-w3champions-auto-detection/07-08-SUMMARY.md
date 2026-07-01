---
phase: 07-w3champions-auto-detection
plan: 08
subsystem: ui
tags: [tanstack-query, sonner, zustand, react, w3champions, sync]

# Dependency graph
requires:
  - phase: 07-03
    provides: graph-store setRecentlyAdvanced (D-07 transient pulse set)
  - phase: 07-06
    provides: SYNC_TTL_MS + w3championsKeys factory (staleTime mirror)
  - phase: 07-07
    provides: syncW3champions + getW3championsSyncStatus server fns (SyncResult/SyncStatus)
provides:
  - useSyncW3championsMutation hook (triggers sync, drives D-07 pulse, invalidates both caches, D-08/D-10 toasts)
  - SyncW3championsButton (always-live action + "Last synced Xm ago" indicator)
  - SyncW3championsButton mounted in UserDropdown (reachable signed-in surface)
affects: [ui-spec, phase-9-pathways]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Sync mutation mirrors useProgressMutation (useMutation + sonner + onSettled invalidation) with NO signed-out branch"
    - "Opaque-bucket toast routing: server SyncStatus drives tailored D-08/D-10 copy, never raw upstream detail"
    - "Always-live button (D-11): no TTL disabled state; isPending spinner only; DB gate bounds actual upstream calls"

key-files:
  created:
    - src/hooks/useSyncW3championsMutation.ts
    - src/components/profile/SyncW3championsButton.tsx
  modified:
    - src/components/auth/UserDropdown.tsx

key-decisions:
  - "Grouped server 'cached' status with 'ok' — a TTL-hit sync still runs detection and can advance nodes, so both drive the D-07 pulse + success toast"
  - "onError (transport failure before a bucket resolves) surfaces its own error+Retry toast, distinct from the resolved 'unreachable' bucket"
  - "formatLastSynced coerces Date|string|null defensively so it survives server-fn serialization of the timestamp"

patterns-established:
  - "Additive sync UX: hook only writes transient highlight + invalidates caches; never disables manual/quiz mutations (AUTO-05)"

requirements-completed: [AUTO-01, AUTO-04, AUTO-05]

coverage:
  - id: D1
    description: "useSyncW3championsMutation triggers the principal-keyed sync, drives the D-07 pulse via setRecentlyAdvanced, and invalidates both syncStatus + progress caches on settle"
    requirement: "AUTO-01"
    verification:
      - kind: unit
        ref: "npx tsc --noEmit (exits 0); grep invalidateQueries == 2"
        status: pass
    human_judgment: true
    rationale: "Toast outcome routing (D-08/D-10 buckets) and the visible D-07 node pulse are UX behaviors requiring live in-browser verification (VALIDATION.md Manual-Only)"
  - id: D2
    description: "SyncW3championsButton is always live (D-11, no TTL disabled state) with a staleTime: SYNC_TTL_MS last-synced query"
    requirement: "AUTO-04"
    verification:
      - kind: unit
        ref: "npx tsc --noEmit (exits 0); grep staleTime present"
        status: pass
    human_judgment: true
    rationale: "'Always clickable, never gated/countdown' and the 'Last synced Xm ago' relative label are visual/interaction behaviors needing manual confirmation"
  - id: D3
    description: "Sync surface reachable from the signed-in UserDropdown without a separate linking step; sync UI never gates manual/quiz tracking"
    requirement: "AUTO-05"
    verification:
      - kind: unit
        ref: "npx tsc --noEmit (exits 0); grep SyncW3championsButton in UserDropdown; npm test 412 pass"
        status: pass
    human_judgment: true
    rationale: "End-to-end 'open dropdown, click Sync, manual check-off still works' is a manual UAT step per VALIDATION.md"

# Metrics
duration: 8min
completed: 2026-07-01
status: complete
---

# Phase 07 Plan 08: Sync UX Wiring Summary

**Always-live "Sync with w3champions" dropdown action wired to a useSyncW3championsMutation hook that drives the D-07 node pulse, invalidates both progress + syncStatus caches, and surfaces tailored D-08/D-10 outcome toasts.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-07-01T20:30:00Z
- **Completed:** 2026-07-01T20:36:00Z
- **Tasks:** 3
- **Files modified:** 3 (2 created, 1 modified)

## Accomplishments
- `useSyncW3championsMutation` — calls the principal-keyed `syncW3champions` server fn (no client data), branches the server `SyncStatus` into D-07 pulse + D-08/D-10 toasts, and invalidates BOTH `w3championsKeys.syncStatus()` and `progressKeys.byUser()` on settle.
- `SyncW3championsButton` — always-clickable (D-11) sync action with an `isPending` spinner and a `staleTime: SYNC_TTL_MS` last-synced query rendering "Last synced Xm ago".
- Mounted the button above Sign-out in `UserDropdown`, making the sync reachable from the signed-in profile surface with no separate linking step (BattleTag comes from the session).

## Task Commits

Each task was committed atomically:

1. **Task 1: Create useSyncW3championsMutation hook** - `7356f28` (feat)
2. **Task 2: Create SyncW3championsButton** - `2110d13` (feat)
3. **Task 3: Mount SyncW3championsButton in UserDropdown** - `505d355` (feat)

## Files Created/Modified
- `src/hooks/useSyncW3championsMutation.ts` - Sync mutation: triggers server fn, drives D-07 pulse (setRecentlyAdvanced), invalidates both caches, routes D-08/D-10 outcome toasts.
- `src/components/profile/SyncW3championsButton.tsx` - Always-live sync action + "Last synced Xm ago" from a TTL-mirroring status query.
- `src/components/auth/UserDropdown.tsx` - Mounts SyncW3championsButton above Sign-out; refreshed the stale "deferred to Phase 7" header comment.

## Decisions Made
- **`cached` grouped with `ok`:** the server returns `cached` on a TTL hit, but detection still runs against the cached signals and can produce `advanced` ids — so both statuses drive the D-07 pulse and a success toast. Treating `cached` as anything else would silently drop the pulse.
- **Separate `onError` toast:** a transport failure that never resolves a bucket status gets its own error+Retry toast, distinct from the server-resolved `unreachable` bucket (D-10a).
- **Defensive `formatLastSynced`:** accepts `Date | string | null` and coerces, so the "Last synced Xm ago" label is robust to server-fn serialization of the timestamp.

## Deviations from Plan

None - plan executed exactly as written. (The `cached` status handling is within Task 1's specified "branch on the returned status" scope — the plan enumerated ok/rate-limited/unreachable/no-data; `cached` is the fifth `SyncStatus` member from 07-07 and is handled identically to `ok`.)

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Sync UX is complete and type-checks clean; full suite green (412 tests).
- Copy and visual styling are functional placeholders — exact wording, relative-time formatting, and the auto/w3champions marker glyph are deferred to the UI-SPEC pass (as scoped in the plan).
- Manual UAT (per VALIDATION.md Manual-Only): log in, open the profile dropdown, click Sync, confirm "Last synced Xm ago" updates and freshly-advanced nodes pulse/label distinct.

## Self-Check: PASSED

---
*Phase: 07-w3champions-auto-detection*
*Completed: 2026-07-01*
