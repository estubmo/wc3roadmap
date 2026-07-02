---
phase: 08-replay-parsing
plan: 11
subsystem: api
tags: [drizzle, postgres, tanstack-start, w3gjs, replay-parsing, monotonic-upsert]

# Dependency graph
requires:
  - phase: 08-replay-parsing
    provides: parseReplay/replay-parser.ts (08-03), deriveReplaySignals+isSoloMatch/replay-signals.ts (08-04/08-05), detectReplaySignals/replay-thresholds.ts (08-09), mastery-ordinal.ts (08-04), replayAnalysis schema table (08-06), fetchReplayBytes+W3C_BASE_URL/w3champions-client.ts (08-08), authMiddleware/auth-middleware.ts (Phase 4), CURRENT_PATCH/patches.ts (Phase 7)
provides:
  - "uploadReplay server fn (REPLAY-04): manual .w3g upload, principal-keyed, monotonic-max write for 1v1"
  - "pullReplays server fn (REPLAY-05): auto-pull from w3champions with gameId cache-gate (D-17)"
  - "getReplayAnalysis server fn (REPLAY-07): principal-keyed durable replay-mastery read"
  - "writeMonotonicMax helper: the phase's one new write semantic (D-03/D-04 atomic setWhere ordinal upsert)"
affects: [08-12-replay-analysis-ui, 08-13-wc3v-integration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Monotonic-max upsert: onConflictDoUpdate + setWhere ordinal CASE guard, proven via .returning() race-safe signal (not a JS pre-check)"
    - "Opaque-bucket cache payload extension: JSON text column carries a sibling isSolo flag alongside the documented ReplaySignals shape, avoiding a schema change to enforce D-15 structurally on cache hits"

key-files:
  created:
    - src/server/replay.ts
    - src/server/replay.test.ts
  modified: []

key-decisions:
  - "patchId resolves to CURRENT_PATCH.id for every replay write — no buildNumber->patch-boundary mapping table exists yet in patches.ts; buildNumber is stored raw alongside it (D-12) so a future precise resolution needs no re-parse"
  - "pullReplays resolves candidate gameIds by querying w3champions' general /api/matches?gameMode=1 feed (confirmed live) and filtering client-side by the principal's BattleTag — no verified player-scoped upstream filter parameter was found this session"
  - "getReplayAnalysis's actual value is always null — no per-principal 'last report' store exists; the detailed per-parse report is the direct return value of uploadReplay/pullReplays, rendered by 08-12's mutation result"
  - "FormData upload field name is 'file' — a contract 08-12's client hook must match"

patterns-established:
  - "writeMonotonicMax(results, principal, patchId) — reusable per-result monotonic-max write helper, called from both uploadReplayHandler and pullReplaysHandler"

requirements-completed: [REPLAY-04, REPLAY-05, REPLAY-06, REPLAY-07]

coverage:
  - id: D1
    description: "uploadReplay parses an uploaded .w3g, matches the principal's slot by BattleTag, derives signals, and (for 1v1) applies the monotonic-max write, returning an actionable report"
    requirement: "REPLAY-04"
    verification:
      - kind: unit
        ref: "src/server/replay.test.ts#uploadReplayHandler — monotonic-max write (D-02/D-03/D-04)"
        status: pass
    human_judgment: false
  - id: D2
    description: "pullReplays checks the gameId cache first (never re-parses a known gameId), downloads via fetchReplayBytes, parses on miss, caches signals by gameId, and writes"
    requirement: "REPLAY-05"
    verification:
      - kind: unit
        ref: "src/server/replay.test.ts#pullReplaysHandler — gameId cache-gate (D-17)"
        status: pass
    human_judgment: false
  - id: D3
    description: "The write is monotonic-max: replay only ever raises masteryState, stamps source:'replay' only on an actual raise, never downgrades"
    requirement: "REPLAY-06"
    verification:
      - kind: unit
        ref: "src/server/replay.test.ts#uploadReplayHandler — monotonic-max write (D-02/D-03/D-04) > does NOT downgrade an existing higher state"
        status: pass
    human_judgment: false
  - id: D4
    description: "Team/FFA replays parse and return signals as feedback but never advance mastery (D-15), including on a cached gameId re-pull"
    requirement: "REPLAY-06"
    verification:
      - kind: unit
        ref: "src/server/replay.test.ts#uploadReplayHandler > a non-1v1 (team/FFA) fixture returns signals but advances zero nodes (D-15)"
        status: pass
      - kind: unit
        ref: "src/server/replay.test.ts#pullReplaysHandler > a cache hit only writes mastery when the cached isSolo flag is true (D-15 structural gate)"
        status: pass
    human_judgment: false
  - id: D5
    description: "getReplayAnalysis returns the principal's replay-mastery entries keyed by context.principal.id only, no userId channel"
    requirement: "REPLAY-07"
    verification:
      - kind: unit
        ref: "src/server/replay.test.ts#getReplayAnalysisHandler — principal-keyed read"
        status: pass
    human_judgment: false

# Metrics
duration: 40min
completed: 2026-07-02
status: complete
---

# Phase 08 Plan 11: Replay Convergence Server Module Summary

**Principal-keyed `uploadReplay`/`pullReplays`/`getReplayAnalysis` server functions with an atomic monotonic-max `onConflictDoUpdate`+`setWhere` write path that only ever raises mastery, gated to 1v1 replays.**

## Performance

- **Duration:** ~40 min
- **Completed:** 2026-07-02
- **Tasks:** 3
- **Files modified:** 2 (both new)

## Accomplishments
- Built `writeMonotonicMax`, the phase's one new write semantic: an atomic `onConflictDoUpdate` + `setWhere` ordinal-CASE guard that only raises `masteryState` and only re-stamps `source:"replay"` on an actual raise — proven via Postgres's `RETURNING` semantics (a row that fails the `WHERE` predicate is never returned), not a JS-level pre-check
- Wired `uploadReplayHandler` (REPLAY-04): FormData `.w3g` intake → server-side 4MB defensive size backstop (ADR 011 §3) → `parseReplay` → normalized BattleTag player-slot match (D-14/Pitfall 6) → `deriveReplaySignals`/`detectReplaySignals` → monotonic-max write gated to 1v1 (D-15)
- Wired `pullReplaysHandler` (REPLAY-05): principal-derived gameId resolution (never client-supplied) → D-17 cache gate (`replayAnalysis.gameId` lookup skips fetch+parse entirely on a hit) → cache-miss fetch/parse/cache/write pipeline, with the D-15 1v1 gate enforced structurally on BOTH the fresh-parse path (`isSoloMatch`) and the cache-hit path (a new `isSolo` flag piggybacked onto the cached JSON payload, since a cache hit has no raw `ParserOutput` to re-derive player count from)
- Wired `getReplayAnalysisHandler` (REPLAY-07): principal-keyed durable read of every `nodeProgress` row with `source:"replay"`, paired with its content-authored target/signal

## Task Commits

Each task was committed atomically:

1. **Task 1: monotonic-max write helper + uploadReplay server fn** - `8cba8a6` (feat)
2. **Task 2: pullReplays auto-pull with gameId cache-gate** - `b1d8010` (feat)
3. **Task 3: getReplayAnalysis principal-keyed read** - `0bc7504` (feat)

**Plan metadata:** (this commit)

## Files Created/Modified
- `src/server/replay.ts` - `writeMonotonicMax`, `uploadReplay`/`uploadReplayHandler`, `pullReplays`/`pullReplaysHandler`, `getReplayAnalysis`/`getReplayAnalysisHandler`, plus `normalizePlayerName`/`findPrincipalPlayer` (D-14/Pitfall 6) and the internal `resolveRecentGameIds` gameId resolver
- `src/server/replay.test.ts` - 18 Wave-0 tests covering authorization, monotonic-max (raise + non-downgrade), the D-15 1v1 gate (fresh-parse and cache-hit), the D-17 cache gate, BattleTag matching, upload size backstop, and principal-keyed read

## Decisions Made
- **`patchId` resolves to `CURRENT_PATCH.id`** for every write (both `nodeProgress` and the `replayAnalysis` cache row). No buildNumber→patch-boundary mapping table exists yet in `patches.ts` (only the `objectIdMapVersion` hook, consumed by the pure `replay-thresholds.ts` layer). The raw `buildNumber` is stored alongside `patchId` in the cache row (D-12) specifically so a future, more precise resolution can be added without re-parsing any cached replay.
- **Recent-gameId resolution for `pullReplays`** queries w3champions' general, unauthenticated `/api/matches?gameMode=1&offset&pageSize` feed (confirmed live during this plan — the same endpoint 08-01's fixture-sourcing spike used) and filters client-side for matches containing the principal's own BattleTag. No verified player-scoped server-side filter parameter (`playerId`/`playerIds`/`search`/`battleTag`) was found against the live API in this session — all four tried on `/api/matches/search` returned an empty result regardless of a known-active player. This is a documented `[ASSUMED]` approach, correct regardless of whether a hidden upstream filter exists, at the cost of only searching the most recent page of the global feed. Flagged for future re-verification if this proves too shallow in practice.
- **`getReplayAnalysis`'s `actual` field is always `null`.** No per-principal "last report" store exists — only the GLOBAL, gameId-keyed `replayAnalysis` cache (D-17). The detailed per-parse report (with real `actual` values) is the direct return value of `uploadReplay`/`pullReplays`, which 08-12's UI renders straight from the mutation result. This durable read exists for returning-later contexts (node detail panel, report surface after a page reload) where only the target/signal pairing (not the specific measured value) is durably meaningful.
- **The FormData upload field name is `"file"`** (`UPLOAD_FIELD_NAME` constant) — a contract 08-12's `useUploadReplayMutation` must match when building the FormData it POSTs.
- **The D-15 1v1 gate on a `pullReplays` cache hit** is enforced via a new `isSolo` boolean piggybacked onto the JSON payload stored in `replayAnalysis.signals` (extending, not replacing, the documented "JSON-stringified `ReplaySignals`" shape from 08-06) rather than a schema/column change — this plan's `files_modified` scope is `src/server/replay.ts`/`replay.test.ts` only.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added a server-side defensive upload size backstop**
- **Found during:** Task 1 (uploadReplayHandler)
- **Issue:** ADR 011 §3 explicitly requires a server-side defensive size check as a backstop to the client-side 4MB cap ("the server function itself should also reject oversized bodies defensively... consistent with this project's pattern of not trusting client-side checks alone") — the plan's Task 1 action text didn't call this out explicitly, but the threat model (T-08-11d) and ADR 011 both make it a correctness/security requirement, not optional.
- **Fix:** Added a `MAX_REPLAY_BYTES` (4MB) check on the uploaded file's `size` BEFORE `parseReplay` is invoked, returning `parse-failed` on violation.
- **Files modified:** src/server/replay.ts
- **Verification:** `replay.test.ts#rejects an oversized upload BEFORE parsing` asserts `parseReplay` is never called for an oversized file.
- **Committed in:** 8cba8a6 (Task 1 commit)

