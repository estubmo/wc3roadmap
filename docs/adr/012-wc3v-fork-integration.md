# ADR 012: wc3v Fork Integration (REPLAY-03) — GO Decision, Findings, and Outcome

**Status:** Accepted (integration NOT completed — descoped per D-07)
**Date:** 2026-07-02
**Phase:** 08-replay-parsing

---

## Context

Plan 08-13 (REPLAY-03, D-06/D-07) planned an additive, isolatable
advanced-analysis layer on top of the base w3gjs replay signals
(08-01..12): supply/economy curves, precise expansion detection, and
compare-to-pro, derived from vendoring `jblanchette/wc3v`'s (GPL-3.0) `lib/`
analysis modules. RESEARCH.md's Spike 3 flagged one specific risk requiring
a time-boxed go/no-go before any vendoring effort was sunk: whether wc3v's
CLI monkey-patch of w3gjs's internal `StatefulBufferParser`/`ActionParser`
(built against w3gjs 3.0.0) still applies to this project's installed
w3gjs 4.1.0.

### The go/no-go checkpoint (Task 1)

A time-boxed pre-check spike found:

1. wc3v's `wc3v.js` entry point and `lib/PlayerManager.js` both hard-`require`
   w3gjs's internal `ActionParser`/`StatefulBufferParser` at
   `node_modules/w3gjs/dist/lib/parsers/...` — a path that does not exist in
   the installed w3gjs 4.1.0 (`dist/cjs/`/`dist/esm/` only).
2. wc3v's named analysis modules (`ResourceSeries`, `BuildingBackfill`,
   `BattleDetector`, `Player`, `World`) do not operate on w3gjs's public
   `ParserOutput` — they operate on `PlayerManager`'s own resimulated game
   state (`eventStream`, `unit.path`, `spawnTime`, `lostState`, etc.), making
   `PlayerManager` (and its own dependency closure — `KinematicResim`,
   `DeathInference`, `FacingInference`, `HideInference`, and more) a hard
   prerequisite, not an optional narrow vendor.

The time-boxed spike's own recommendation was **NO-GO**. This was presented
to the human at Task 1's checkpoint alongside the alternative: proceed
anyway, accepting the larger discovered scope.

### Human decision: GO

The user explicitly chose **GO** — proceed with the wider vendoring effort
in-phase, accepting the expanded scope, rather than exercising D-07's
descope-to-Phase-8.x valve at this point.

---

## What this pass did under the GO decision

