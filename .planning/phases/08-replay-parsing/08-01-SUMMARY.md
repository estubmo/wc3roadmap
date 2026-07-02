---
phase: 08-replay-parsing
plan: 01
subsystem: replay-parsing
tags: [w3gjs, replay-parsing, adr, spike, w3champions, upload]

requires:
  - phase: 05-progress-tracking
    provides: node_progress table + text() source enum (ADR 009) that "replay" extends in later plans
  - phase: 07-w3champions-integration
    provides: src/lib/w3champions-client.ts (W3C_BASE_URL SSRF-guarded fetch pattern, fetchReplayBytes)
provides:
  - w3gjs@4.1.0 installed and human-verified (SUS-flagged package legitimacy gate cleared)
  - Real measured w3gjs parse-cost numbers (wall-time + heap delta) for a real 1v1 .w3g replay
  - Functional confirmation of the public w3champions GET /api/replays/{gameId} endpoint
  - ADR 011 recording the inline parse-location decision + 4MB client upload cap, binding on all downstream replay server-fn plans
  - src/lib/__fixtures__/ real-replay fixture convention + first committed fixture (1v1-sample.w3g)
affects: [08-replay-parsing]

tech-stack:
  added: ["w3gjs@4.1.0 (single transitive dep protobufjs@8.6.5)"]
  patterns:
    - "Real-replay fixtures convention (src/lib/__fixtures__/) for the Nyquist real-binary check"
    - "Wave-0 spike script pattern (scripts/spike-*.ts) — one-off diagnostic, not a test, run via npx tsx"

key-files:
  created:
    - scripts/spike-replay-parse.ts
    - src/lib/__fixtures__/README.md
    - src/lib/__fixtures__/1v1-sample.w3g
    - docs/adr/011-replay-parse-architecture.md
  modified:
    - package.json
    - package-lock.json

key-decisions:
  - "w3gjs@4.1.0 human-verified legitimate (MIT, github.com/PBug90/w3gjs, single dep protobufjs, no postinstall) — checkpoint approved 2026-07-02"
  - "Parse .w3g bytes INLINE in the principal-keyed replay server function (not client-side, not a background job) — justified by measured ~110-150ms wall time / negligible heap delta, 99.7%+ headroom under Vercel's 60s/2GB Hobby limits (ADR 011)"
  - "Client-side upload size cap: 4MB, binding on plan 08-12 — derived from Vercel's 4.5MB body limit + TanStack Start FormData buffering constraint (RESEARCH Pitfall 1)"
  - "wc3v (Spike 3) parse cost explicitly deferred to plan 08-13's go/no-go checkpoint — not covered by ADR 011's inline decision"
  - "Real 1v1 replay auto-fetched from public w3champions endpoint (gameId 6a460e52ea6bb176a026d3b2) per user's auto-fetch authorization at the checkpoint, committed as the fixture"

patterns-established:
  - "Wave-0 spike script (scripts/spike-replay-parse.ts): reads a committed fixture, parses with w3gjs, times it, and independently re-exercises the live endpoint via fetchReplayBytes to keep the fixture and the endpoint spike evidence separate but cross-checked"

requirements-completed: [REPLAY-01, REPLAY-05]

