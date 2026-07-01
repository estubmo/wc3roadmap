---
phase: 07-w3champions-auto-detection
plan: 06
subsystem: api
tags: [w3champions, fetch, zod, tanstack-query, http-client, mmr]

# Dependency graph
requires:
  - phase: 07-01
    provides: mmr-tiers.ts (tierForMmr) — coarse mmrTier derivation from raw mmr
  - phase: 05
    provides: progress-keys.ts — query-key factory shape copied for w3championsKeys
provides:
  - "fetchW3championsSignals — native-fetch client resolving season + career games + season MMR into coarse W3cSignals"
  - "classifyW3championsResponse — pure D-10 status->bucket classifier (ok/no-data/unreachable/rate-limited)"
  - "W3C_BASE_URL — hardcoded w3champions backend host constant (SSRF guard)"
  - "w3championsKeys — TanStack query-key factory (all + syncStatus)"
  - "SYNC_TTL_MS — single 15-min TTL constant shared by DB gate (07-07) and staleTime mirror (07-08)"
affects: [07-07, 07-08]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure status-classifier isolated from I/O — fetch orchestration delegates the D-10 bucket mapping to a mock-free unit-testable function"
    - "Zod-validate every upstream body before reading fields (ASVS V5, hostile-JSON defense)"
    - "Client-safe constants module (w3champions-keys.ts) split from server-only fetch client so the hook can import SYNC_TTL_MS without bundling fetch code"

key-files:
  created:
    - src/lib/w3champions-keys.ts
    - src/lib/w3champions-client.ts
    - src/lib/w3champions-client.test.ts
  modified: []

key-decisions:
  - "classifyW3championsResponse is a pure fn over a discriminated ClassifyInput ({kind:network-error} | {kind:http,status,player?,gameModeStats?}) — the whole D-10 contract is unit-testable without a live fetch"
  - "ok/no-data split: 200 is 'ok' when there is ANY usable signal (game-mode-stats populated OR career gamesPlayed>0); 'no-data' only when both are empty (Pitfall 1)"
  - "non-2xx/non-429/non-404 (e.g. 500) maps to 'unreachable' (server problem), never to no-data"
  - "us->America, eu->Europe, kr->America [ASSUMED] via a one-line private mapGateway (Pitfall 4)"
  - "mmrTier derived from the highest-rankingPoints entry's raw mmr via tierForMmr — never leagueId/League name (Pitfall 5)"
  - "W3cSignals type imported from detect-mastery-signals.ts (single source of truth for the signal shape consumed downstream)"

patterns-established:
  - "Outbound HTTP client discipline: hardcoded base URL, encodeURIComponent on every interpolated path segment, single try/catch -> unreachable, no retry/backoff (DB TTL gate owns call-volume control)"

requirements-completed: [AUTO-01, AUTO-02, AUTO-04]

coverage:
  - id: D1
    description: "classifyW3championsResponse maps every outcome to a D-10 bucket (network-error->unreachable, 429->rate-limited, 404->no-data, 200-populated->ok, 200-empty+zero->no-data, 500->unreachable)"
    requirement: "AUTO-02"
    verification:
      - kind: unit
        ref: "src/lib/w3champions-client.test.ts#classifyW3championsResponse"
        status: pass
    human_judgment: false
  - id: D2
    description: "fetchW3championsSignals derives mmrTier via tierForMmr and gamesPlayed as sum of winLosses[].games on a populated 200 response"
    requirement: "AUTO-02"
    verification:
      - kind: unit
        ref: "src/lib/w3champions-client.test.ts#fetchW3championsSignals 200 populated -> ok"
        status: pass
    human_judgment: false
  - id: D3
    description: "BattleTag '#' is encodeURIComponent-ed (%23) and gateway kr maps to America in the outbound URLs"
    requirement: "AUTO-01"
    verification:
      - kind: unit
        ref: "src/lib/w3champions-client.test.ts#encodeURIComponent-s the BattleTag '#' and maps kr -> America"
        status: pass
    human_judgment: false
  - id: D4
    description: "w3championsKeys factory + single SYNC_TTL_MS (15 min) constant shared across DB gate and staleTime mirror"
    requirement: "AUTO-04"
    verification:
      - kind: other
        ref: "npx tsc --noEmit (type-checks; SYNC_TTL_MS === 15*60*1000)"
        status: pass
    human_judgment: false

# Metrics
duration: 6min
completed: 2026-07-01
status: complete
---

