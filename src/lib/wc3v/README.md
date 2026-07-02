# wc3v (vendored) — provenance, scope, and integration status

## Provenance

- **Upstream:** [`jblanchette/wc3v`](https://github.com/jblanchette/wc3v)
- **Vendored at commit:** `87edeef1f77a8c6f9896b8844990f5b74f6313a0` (branch `master`, fetched 2026-07-02)
- **License:** GPL-3.0 (upstream `LICENSE.md` is the canonical FSF GPL-3.0
  text; no per-file SPDX headers exist upstream, and the suffix ("-only" vs
  "-or-later") is not explicitly declared in the repo — this project treats
  it as `GPL-3.0-or-later` per the existing assumption in
  [ADR 004](../../../docs/adr/004-gpl3-licensing.md) A5). Every vendored
  `.js` file in this tree has a prepended
  `SPDX-License-Identifier: GPL-3.0-or-later` header + a provenance comment
  recording the upstream commit, added by this project (not present
  upstream) to satisfy this project's own SPDX header convention.
- **Scope vendored:** `lib/*`, `helpers/*`, `config/config.js` — i.e. the
  entire non-rendering analysis/simulation engine, EXCLUDING `client/`
  (3D viewer), `marketing/`, `tools/`, `slk/`, and `helpers/minimapRenderer.js`
  (client-side minimap image rendering — pulls in image/canvas concerns this
  project never needs). This is a wider vendor than the plan's original
  named-module list (`ResourceSeries`/`BuildingBackfill`/`BattleDetector`/
  `Player`/`World`/`Unit`) because those modules are NOT standalone — they
  all operate on `PlayerManager`'s resimulated game state, not on w3gjs's
  public `ParserOutput` (see "Why the wider vendor" below).

## Why the wider vendor was necessary

The plan's original scope assumed `ResourceSeries`/`BuildingBackfill`/
`BattleDetector`/`Player`/`World`/`Unit` could be vendored as a relatively
narrow slice consuming w3gjs's typed `ParserOutput` directly. This is
**incorrect** — confirmed by direct source inspection during this pass:

- `ResourceSeries.run()` reads `player.units[].spawnTime`,
  `player.units[].lostState`, `player.units[].balanceInfo`,
  `player.eventStream[].supplyUsed/supplyMax` — none of these fields exist on
  w3gjs's `Player` type. They are populated by `PlayerManager`'s own
  action-replay resimulation (`lib/PlayerManager.js`, `lib/Player.js`,
  `lib/World.js`, `lib/Unit.js`, plus death/facing/kinematic inference
  passes), not by w3gjs.
- `PlayerManager` is therefore a **hard prerequisite** for every named
  analysis module, not an optional enrichment. Vendoring only the analysis
  modules without `PlayerManager` + its full transitive closure would ship
  code that cannot run.

This pass vendored the full `lib/`+`helpers/`+`config/` transitive closure
required to `require()` `PlayerManager` successfully (76 files) rather than
the plan's original 6-module list.

## w3gjs 4.1.0 reconciliation (Pitfall 2 — CONFIRMED and partially fixed)

Two files reached into w3gjs's internal, non-exported module layout using a
path that assumes w3gjs 3.0.0's structure (`node_modules/w3gjs/dist/lib/...`),
which does not exist in the installed w3gjs 4.1.0 (`dist/cjs/`/`dist/esm/`
only):

| File | Upstream (broken) | Fix applied |
|------|--------------------|-------------|
| `lib/PlayerManager.js` | `require('../node_modules/w3gjs/dist/lib/parsers/ActionParser').default` | `require(path.join(path.dirname(require.resolve("w3gjs")), "parsers", "ActionParser")).ActionParser` — resolves w3gjs's public `"."` export first (works regardless of this file's own position in the tree, and regardless of w3gjs's own major-version internal layout shuffling again), then reads the **named** export `ActionParser` (w3gjs 4.1.0 exports `exports.ActionParser = ActionParser`, NOT `exports.default = ...` as upstream wc3v assumed for 3.0.0 — an API-shape difference beyond just the path, confirmed by reading `node_modules/w3gjs/dist/cjs/parsers/ActionParser.js` directly) |
| `helpers/mappings.js` | `require("../node_modules/w3gjs/dist/lib/mappings")` | Same `require.resolve`-based repointing to `dist/cjs/mappings.js`. Unlike `ActionParser`, the destructured names this file reads (`units`, `buildings`, `items`, `abilityToHero`) are **unchanged** named exports in 4.1.0 — no further API-shape reconciliation needed here. |

Both fixes were verified: requiring the vendored `PlayerManager.js` no
longer throws on either w3gjs path — the require chain proceeds cleanly past
both patched files (see "Real-run evidence" below for where it stops next).

**A relative-path escape hatch (`../node_modules/...`), not a bare
`w3gjs/dist/cjs/...` specifier, was necessary in both fixes** — w3gjs 4.1.0's
`package.json` `exports` map only publishes the `"."` entry point, so a bare
deep-import specifier throws `ERR_PACKAGE_PATH_NOT_EXPORTED`. Resolving via
`require.resolve("w3gjs")` (the public entry point) and deriving the
internals directory from its dirname sidesteps this without hardcoding a
`../` traversal depth that would break if this vendored file ever moves.

## Real-run evidence: TWO further, independent, NEWLY-DISCOVERED blockers

Beyond the w3gjs-path issue (which is now fixed), attempting to actually run
`PlayerManager` against this project's real fixture replay
(`src/lib/__fixtures__/1v1-sample.w3g`, map
`TurtleRock_v2.0` — confirmed present in `helpers/mapConfiguration.json`'s
201-map registry) surfaced two **hard, external data-dependency** blockers
that the original research/plan did not anticipate:

### Blocker A: `helpers/UnitBalance.json` does not exist in the vendored source

`helpers/mappings.js` does a top-level (non-lazy)
`require("./UnitBalance.json").output` — this is the per-unit gold/lumber/
food cost table `ResourceSeries.unitCost()` needs. **This file is explicitly
gitignored by wc3v's own maintainer** (`helpers/UnitBalance*` and
`slk/UnitBalance*` in upstream's `.gitignore`) — it is generated from
Warcraft III's own SLK game-balance data tables (via `helpers/slkParser.js`
+ a `slk/` directory, also gitignored) and was **never part of the public
git history**. There is no legitimate way to reconstruct this file without
extracting it from a real Warcraft III game installation.