coverage:
  - id: D1
    description: "w3gjs@4.1.0 installed behind the SUS-flagged legitimacy checkpoint; npm ls confirms 4.1.0 with protobufjs as sole transitive dep"
    requirement: "REPLAY-01"
    verification:
      - kind: manual_procedural
        ref: "npm ls w3gjs protobufjs (verified: w3gjs@4.1.0 -> protobufjs@8.6.5, no other deps)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Real 1v1 .w3g replay parses to a ParserOutput exposing buildNumber, version, matchup, and players.length >= 2"
    requirement: "REPLAY-01"
    verification:
      - kind: manual_procedural
        ref: "npx tsx scripts/spike-replay-parse.ts (buildNumber=6117, version=2.00, matchup=NvU, players.length=2)"
        status: pass
    human_judgment: false
  - id: D3
    description: "w3champions GET /api/replays/{gameId} endpoint functionally confirmed to return real octet-stream .w3g bytes with no auth required"
    requirement: "REPLAY-05"
    verification:
      - kind: manual_procedural
        ref: "npx tsx scripts/spike-replay-parse.ts (Spike 2: status=ok, header check 'Warcraft III recorded game' passed)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Parse time + memory measured and recorded for the parse-location ADR decision"
    verification:
      - kind: manual_procedural
        ref: "docs/adr/011-replay-parse-architecture.md Decision section 1 (measured table: ~111-148ms wall time, negligible heap delta)"
        status: pass
    human_judgment: false
  - id: D5
    description: "ADR 011 authored recording the inline parse-location decision and the 4MB upload cap contract"
    verification:
      - kind: manual_procedural
        ref: "docs/adr/011-replay-parse-architecture.md exists with Context/Decision/Consequences/Alternatives/Related Decisions sections"
        status: pass
    human_judgment: false

duration: 25min
completed: 2026-07-02
status: complete
---

# Phase 8 Plan 1: Replay Parsing Spikes + ADR Summary

**w3gjs@4.1.0 installed and legitimacy-verified; real 1v1 replay parse benchmarked at ~110-150ms wall-time with negligible memory, confirming inline serverless parsing is safe by a wide margin; w3champions replay-download endpoint functionally confirmed; ADR 011 records the inline parse-location decision and a 4MB client upload cap binding on plan 08-12.**

## Performance

- **Duration:** ~25 min
- **Tasks:** 3
- **Files modified:** 6 (2 new, 4 created)

## Accomplishments
- Cleared the SUS-flagged `w3gjs` legitimacy checkpoint with independent npm metadata verification and installed `w3gjs@4.1.0`
- Auto-fetched a real WC3 1v1 replay from the public w3champions replay endpoint and committed it as the phase's first real-replay test fixture
- Built and ran `scripts/spike-replay-parse.ts`, empirically resolving RESEARCH's two remaining planning-gate spikes (parse cost, endpoint) with real measured numbers instead of assumptions
- Authored ADR 011, deciding the inline parse-location architecture and setting the 4MB client-side upload cap that plan 08-12 must enforce

## Task Commits

Each task was committed atomically:

1. **Task 1: Human-verify w3gjs legitimacy (SUS gate) + provide sample replay** — `341f32e` (docs)
2. **Task 2: Install w3gjs + run parse-cost + endpoint spike** — `e58a4c2` (feat)
3. **Task 3: Record parse-location decision as ADR 011** — `ef023c8` (docs)

**Plan metadata:** (this commit)

## Files Created/Modified
- `src/lib/__fixtures__/README.md` - Real-replay fixture convention documentation + provenance table
- `src/lib/__fixtures__/1v1-sample.w3g` - Real 122KB 1v1 replay (gameId `6a460e52ea6bb176a026d3b2`) auto-fetched from w3champions
- `scripts/spike-replay-parse.ts` - Wave-0 spike script: parses the fixture, re-fetches live from the endpoint, prints wall-time/heap/build metadata for both
- `docs/adr/011-replay-parse-architecture.md` - Parse-location decision (inline server-fn) + 4MB upload cap contract
- `package.json` / `package-lock.json` - Added `w3gjs@4.1.0` dependency