**2. [Rule 2 - Missing Critical] Structural D-15 1v1 gate on pullReplays' cache-hit path**
- **Found during:** Task 2 (pullReplaysHandler)
- **Issue:** The plan's D-17 cache-gate behavior ("reuse cached signals, skip fetch+parse entirely") doesn't specify how the D-15 1v1-only mastery gate should apply to a cache hit. Naively reusing cached signals and unconditionally writing mastery on every cache hit would risk writing mastery from a non-1v1 replay's cached signals if the upstream `gameMode=1` filter assumption ever proved wrong (Pitfall 7 explicitly requires the 1v1 gate be enforced "structurally, not just at threshold-check time").
- **Fix:** Extended the cache payload (JSON stored in `replayAnalysis.signals`) with a sibling `isSolo` boolean alongside the documented `ReplaySignals` shape, computed once at fresh-parse time via `isSoloMatch(parsed)` and consulted on every subsequent cache hit before calling `writeMonotonicMax`.
- **Files modified:** src/server/replay.ts
- **Verification:** `replay.test.ts#a cache hit only writes mastery when the cached isSolo flag is true (D-15 structural gate)` asserts zero writes when `isSolo: false`.
- **Committed in:** b1d8010 (Task 2 commit)

**3. [Rule 2 - Missing Critical] Added a gameId-resolution mechanism for pullReplays**
- **Found during:** Task 2 (pullReplaysHandler)
- **Issue:** The plan's action text says pullReplaysHandler should "resolve recent gameIds for the principal (via the principal's identity)" but no prior plan in this phase built a player-scoped gameId-listing/match-history client function — `fetchReplayBytes` (08-08) only downloads a KNOWN gameId's bytes. Without a gameId source, pullReplays cannot function at all.
- **Fix:** Added `resolveRecentGameIds` inside `replay.ts`, querying w3champions' confirmed-live general `/api/matches?gameMode=1` feed and filtering client-side by the principal's BattleTag (see "Decisions Made" above for the live-endpoint verification detail).
- **Files modified:** src/server/replay.ts
- **Verification:** `replay.test.ts#resolves candidate gameIds from the principal's own battleTag, never from client input` asserts the outbound fetch URL and battleTag-only input.
- **Committed in:** b1d8010 (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (all Rule 2 — missing critical functionality required for correctness/security per the plan's own threat model and ADR 011, or required for the handler to function at all). No scope creep beyond `src/server/replay.ts`/`replay.test.ts`.
**Impact on plan:** All three additions are essential; none change the plan's declared file scope, write semantics, or public server-fn surface (`uploadReplay`/`pullReplays`/`getReplayAnalysis`).

## Issues Encountered
- Attempted to verify a player-scoped w3champions match-search endpoint (`/api/matches/search?playerId=...` and variants: `playerIds`, `search`, `battleTag`, `playertag`) via live HTTP requests — all returned `{"matches":[],"count":0}` regardless of a known-active player's BattleTag, even though the general `/api/matches?gameMode=1` feed (without a player filter) returns real, current data. Resolved by using the general feed + client-side filtering instead (see Decisions Made). Not a blocker — documented as a known limitation for a future plan to re-verify if auto-pull proves too shallow at v1 traffic.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `uploadReplay`, `pullReplays`, and `getReplayAnalysis` are ready for 08-12's UI hooks (`useUploadReplayMutation`/`usePullReplaysMutation`) and the `/replays` route — 08-12 must POST FormData with the `.w3g` file under the `"file"` field to match `uploadReplay`'s contract, and should render its report directly from the mutation's `ReplayReport` return value (not `getReplayAnalysis`, which only carries durable target/signal data, not per-parse `actual` values).
- The `writeMonotonicMax` helper is reusable as-is for 08-13 if the wc3v advanced-analysis layer produces its own `ReplayNodeResult[]` — no new write-path work should be needed there.
- Known limitation carried forward: `pullReplays`' gameId resolution only scans the most recent page (25 entries) of w3champions' global 1v1 feed — a principal whose most recent 1v1 games have scrolled off that page within `RECENT_MATCHES_PAGE_SIZE` won't have them auto-pulled. Acceptable at v1 traffic; flagged for future re-verification of a proper player-scoped search endpoint if it becomes a real gap.

---
*Phase: 08-replay-parsing*
*Completed: 2026-07-02*

## Self-Check: PASSED

All created files verified present on disk (`src/server/replay.ts`, `src/server/replay.test.ts`); all 3 task commits (8cba8a6, b1d8010, 0bc7504) verified present in git log; `npx vitest run src/server/replay.test.ts` (18/18) and full `npm test` (512/512) both green; `npx tsc --noEmit` clean.