Confirmed via a real `require()` attempt (not just static reading):

```
MODULE_NOT_FOUND: Cannot find module './UnitBalance.json'
Require stack:
- src/lib/wc3v/helpers/mappings.js
- src/lib/wc3v/lib/Player.js
- src/lib/wc3v/lib/PlayerManager.js
```

This is the FIRST failure hit — it blocks even importing `PlayerManager`,
before any specific replay or map is involved.

### Blocker B: per-map binary pathing/terrain grid files are not vendorable

Even with Blocker A stubbed out (diagnostic-only, never committed —
`{"output": {}}` locally, to see how much further the require chain goes),
`PlayerManager.setGridData()` → `World`/`PathFinder` construction requires
per-map binary grid files
(`mapdata/{mapName}/war3map.wpm`, `war3map.doo`, `war3mapUnits.doo` —
terrain pathing, doodad placement, and neutral-unit placement extracted from
the actual `.w3x` map file) read via unconditional `fs.readFileSync` in
`lib/parsers/WPMFile.js`'s `read()` method. **`mapdata/` is also explicitly
gitignored upstream** — it is populated locally by the wc3v maintainer from
their own collection of real map files, using tooling not present in the
vendored source. These files are NOT embedded in a `.w3g` replay (a replay
only records the map's file path/checksum, never its contents) and are not
otherwise obtainable from this project's existing data sources.

Even though `TurtleRock_v2.0` (this project's fixture's actual map) IS
present in the 201-map `mapConfiguration.json` registry (so
`MissingMapError` would NOT fire for this specific map), the physical grid
files for it do not exist anywhere in this project or the vendored source —
confirmed by direct inspection of `WPMFile.js`'s `read()` implementation and
corroborated by the upstream `.gitignore` entry.

### Blocker C (transitive-dependency correction to RESEARCH.md Spike 3)

Continuing the same diagnostic run, `lib/World.js` → `lib/PathFinder.js`
requires the **`d3`** npm package (`const d3 = require("d3")`, used to seed
a `gameScaler` dependency). RESEARCH.md's Spike 3 finding — that `lib/`'s
core analysis modules are import-lightweight and isolated from `canvas`/
`stormjs`/`d3` — was verified against `ResourceSeries.js`, `BattleDetector.js`,
`BuildingBackfill.js`, `Player.js`, and `World.js`'s **own** import
statements directly, but not against their full transitive closure.
`PathFinder.js` (a `World.js` dependency, three levels of `require()` in) is
where `d3` actually enters — a correction worth recording for future
re-evaluation, though `d3` is npm-installable and, standing alone, is not as
hard a blocker as A/B above.

## Current integration status: NOT FUNCTIONAL

Given Blockers A and B above, **no genuine wc3v-derived signal (supply/
economy curves, precise expansion detection, compare-to-pro) can currently
be produced for any real, user-uploaded replay** — regardless of the w3gjs
version-reconciliation work (which IS complete and verified). This is a
data-sourcing/infrastructure gap (WC3 game-balance data extraction + a
per-ladder-map pathing-data pipeline), not a code-porting gap, and is a
meaningfully larger undertaking than this plan (or the GO decision that
launched it) anticipated.

See [`docs/adr/012-wc3v-fork-integration.md`](../../../docs/adr/012-wc3v-fork-integration.md)
for the full decision record and recommendation.

## What was deliberately NOT wired up

Per this decision, `src/lib/replay-advanced.ts` / `src/server/replay-advanced.ts`
/ the `/replays` advanced-analysis UI section (plan 08-13's Tasks 2/3) were
**not built** — wiring a UI section that can never produce real output for
any actual user replay would ship a permanent stub, which this project's
executor discipline explicitly prohibits. The base w3gjs signal loop
(08-01..12, REPLAY-01/02/04-08) is completely unaffected (D-07 isolation
maintained — zero edits to `src/lib/replay-parser.ts`, `src/lib/replay-signals.ts`,
`src/lib/replay-thresholds.ts`, or `src/server/replay.ts`).