## Decisions Made
- **w3gjs legitimacy approved** (checkpoint resolved): version 4.1.0, MIT license, `github.com/PBug90/w3gjs`, single dependency `protobufjs`, no postinstall scripts — independently corroborated per RESEARCH's Package Legitimacy Audit.
- **Auto-fetch chosen for the fixture** (user's checkpoint response) over manually-provided files: resolved a real, recent 1v1 gameId from the public `/api/matches` endpoint (`gameMode=1` filter) and downloaded it via `fetchReplayBytes`.
- **Parse INLINE in the principal-keyed replay server function** — not client-side, not a background job. Measured parse cost (~110-150ms, negligible heap delta) leaves 99.7%+ headroom under Vercel's 60s/2GB Hobby limits, so no background-job infrastructure is justified. Full rationale in ADR 011 §1-2.
- **4MB client-side upload cap** for manual `.w3g` uploads (plan 08-12 binding requirement) — derived from Vercel's ~4.5MB request-body limit plus TanStack Start's full in-memory `FormData` buffering (RESEARCH Pitfall 1), with headroom for multipart framing overhead.
- **wc3v (Spike 3) parse cost deferred** to plan 08-13's go/no-go checkpoint — this ADR's inline-parse conclusion is scoped to the base w3gjs signal layer only, not assumed to extend to wc3v's additional game-state simulation without its own measurement.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed header-check off-by-3 slice length in spike script**
- **Found during:** Task 2 (first spike script run)
- **Issue:** `download.bytes.subarray(0, 24)` truncated the 27-character `"Warcraft III recorded game"` header check to `"Warcraft III recorded ga"`, causing a false-negative `startsWith` failure even though the downloaded bytes were correct
- **Fix:** Corrected the slice length to 27 characters
- **Files modified:** scripts/spike-replay-parse.ts
- **Verification:** Re-ran the script; header check passed
- **Committed in:** e58a4c2 (Task 2 commit, fixed before commit)

**2. [Rule 1 - Bug] Fixed mislabeled `duration` unit in spike script output**
- **Found during:** Task 2 (first spike script run — printed `551868s` for a 505s-duration match)
- **Issue:** `result.duration` is w3gjs's `replayLengthMS` (milliseconds), not seconds; the original log label (`${result.duration}s`) misrepresented the value by 1000x
- **Fix:** Relabeled as milliseconds with a converted minutes display for readability
- **Files modified:** scripts/spike-replay-parse.ts
- **Verification:** Re-ran the script; output now reads `551868ms (~9.2 min)`, consistent with the ~9-minute real match
- **Committed in:** e58a4c2 (Task 2 commit, fixed before commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 — bugs found and fixed in the spike script before it was committed, not shipped in a broken state)
**Impact on plan:** Both fixes were script-correctness issues discovered while running the very spike the task exists to produce; no scope creep, no impact on the measured architecture conclusions (the underlying parse and fetch results were correct — only two log-formatting bugs were fixed).

## Issues Encountered
- The first several candidate `gameId`s from `/api/matches` (very recent, still-processing matches) returned `500 Internal Server Error` from `/api/replays/{gameId}` — resolved by querying an older page of match history (`offset=500`), whose replay files had already finished processing on w3champions' side. Not a bug in this project's code; a transient upstream processing-lag characteristic of very recent matches, worth noting for future replay-related work but not requiring a plan change here.

## User Setup Required
None - the human-verification checkpoint (w3gjs legitimacy + fixture sourcing) was the only manual step, and it was resolved via the user's "approved... auto-fetch" response before this continuation began.

## Next Phase Readiness
- w3gjs is installed and its API surface (buildNumber, version, matchup, players, apm, groupHotkeys, actions, units/buildings/upgrades/items.order) is confirmed to match RESEARCH's Standard Stack claims — ready for plan 08-02's pure semantic signal layer (`replay-signals.ts`, D-11).
- ADR 011's inline parse-location decision and 4MB upload cap are ready to be consumed by every downstream server-fn plan (upload 08-12, auto-pull, monotonic-max write path).
- The `src/lib/__fixtures__/` convention and first real fixture are ready for reuse by unit tests in later plans (e.g., `replay-signals.test.ts` fixture-driven cases) without needing a second real-replay download.
- No blockers. wc3v's own feasibility (Spike 3) remains open and gated at plan 08-13 per the plan's frontmatter — this plan intentionally did not touch it.

---
*Phase: 08-replay-parsing*
*Completed: 2026-07-02*

## Self-Check: PASSED

All created files verified present on disk; all 3 task commits (341f32e, e58a4c2, ef023c8) verified present in git log.