# Phase 07 Plan 06: w3champions HTTP Client + D-10 Classifier Summary

**Native-fetch w3champions client that resolves the current season, sums career games and reads season MMR, derives coarse W3cSignals (mmrTier via tierForMmr, gamesPlayed), and classifies every outcome into the four D-10 buckets — plus the shared w3championsKeys factory and single SYNC_TTL_MS constant.**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-07-01T18:05:41Z
- **Completed:** 2026-07-01T18:11:06Z
- **Tasks:** 3
- **Files created:** 3

## Accomplishments
- `classifyW3championsResponse` — a pure, mock-free-testable function encoding the entire D-10 status->bucket contract (ok / no-data / unreachable / rate-limited)
- `fetchW3championsSignals` — native `fetch` orchestration (season -> career games -> season MMR) with Zod validation of every upstream body and a single try/catch collapsing any failure to `unreachable`
- `w3champions-keys.ts` — client-safe query-key factory + the single named `SYNC_TTL_MS` (15 min) that both the DB TTL gate (07-07) and TanStack `staleTime` mirror (07-08) will import, guaranteeing AUTO-04 criterion 3 holds across tabs/devices
- 12 passing unit tests covering all five buckets, `encodeURIComponent` (%23), and the kr->America mapping

## Task Commits

Each task committed atomically:

1. **Task 1: w3champions-keys.ts (query-key factory + SYNC_TTL_MS)** — `a78595d` (feat)
2. **Task 2: Wave-0 status-classifier test (RED)** — `0fe367f` (test)
3. **Task 3: w3champions-client.ts (GREEN)** — `3282992` (feat)

_TDD gate order verified: RED `test(...)` commit `0fe367f` precedes GREEN `feat(...)` commit `3282992`._

## Files Created/Modified
- `src/lib/w3champions-keys.ts` — client-safe `w3championsKeys` factory (`all` + `syncStatus`) and the shared `SYNC_TTL_MS` constant
- `src/lib/w3champions-client.ts` — `fetchW3championsSignals`, `classifyW3championsResponse`, `W3C_BASE_URL`; Zod schemas for seasons/player/game-mode-stats; private `mapGateway`
- `src/lib/w3champions-client.test.ts` — 12 tests: end-to-end (mocked global fetch) + pure-classifier unit coverage

## Decisions Made
- **`classifyW3championsResponse` is a pure function over a discriminated `ClassifyInput`** (`network-error` | `http` with optional parsed bodies), so the D-10 contract is fully unit-testable with zero mocking; `fetchW3championsSignals` only does I/O then delegates.
- **ok vs no-data on a 200:** "ok" when any usable signal exists (game-mode-stats populated OR career `gamesPlayed > 0`); "no-data" only when both are empty (Pitfall 1 — never an error).
- **Non-2xx other than 429/404 (e.g. 500) -> `unreachable`**, distinguishing a server problem from a never-onboarded BattleTag (404 -> no-data).
- **`mmrTier` from the highest-`rankingPoints` entry's raw `mmr` via `tierForMmr`** — never `leagueId`/League name (Pitfall 5, avoids a season-fragile extra API call).
- **`W3cSignals` type imported from `detect-mastery-signals.ts`** — single source of truth for the shape the detector (07-05) consumes.

## Deviations from Plan

None - plan executed exactly as written. All three tasks and their acceptance criteria were met with no auto-fixes required.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required (the w3champions player-stat endpoints need no API key).

## Next Phase Readiness
- **07-07 (sync server fn)** can now import `fetchW3championsSignals` for the TTL-miss path and `SYNC_TTL_MS` for the DB gate; it receives a clean tagged `{ status, signals? }` result and never re-parses HTTP.
- **07-08 (sync hook/UI)** can import `w3championsKeys` and `SYNC_TTL_MS` from the client-safe keys module without bundling fetch code.
- Live-fire caveat (carry-over blocker, not new): the kr->America gateway mapping and the 15-min TTL are both `[ASSUMED]` and should be confirmed against real w3champions traffic before public rollout; both degrade gracefully (kr wrong-case -> D-10c no-data; TTL is cosmetic).

---
*Phase: 07-w3champions-auto-detection*
*Completed: 2026-07-01*

## Self-Check: PASSED

All created files exist on disk (`w3champions-keys.ts`, `w3champions-client.ts`, `w3champions-client.test.ts`, `07-06-SUMMARY.md`) and all three task commits (`a78595d`, `0fe367f`, `3282992`) are present in git history.