1. **Vendored the full `lib/`+`helpers/`+`config/` transitive closure**
   (76 files, `src/lib/wc3v/`) required to `require()` `PlayerManager`
   successfully — not just the plan's original 6-module list, which turned
   out to be non-standalone (see `src/lib/wc3v/README.md`, "Why the wider
   vendor was necessary"). Excluded: `client/` (3D viewer), `marketing/`,
   `tools/`, `slk/`, and `helpers/minimapRenderer.js` (rendering-only,
   confirmed unneeded for signal analysis).
2. **Every vendored `.js` file carries a GPL-3.0-or-later SPDX header +
   upstream commit provenance** (`87edeef1f77a8c6f9896b8844990f5b74f6313a0`),
   consistent with this project's SPDX convention and ADR 004's GPL-3.0
   compatibility decision.
3. **Fixed the w3gjs 4.1.0 internals patch (Pitfall 2) — CONFIRMED and
   RESOLVED**, in both files that needed it (`lib/PlayerManager.js`,
   `helpers/mappings.js`). The fix uses `require.resolve("w3gjs")` (the
   package's public export) + a sibling-directory join, rather than a
   hardcoded `../node_modules/...` traversal, and additionally corrects an
   **API-shape difference** beyond the path change: w3gjs 4.1.0's
   `ActionParser` is a **named** export (`exports.ActionParser`), not
   `.default` as upstream wc3v assumed for 3.0.0. This fix is verified —
   requiring the vendored `PlayerManager.js` no longer throws on either
   w3gjs path.
4. **Ran a real, first-hand evidence probe** against this project's actual
   fixture replay (`src/lib/__fixtures__/1v1-sample.w3g`, real map
   `TurtleRock_v2.0`, confirmed present in wc3v's own 201-map
   `mapConfiguration.json` registry) to determine whether the reconciled
   code can produce genuine output. It cannot — see Findings below.

---

## Findings: two new, independent, hard blockers (beyond Pitfall 2)

Pitfall 2 (the w3gjs-version patch) is now **fixed and verified**. But
fixing it exposed two further blockers the original research did not reach,
because static source inspection stopped at the modules RESEARCH directly
read rather than following their full transitive `require()` chain to
execution:

### Blocker A — `helpers/UnitBalance.json` (per-unit cost data) does not exist in the vendorable source

`helpers/mappings.js` requires `./UnitBalance.json` at module load time —
the exact per-unit gold/lumber/food cost table `ResourceSeries.unitCost()`
needs to compute "goldSpent"/"lumberSpent" at all. This file (and its `slk/`
source) is **explicitly gitignored by wc3v's own maintainer**
(`helpers/UnitBalance*`, `slk/UnitBalance*` in upstream `.gitignore`) — it is
generated from Warcraft III's own proprietary SLK game-data tables via
tooling that is itself not in the public repo. **Verified by a real
`require()` attempt**, not just reading the `.gitignore`:

```
MODULE_NOT_FOUND: Cannot find module './UnitBalance.json'
Require stack:
- src/lib/wc3v/helpers/mappings.js
- src/lib/wc3v/lib/Player.js
- src/lib/wc3v/lib/PlayerManager.js
```

This blocks even importing `PlayerManager` — before any specific replay or
map enters the picture.

### Blocker B — per-map binary pathing/terrain grid files are not vendorable or derivable from a replay

With Blocker A stubbed for diagnostic purposes only (never committed),
`PlayerManager.setGridData()` needs per-map binary grid files
(`mapdata/{mapName}/war3map.wpm`, `war3map.doo`, `war3mapUnits.doo`) read via
an unconditional `fs.readFileSync` in `lib/parsers/WPMFile.js`. **`mapdata/`
is also explicitly gitignored upstream** — populated locally by the wc3v
maintainer from their own map-file collection via tooling not in the
vendored source, and **not embedded in a `.w3g` replay** (a replay records
only the map's file path/checksum, never its contents). Even though this
project's real fixture's map (`TurtleRock_v2.0`) IS present in wc3v's
201-map registry — meaning the *lookup* would succeed — the physical grid
files for it exist nowhere this project can reach.

### Blocker C — transitive `d3` dependency (RESEARCH.md correction)

`lib/World.js` → `lib/PathFinder.js` requires the `d3` npm package.
RESEARCH.md's Spike 3 claim that `lib/`'s core modules are isolated from
`canvas`/`stormjs`/`d3` was verified against the specific modules RESEARCH
read directly (`ResourceSeries`, `BattleDetector`, `BuildingBackfill`,
`Player`, `World`'s own imports) — not their full transitive closure.
`PathFinder.js`, three `require()`s deep from `World.js`, is where `d3`
actually enters. Not as severe as A/B (d3 is npm-installable), but a
correction worth recording for any future re-attempt.

---

## Decision

**Descope REPLAY-03 to Phase 8.x per D-07's already-designed valve.** The
base w3gjs signal loop (08-01..12, REPLAY-01/02/04-08) ships complete and
unaffected. This decision is made AFTER the GO investment, not instead of
it — the GO decision's value was in surfacing Blockers A/B/C with concrete
evidence rather than leaving them as an untested assumption; the w3gjs
version-reconciliation work (Pitfall 2) is genuinely done and vendored
for whenever the data blockers are resolved.

**Why NOT to push further in this pass:** Blockers A and B are not code
problems — they are external data-sourcing problems (Warcraft III's own
proprietary unit-balance tables; a per-ladder-map pathing-data extraction
pipeline covering upstream's 201-map registry, or at minimum every map a
real user might upload a replay for). Building either is a materially
larger, separately-scoped effort than "vendor a fork and patch a version
mismatch" — closer to a new phase than a plan.

### What ships from this pass

- `src/lib/wc3v/*` — vendored source (76 files), GPL-3.0-or-later headers,
  w3gjs 4.1.0 reconciliation applied and verified (Pitfall 2 resolved).
- `src/lib/wc3v/README.md` — full provenance, scope, and blocker
  documentation for a future re-attempt.
- This ADR.

### What does NOT ship from this pass (and why)

- `src/lib/replay-advanced.ts`, `src/server/replay-advanced.ts`, and the
  `/replays` advanced-analysis UI section — building these would wire a
  permanently-broken stub feature (no real replay can produce output given
  Blockers A/B), which this project's executor discipline explicitly
  prohibits ("Do NOT mark a plan as complete if stubs exist that prevent the
  plan's goal from being achieved").

### D-07 isolation maintained

Zero edits were made to `src/lib/replay-parser.ts`, `src/lib/replay-signals.ts`,
`src/lib/replay-thresholds.ts`, or `src/server/replay.ts`. The entire
descope surface is `src/lib/wc3v/` — deletable wholesale with no impact on
the base mastery loop.

---

## Path forward for a future Phase 8.x attempt

If REPLAY-03 is revisited, in priority order:

1. **Re-scope away from full game-state resimulation.** A materially lighter
   alternative worth exploring first: derive simplified supply/economy
   curves and expansion timing directly from w3gjs's own `ParserOutput`
   event stream (build/train/upgrade order events, which ARE exposed
   directly) without wc3v/`PlayerManager` at all. This avoids Blockers A and
   B entirely (no per-unit cost table, no per-map pathing data) at the cost
   of losing wc3v's higher-fidelity simulation (unit-loss tracking,
   compare-to-pro). Given Blockers A/B's severity, this is now the more
   realistic path to *some* REPLAY-03 value without a new data pipeline.
2. **If full wc3v fidelity is still wanted:** source `helpers/UnitBalance.json`
   independently (WC3's unit-balance data IS documented in various
   community wikis/tools — a small, boundable data-collection task, distinct
   from wc3v's own SLK-extraction tooling) and scope a per-map pathing-data
   pipeline (at minimum for the small set of current-season ladder maps,
   using wc3v's own `WPMFile`/`DOOFile`/`UNITFile` writers against real
   `.w3x` map files) as its own planned effort.
3. Re-verify the `d3` transitive dependency (Blocker C) is actually load-bearing
   for the specific analysis (`ResourceSeries`/`BuildingBackfill`) this
   project cares about, or whether it can be stubbed/avoided if only those
   modules (not full `World`/`PathFinder` pathing) are needed.

---

## Alternatives Considered

| Alternative | Rejected Because |
|-------------|-------------------|
| Fabricate/stub `UnitBalance.json` and `mapdata/` to force a demo run | Would produce fabricated, not real, signal data — directly against this project's evidence/honesty discipline and this plan's explicit instruction not to fake completion |
| Wire the UI section anyway, showing "advanced analysis unavailable" for every replay | A permanent, universally-failing feature provides no user value and is a stub by definition — excluded per executor stub-tracking discipline |
| Attempt to build the map-data pipeline in this same pass | Materially larger, separately-scoped effort (sourcing + extracting per-map pathing data for up to 201 ladder maps) — not boundable within this plan's budget; would also require re-verifying licensing/redistribution terms for any downloaded map files, an entirely new legal question this ADR does not resolve |

---

## Related Decisions

- **D-06/D-07** — wc3v fork attempted alongside w3gjs with a descope valve;
  this ADR is the valve being exercised, informed by concrete Blocker A/B/C
  evidence gathered under the GO decision (not skipped)
- **D-08** — the third planning-gate spike (wc3v feasibility); Pitfall 2 is
  now resolved, but Blockers A/B/C were not visible to that spike's static
  analysis
- **ADR 004** — GPL-3.0-or-later licensing; the vendored `src/lib/wc3v/`
  tree's per-file SPDX headers apply this ADR's decision
- **ADR 011** — replay parse architecture; explicitly scoped wc3v's cost
  measurement out of its own inline-parse decision, deferring it to this
  checkpoint (§ "Scope note")
- **RESEARCH.md Spike 3 / Pitfall 2** — the original wc3v feasibility
  research; Blocker C is a correction to its `d3`-isolation claim at the
  transitive-dependency level
