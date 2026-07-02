---
phase: 08-replay-parsing
plan: 12
subsystem: ui
tags: [tanstack-start, react-query, xyflow, w3champions, replay, drag-drop]

requires:
  - phase: 08-11
    provides: uploadReplay / pullReplays / getReplayAnalysis server functions, ReplayReport shape
  - phase: 08-08
    provides: fetchReplayBytes + replay-keys query-key factory
provides:
  - /replays route — drag-drop .w3g uploader + "Pull recent replays" CTA + actionable per-signal report (REPLAY-04/05/07)
  - useUploadReplayMutation / usePullReplaysMutation hooks (sonner toasts, D-05 graph pulse, dual-cache invalidation)
  - Race-colored graph nodes (faction accent bar) — activated the dormant getFactionTint hook
affects: [08-13, ui-review, verify-work]

tech-stack:
  added: []
  patterns:
    - "Server-only module isolation: dynamic import() of w3gjs-backed parser so it never enters the client bundle"
    - "REPLAY-07 report/advance split: detectReplaySignals emits every evaluated node (met flag); write path filters to met"

key-files:
  created:
    - src/hooks/useUploadReplayMutation.ts
    - src/hooks/usePullReplaysMutation.ts
    - src/routes/replays.tsx
  modified:
    - src/server/replay.ts
    - src/lib/replay-thresholds.ts
    - src/lib/object-id-maps/index.ts
    - content/nodes/build-order-nightelf.mdx
    - src/components/graph/GraphNode.tsx

key-decisions:
  - "Report renders from the mutation RESULT (uploadReplay/pullReplays), never getReplayAnalysis (whose actual is always null)"
  - "w3gjs is dynamically imported inside the server handlers — static import leaked it into the /replays client bundle (crash at eval)"
  - "detectReplaySignals emits met AND unmet nodes; only met nodes advance mastery (REPLAY-07 feedback completeness)"
  - "buildOrderTiming is race-gated: a node advances only when the resolved opener's race matches the node's race"
  - "Auto-pull uses the player-scoped /api/matches/search?playerId&season endpoint (season required, gateway not — region-agnostic)"

patterns-established:
  - "Client/server bundle boundary: any w3gjs-touching code loaded via dynamic import(); only import type crosses statically"
  - "Race faction accent: getFactionTint drives a 3px left bar per race; agnostic nodes stay neutral"

requirements-completed: [REPLAY-04, REPLAY-05, REPLAY-07]
---

## Accomplishments

Shipped the `/replays` Replay Analysis surface: a drag-drop `.w3g` uploader with a client-side 4 MB cap + inline rejection (ADR 011 §3), a "Pull recent replays from w3champions" CTA mirroring the Phase 7 sync button, an actionable per-signal report (REPLAY-07 — "you did X; target for '{node}' is Y"), the D-05 graph pulse, and dual-cache invalidation. Two `useMutation` hooks (`useUploadReplayMutation`, `usePullReplaysMutation`) with sonner toast branching over the `ReplayStatus` buckets.

Tasks 1 & 2 (hooks + route) were built autonomously. Task 3 was a human-verify checkpoint against real w3champions replays, which surfaced **seven** issues — all fixed, committed, and re-verified before the user approved.

## Verification findings & fixes (Task 3)

1. **`6d48009` — client bundle crash.** `/replays` threw "Class extends value undefined is not a constructor or null". The server module statically imported the w3gjs-backed parser; TanStack Start retains exported handler functions client-side, dragging `class W3GReplay extends EventEmitter` into the browser. Fix: dynamic `import()` of the parser inside the handlers — verified 0 w3gjs markers in the client bundle.
2. **`417d8f0` — opener coverage.** Advancement only triggered on each race's single canonical opener (footman/grunt/ghoul/archer). Broadened to real opening units (rifle `hrif`, headhunter `ohun`, fiend `ucry`, huntress `esen`), codes confirmed against w3gjs mappings + real replays.
3. **`6da328d` — report dropped misses.** `detectReplaySignals` filtered out unmet nodes and the server used that list for both the report and the write, so a missed target showed an empty report. Split: emit every evaluated node with a `met` flag; write path filters to `met`.
4. **`e6295d1` — race cross-contamination.** The detector evaluated all four race build-order nodes against one opener timing, so an orc opener could "master" the undead node. Race-gated: a build-order node advances only when the resolved opener's race matches the node's race.
5. **`9208608` — night-elf node silently missing.** `build-order-nightelf.mdx` had an unquoted YAML citation note containing `: `, which js-yaml rejected; content-collections silently dropped the whole document (17 files → 16 docs) since 08-10. Quoted the notes; all 17 nodes now compile.
6. **`c61dec5` — pull found no games (REPLAY-05).** `resolveRecentGameIds` queried the global feed and filtered client-side, so it almost never contained the player's own games. Switched to the player-scoped `/api/matches/search?playerId&season&gameMode=1` endpoint (season required, gateway not — region-agnostic), season resolved live from `/api/ladder/seasons`.
7. **`613a74f` — race node coloring.** Phase 8 introduced the first race-specific nodes but they rendered identically. Activated the dormant `getFactionTint` hook: a faction-colored left accent bar (human blue / orc red / undead purple / night elf teal); agnostic nodes unchanged.

## Deviations from plan

The plan scoped only the UI surface (Tasks 1–3). The seven fixes above reach into 08-04 (object-id-maps), 08-09 (replay-thresholds), 08-11 (server replay), Phase-2 graph rendering, and 08-10 content — because real-replay verification is the first point at which those upstream defects became observable. Each was surfaced to the user and explicitly approved before implementation. No change to the plan's own deliverables.

## Known follow-ups (not blocking)

- Build-order thresholds are aggressive (e.g. orc 1:40); real ladder openings often miss them. The report now shows the miss with actual-vs-target, but threshold tuning is a content follow-up if desired.
- The report lists all four races' build-order nodes to every player (non-matching races show "no measurement"). Filtering the report to the player's race is an optional UX refinement.
- content-collections silently drops YAML-invalid documents — a file-count-vs-doc-count guard would catch a future recurrence of finding #5.

## Self-Check: PASSED

- typecheck clean, `npm run build` succeeds, full suite **517 tests** green
- client bundle verified free of w3gjs; server build retains the parser
- pull endpoint + race-gating verified live against the user's real replays
- user approved the Task 3 human-verify checkpoint
