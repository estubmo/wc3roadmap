---
phase: 08-replay-parsing
plan: 13
subsystem: infra
tags: [wc3v, gpl-3.0, replay, vendoring, descope]

requires:
  - phase: 08-03
    provides: w3gjs base parser (parseReplay) this layer was to build on
  - phase: 08-11
    provides: base server replay loop (kept fully isolated per D-07)
provides:
  - Vendored wc3v (GPL-3.0) transitive closure under src/lib/wc3v/ as a documented foundation
  - Verified Pitfall-2 fix (w3gjs 3.0.0 -> 4.1.0 internals reconciliation)
  - ADR 012 documenting the wc3v integration attempt + the descope decision + path forward
affects: [phase-8.x]

status: descoped   # REPLAY-03 deferred to Phase 8.x by explicit user decision after the GO attempt hit an external-data wall

tech-stack:
  added: [rbush]
  patterns:
    - "wc3v internals reconciliation: require.resolve('w3gjs') to repoint dist/lib -> dist/cjs; ActionParser named export"

key-files:
  created:
    - src/lib/wc3v/ (76 vendored files, GPL-3.0 headers)
    - src/lib/wc3v/README.md
    - docs/adr/012-wc3v-fork-integration.md
  modified: []

key-decisions:
  - "GO chosen over the spike's NO-GO; vendoring executed, Pitfall-2 internals patch fixed + verified"
  - "REPLAY-03 DESCOPED to Phase 8.x: full wc3v resim is blocked by proprietary/gitignored data (UnitBalance.json cost tables + per-map pathing grids), not by code"
  - "No replay-advanced.ts / server fn / /replays UI section shipped — refusing to ship a stub broken for every real replay"
  - "D-07 isolation preserved: zero edits to replay-parser/replay-signals/replay-thresholds/server-replay base loop"

patterns-established:
  - "Descope valve exercised cleanly: the deferred layer is a self-contained set (src/lib/wc3v/, replay-advanced.*) removable with no base-loop edits"

requirements-completed: []   # REPLAY-03 is DEFERRED, not completed — see status: descoped
requirements-deferred: [REPLAY-03]
---

## Outcome: REPLAY-03 descoped to Phase 8.x (user decision)

This plan attempted the wc3v (GPL-3.0) advanced-analysis integration (REPLAY-03) under an explicit user **GO** decision that overrode the go/no-go spike's NO-GO recommendation. The GO was executed faithfully and got further than the spike predicted, then hit a decisive **external-data** blocker (not a code blocker). The user then chose to **accept the descope to Phase 8.x**.

### What was delivered (committed, kept as foundation)

- **Vendored wc3v** transitive closure (76 files, `src/lib/wc3v/`) at upstream `87edeef`, GPL-3.0-or-later headers on every file, provenance in `src/lib/wc3v/README.md` (D-06). Commit `2ebb3e0`.
- **Pitfall-2 fixed + verified**: reconciled the w3gjs 3.0.0→4.1.0 internals mismatch — repointed `dist/lib/*` → `dist/cjs/*` via `require.resolve("w3gjs")` in `PlayerManager.js` + `mappings.js`, corrected the `ActionParser` named-vs-default export change. `rbush` added.
- **ADR 012** (`docs/adr/012-wc3v-fork-integration.md`) documenting the attempt, all three blockers, and the recommended lighter path forward.

### Why it descoped (external-data wall)

Running the vendored analysis against a real fixture replay surfaced blockers that are data-sourcing, not code:
1. `helpers/UnitBalance.json` (gold/lumber/food cost table `ResourceSeries` needs) is **gitignored by wc3v** — generated from WC3's proprietary SLK data, never public. `require()` → `MODULE_NOT_FOUND`.
2. Per-map pathing grids (`war3map.wpm`/`.doo`) are gitignored **and not derivable from `.w3g` bytes** — would need a separate per-ladder-map extraction pipeline.
3. `World.js → PathFinder.js` transitively needs `d3` (a RESEARCH.md "d3-isolated" correction).

Full wc3v resimulation therefore cannot produce real output without sourcing WC3's proprietary balance tables + a map-data pipeline — a materially larger undertaking, invisible when GO was chosen.

### Isolation (D-07) — verified

Zero edits to `src/lib/replay-parser.ts`, `src/lib/replay-signals.ts`, `src/lib/replay-thresholds.ts`, or the base loop in `src/server/replay.ts`. `npm run build` + the 40 base-loop tests pass. The deferred layer is a self-contained set (`src/lib/wc3v/`, plus the un-created `replay-advanced.*`) removable with no base-loop change.

### Path forward (Phase 8.x, per ADR 012)

Most promising: derive lighter supply/economy signals directly from w3gjs's own `ParserOutput` event stream (no wc3v resim, no proprietary cost/pathing data) — a subset of REPLAY-03's value without the external-data dependency.

## Self-Check: DESCOPED (not PASSED)

- Foundation committed; REPLAY-03 advanced analysis intentionally NOT delivered (deferred to 8.x)
- Base loop untouched; build + base tests green
- Descope is an explicit user decision recorded here + in ADR 012 + STATE.md
