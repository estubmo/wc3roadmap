# Replay Parsing Research

**Domain:** WC3 `.w3g` replay parsing for learning-centric mechanical signal extraction
**Researched:** 2026-06-28
**Overall confidence:** MEDIUM-HIGH (key facts verified directly from source code and GitHub APIs)

---

## Executive Summary

The replay parsing landscape is more favorable than the existing FEATURES.md assumed. Two critical findings change the scope:

1. **w3gjs already does semantic decoding** — it ships a `mappings.ts` table that translates 4-letter raw action IDs to human-readable unit/building/item/upgrade names. The "action-block decoding gap" is largely solved by the library itself. What remains is a thin semantic-interpretation layer on top of already-decoded data.

2. **W3Champions DOES serve replay files programmatically** — `GET api.w3champions.com/api/replays/{gameId}` returns a `.w3g` stream, no auth required, with documented rate limits. The previous FEATURES.md note that "w3champions does not serve replay files" was incorrect. This opens an auto-pull path that removes the friction of manual upload.

**Recommended approach**: `w3gjs` as the parser (MIT, TypeScript, actively maintained) + a thin semantic-interpretation layer we write + w3champions API pull as the ingest path (with manual upload as fallback). wc3v is a powerful complement but its GPL license and no-npm-package status make it a Phase 3 consideration.

---

## 1. w3gjs (PBug90)

**Repo**: https://github.com/PBug90/w3gjs
**npm**: https://www.npmjs.com/package/w3gjs
**Version**: v4.1.0 (released April 29, 2026; last pushed June 15, 2026)
**Stars**: 70 | **Forks**: 29 | **License**: MIT
**Language**: TypeScript (97%)

### What it parses out of the box

The **high-level API** (`W3GReplay.parse(file)`) returns a fully typed `ParserOutput`:

**Top-level game data**:
- `id`, `gamename`, `matchup` (e.g. `"HvO"`), `creator`, `type`
- `version`, `buildNumber`
- `duration` (milliseconds from game start)
- `expansion: boolean` — NOTE: this is a TFT/Frozen Throne flag, NOT player expansion-base detection
- `winningTeamId`
- `startSpots`, `observers[]`
- `chat: ChatMessage[]`
- `map: { path, file, checksum, checksumSha1 }`
- `settings: { observerMode, fixedTeams, fullSharedUnitControl, randomHero, randomRaces, speed, ... }`

**Per-player data** (from `Player.toJSON()`):
- `name`, `race` (enum: H/N/O/U/R), `raceDetected`, `teamid`, `color`, `id`
- `apm: number` — standard APM
- `actions: { timed: number[], assigngroup, rightclick, basic, buildtrain, ability, item, select, removeunit, subgroup, selecthotkey, esc }`
- `groupHotkeys: { 0..9: { assigned: number, used: number } }` — control group usage
- `units: { summary: { [unitName]: count }, order: [{ id: unitName, ms: gameTimeMs }] }`
- `buildings: { summary: { [buildingName]: count }, order: [{ id: buildingName, ms: gameTimeMs }] }`
- `upgrades: { summary: { [upgradeName]: count }, order: [{ id: upgradeName, ms: gameTimeMs }] }`
- `items: { summary: { [itemName]: count }, order: [{ id: itemName, ms: gameTimeMs }] }`
- `heroes: [{ id, level, abilities: { [abilityId]: level }, abilityOrder: [{ type: 'ability'|'retraining', time: ms, value? }], retrainingHistory }]`
- `resourceTransfers` — gold/lumber transfers to allies

The **action categories** (from the `apm-analysis.ts` example) are exactly:
| Category | What it counts |
|----------|---------------|
| `rightclick` | Right-click move/attack orders |
| `basic` | Building placement, train unit, research |
| `buildtrain` | Build/train orders (subset of `basic`) |
| `ability` | Spell/active ability usage |
| `item` | Item usage |
| `select` | Unit selection changes |
| `subgroup` | Sub-group selection within a control group |
| `selecthotkey` | Press an existing control group hotkey (F1–0) |
| `assigngroup` | Ctrl+number to assign a new control group |
| `esc` | Escape key presses |

### Does it decode raw IDs to semantic names?

**Yes.** w3gjs ships `src/mappings.ts` with four tables:

- `units: { [4-letter-id]: "u_UnitName" }` — all melee units for all races including creeps
- `buildings: { [4-letter-id]: "BuildingName" }` — all structures (e.g. `hbar → "Barracks"`, `etol → "Tree of Life"`)
- `items: { [4-letter-id]: "i_ItemName" }` — all purchaseable/droppable items
- `upgrades: { [4-letter-id]: "p_UpgradeName" }` — all researches

The `handleStringencodedItemID` method in `Player.ts` resolves every action's item ID against these tables before storing it. The `buildings.order` array already contains decoded names like `"Town Hall"` or `"Barracks"`, not raw bytes.

This was the most important open question — the answer is more positive than expected.

### What it does NOT give you

| Gap | Impact | Mitigation |
|-----|--------|-----------|
| **No position data** (X/Y coordinates) for buildings/units | Cannot determine if a Town Hall was built at a new gold mine vs. rebuilt at main base | Expansion heuristic (see §2) |
| **No eAPM calculation** | eAPM is a derived metric, not directly exposed | Compute from action categories: `(buildtrain + ability + item + selecthotkey + assigngroup) / duration_minutes` — this approximates eAPM by excluding spam |
| **No supply/food timeline** | Can't track "was at food cap for 30s" moments | Not addressable without wc3v or custom low-level simulation |
| **No resource income tracking** | Can't detect "idle workers / floating gold" | Requires wc3v-level simulation |
| **No combat/battle detection** | Can't detect micro events | Out of scope for v1 learning signals |
| **No creep camp clearing** | Creep route detection requires position data | wc3v handles this; out of v1 scope |

### Expansion base detection — heuristic approach

The `expansion: boolean` field in `ParserOutput` is the TFT game type flag (Frozen Throne vs. Reign of Chaos), NOT player expansion detection.

Expansion detection using `buildings.order` timestamps:

```typescript
function detectExpansionTiming(player: ParsedPlayer): number | null {
  // Main hall IDs per race (non-upgrade constructions only)
  const expansionBuildings = ["Town Hall", "Great Hall", "Necropolis", "Tree of Life"];
  const mainHallEvents = player.buildings.order.filter(b => expansionBuildings.includes(b.id));
  // First event = starting main hall built ~game start; second = expansion
  if (mainHallEvents.length >= 2) {
    return mainHallEvents[1].ms; // milliseconds from game start
  }
  // Undead-specific: Haunted Gold Mine = expansion (never at main base)
  const ugol = player.buildings.order.find(b => b.id === "Haunted Gold Mine");
  if (ugol) return ugol.ms;
  return null;
}
```

**Reliability of this heuristic**: HIGH for Undead (Haunted Gold Mine is unambiguous). MEDIUM for others — players rarely rebuild their main hall, so a second Town Hall/Great Hall/Tree of Life is almost always an expansion. The main failure case is "player lost main hall and rebuilt it" but this is uncommon and the semantic difference does not matter for a learning signal (the replay period where they "expanded" is still meaningful).

### Patch version dependence

w3gjs notes "Replays from game version <= 1.14 are not fully supported." For current Reforged ladder (1.3x+), support is full. The `mappings.ts` unit/building tables are a static snapshot — unit IDs in WC3 are stable across patches (Blizzard doesn't change existing IDs), but new units added in future patches would require updating the table. For the current patch this is a non-issue.

**Patch-version flag required** in the database (per PROJECT.md): store `buildNumber` from `ParserOutput` alongside every parsed replay result. This allows auditing signal accuracy by build number.

### Node.js / TanStack Start compatibility

MIT license. TypeScript with full types. Runs in Node.js and browser. Can be called directly from a TanStack Start server function — no subprocess or worker needed. Parse a 20-minute replay is fast (< 500ms on a typical server; needs spike confirmation).

```typescript
// server/functions/replay-parse.ts
import W3GReplay from "w3gjs";
export const parseReplay = createServerFn({ method: 'POST' })
  .handler(async ({ request }) => {
    const formData = await request.formData();
    const file = formData.get('replay') as File;
    const buffer = Buffer.from(await file.arrayBuffer());
    const parser = new W3GReplay();
    const result = await parser.parse(buffer);
    return extractMechanicalSignals(result);
  });
```

---

## 2. The Raw-Action → Semantic-Event Decoding Gap

**Short answer**: The gap is smaller than feared. w3gjs already decodes raw 4-letter IDs to human-readable names, and the `buildings.order` + `units.order` arrays give timestamped build events in decoded form.

**What remains to build** is a thin interpretation layer:

```typescript
// lib/replay-signals.ts — the "semantic interpretation layer"
function extractMechanicalSignals(result: ParserOutput): MechanicalSignals {
  return {
    matchup: result.matchup,
    durationMs: result.duration,
    buildNumber: result.buildNumber,
    players: result.players.map(p => ({
      name: p.name,
      race: p.race,
      apm: p.apm,
      eapm: computeEapm(p.actions, result.duration),
      buildOrderTimeline: p.buildings.order,    // already decoded
      unitProductionTimeline: p.units.order,    // already decoded
      heroTimeline: p.heroes,                   // includes abilityOrder with ms timestamps
      expansionTimingMs: detectExpansionTiming(p),
      controlGroupUsage: p.groupHotkeys,
      hotkeysAssigned: Object.values(p.groupHotkeys).filter(g => g.assigned > 0).length,
      firstHeroTimingMs: p.heroes[0]?.abilityOrder[0]?.time ?? null,
    }))
  };
}
```

**Patch-dependent ID mappings**: The 4-letter WC3 object IDs (e.g. `hbar`, `etol`, `ugol`) have been stable since TFT was released. Blizzard does not reassign existing unit IDs. New content in future patches adds new IDs — these would be unrecognized (returned as the raw 4-letter string). This is the only patch-dependency risk, and it is low for current-patch usage.

**No external data tables needed**: Unlike some WC3 parsers (e.g., w3rs in Rust) that require loading SLK data files from the WC3 installation, w3gjs's `mappings.ts` is fully self-contained in the npm package. No additional files or data sources are needed.

---

## 3. wc3v Assessment

**Repo**: https://github.com/jblanchette/wc3v
**Stars**: 53 | **Forks**: 9
**License**: GPL-3.0
**Last pushed**: June 27, 2026 (extremely active)
**Website**: https://wc3v.com

### What it provides

wc3v is the most sophisticated WC3 replay analysis tool available. It performs a **full game simulation** — reconstructing unit positions, building placement locations, and combat events from raw player inputs.

| Feature | Status |
|---------|--------|
| Unit position reconstruction | YES — full 3D simulation |
| Building placement at X/Y coordinates | YES — enables precise expansion detection |
| Hero tracking (levels, skills, inventory, revives) | YES |
| Research & upgrades (90 upgrades with timing) | YES |
| **Expansion detection** (Town Hall at new gold mine) | YES — position-aware, highly accurate |
| Supply curve over time | YES |
| Worker tracking (race-specific) | YES |
| Combat/battle detection | YES |
| Creep route detection | YES |
| Compare-to-pro with letter grades | YES (Macro, Production, Item Economy, Idle Resources, Build Order, Tech, Heroes) |
| Pro build library (16 curated builds, 221 pro replays) | YES — embedded in website |
| W3Champions / FLO replay format support | YES |

### Is it a library or website?

**Both.** The parser code runs in Node.js (`node wc3v.js`) and is browserified into a bundle for the website. There is **no npm package** — usage requires cloning the repository.

### Can we reuse the parser?

**Technically yes, with caveats**:

1. **GPL-3.0 license**: Using wc3v's parser in our server-side code requires our code to also be GPL-3.0. Since this project is open-source, this is legally acceptable — but it means the entire server must be GPL licensed. This is a significant constraint to evaluate before adopting wc3v code.

2. **No clean library API**: wc3v was built as a website with a parser extracted for Node.js use. It has no documented public API and no module exports designed for consumption. Adapting it to work as a TanStack Start server function would require wrapping the Node.js entry point via `child_process` or adapting the source.

3. **Website value is separate from parser value**: wc3v's most compelling features (compare-to-pro grading, pro build library, 3D visualization) are website features, not parser outputs. The parser alone provides simulation primitives that require additional code to turn into the grades and comparisons shown on the site.

### Should we use wc3v directly?

**Not in Phase 1.** Defer to Phase 3 if the following needs arise:
- Precise expansion detection (our heuristic in §1 fails at scale)
- Supply curve tracking for "supply blocked" detection
- Compare-to-pro letter grades (the pro build library is curated content we'd need to maintain ourselves anyway)
- Worker utilization tracking

**Deep-linking to wc3v.com**: Always appropriate. Link from relevant mechanic nodes (build order, expansion timing, macro efficiency) as a companion tool. wc3v is privacy-respecting (client-side parse) and free.

---

## 4. wc3ai Assessment

**Website**: https://wc3ai.com
**Verdict**: Deep-link only. No programmatic integration path.

wc3ai is a collection of web tools for WC3 players. It exposes APM, eAPM, action counts, hotkey usage, hero builds, and team stats through a web interface after manual replay upload. There is **no public API, no library, and no way to integrate programmatically**.

**What it uniquely provides over w3gjs**:
- Explicit eAPM calculation (wc3ai's formula, not disclosed)
- Smurf detection (neural network-based)
- Player comparison features

**Integration approach**: Deep-link to wc3ai from mechanic nodes (APM/eAPM nodes, hotkey usage nodes) as "check your stats on wc3ai" — same as wc3v.

---

## 5. Native Parsing Assessment

"Native parsing" in this context means building a custom parser from scratch. This is **not justified** given w3gjs exists.

The question is really: **"w3gjs + a semantic-interpretation layer we build" vs. pure-native**.

Answer: `w3gjs + semantic layer` IS the pragmatic native approach. We do not write byte-level replay parsing. The low-level API (`ReplayParser` event-based) is available if the high-level API is insufficient for specific needs (e.g., extracting position data for precise expansion detection).

Alternative parsers evaluated:
| Parser | Language | Status | Verdict |
|--------|----------|--------|---------|
| w3rs (aesteve) | Rust | Active | Only useful if we move to a Rust backend — irrelevant here |
| w3g (scopatz) | Python | Older | Python runtime adds complexity; Node.js stack is right choice |
| ForNeVeR/w3gparser | .NET | Unknown activity | Wrong language |
| w3-replay-parser (JSamir) | JS | Low activity | w3gjs supersedes this |

**Decision**: Use w3gjs. Do not write a custom parser.

---

## 6. Replay Ingest Path — How Replays Enter Our System

### Key finding: W3Champions DOES serve replay files (HIGH confidence — verified from source code)

Previous research (FEATURES.md) stated w3champions "stores replay outcomes but does not serve replay files." **This is incorrect.** Verified from `ReplaysController.cs` in the open-source `w3champions/website-backend` repository:

```
GET https://api.w3champions.com/api/replays/{gameId}
→ returns a .w3g file stream
Content-Type: application/octet-stream
Filename: {gameId}.w3g
```

Also available: `GET api.w3champions.com/api/replays/by-flo-id/{floMatchId}`

**Authentication**: No auth required on these endpoints (no `[Authorize]` attribute in source).

**Rate limits per IP** (from `ReplayRateLimitAttribute.cs`):
| Match age | Hourly | Daily |
|-----------|--------|-------|
| Recent (< 7 days) | 50 | 100 |
| Older (≥ 7 days) | 30 | 70 |

**API token system**: W3champions has an admin-issued API token system (`/api/admin/api-tokens`) that allows custom rate limits per scope. The "replay" scope is specifically named in the code. Applying for a token via the w3champions Discord could grant higher limits for our app's server IP.

**How replays are generated**: The `.w3g` is not a stored static file — it's generated on-demand by an internal `replay-service.w3champions.com` service from FLO (their game server) match data. This means it's only available for games played on w3champions. Classic Battle.net replays are not accessible through this API.

**Getting the gameId**: Fetch the user's match history from the w3champions API using their BattleTag (already in our auth flow). Each match in the history has a `gameId` field.

### Rate limit problem for a multi-user app

All users share our server's IP address for rate limit purposes. At 50 replays/hour for recent games, serving 20+ active users simultaneously would hit the limit quickly.

**Mitigations**:
1. **Apply for a w3champions API token** with higher replay limits — contact their Discord before building this feature (mandatory spike)
2. **Queue-based download**: 1 replay download per N seconds globally, with user notifications when queued
3. **Cache parsed results**: Never re-parse a gameId we've already processed — cache the `MechanicalSignals` in our DB
4. **On-demand, not bulk**: Only pull replays when a user explicitly requests analysis, not automatically for all ladder games

### Recommended UX flow

**Phase 1 (manual upload)**:
```
User navigates to profile → "Analyze a Replay"
→ Upload .w3g from their WC3 replay folder
→ Server parses with w3gjs → extracts signals → maps to mastery nodes
→ Shows: "Here's what we detected in your replay"
```

**Phase 2 (w3champions API pull)**:
```
User navigates to profile → "Sync Recent Games" (already exists for coarse stats)
→ After sync, show: "We found 5 recent w3champions replays"
→ User selects which to analyze (or "analyze all recent")
→ Server queues replay downloads → parses → updates mastery nodes
→ Shows: "3 new mechanical signals detected from your last 5 games"
```

**Key UX constraint**: Never auto-download replays silently. User must initiate the analysis. This respects rate limits and sets correct expectations.

---

## 7. Recommendation

### Primary path: w3gjs + thin semantic layer + hybrid ingest

**Parser**: `w3gjs` (MIT, TypeScript, npm installable, runs in Node.js server functions, actively maintained, v4.1.0)

**Semantic layer**: ~200-line `lib/replay-signals.ts` module that:
1. Calls `w3gjs` to parse the buffer
2. Computes eAPM from action categories
3. Applies expansion detection heuristic
4. Maps build timings to node-specific thresholds
5. Returns `MechanicalSignals` typed struct

**Ingest**: Start with manual upload (Phase 1). Add w3champions API pull (Phase 2) after rate limit situation is confirmed via w3champions Discord contact.

### What signals w3gjs enables for mastery detection

| Mechanic Node Category | Signal Available | Source | Confidence |
|------------------------|-----------------|--------|-----------|
| Build order timing | `buildings.order[n].ms` for specific buildings | w3gjs | HIGH |
| Expansion timing | 2nd Town Hall / Haunted Gold Mine in `buildings.order` | w3gjs + heuristic | MEDIUM |
| APM | `player.apm` | w3gjs | HIGH |
| eAPM (approximated) | `(buildtrain + ability + item + selecthotkey + assigngroup) / duration_min` | derived | MEDIUM |
| Control group usage | `player.groupHotkeys[0-9].{assigned, used}` | w3gjs | HIGH |
| Hero timing | `player.heroes[0].abilityOrder[0].time` (first skill = hero bought) | w3gjs | HIGH |
| Hero skill build | `player.heroes[n].abilities` | w3gjs | HIGH |
| Unit composition | `player.units.summary` | w3gjs | HIGH |
| Upgrade timing | `player.upgrades.order[n].ms` | w3gjs | HIGH |
| Item economy | `player.items.summary` + `order` | w3gjs | HIGH |
| Supply blocking | NOT available | — | Requires wc3v |
| Resource efficiency | NOT available | — | Requires wc3v |
| Creep routes | NOT available | — | Requires wc3v |

### Phase ordering

**Phase 1 (Replay Parsing MVP)**:
- Install `w3gjs` via npm
- Build `lib/replay-signals.ts` semantic layer
- Build server function for manual `.w3g` upload and parse
- Detect: build order timing, APM, eAPM approximation, control group usage, hero buy timing, expansion timing heuristic
- Store results tagged with `buildNumber` (patch version) per PROJECT.md requirement
- Deep-link to wc3v.com and wc3ai.com from mechanic nodes as complementary tools

**Spike required before Phase 1**: Parse 5-10 sample replays (different races, game lengths, patches). Verify:
1. `buildings.order` timestamps are correct and in the right unit (milliseconds from game start)
2. Expansion detection heuristic works on real games
3. eAPM approximation correlates with wc3ai's eAPM (upload same replay to both)
4. Parse time and memory usage on Vercel serverless function (must stay under 1-2 seconds and fit in memory limits)

**Phase 2 (W3Champions Auto-Pull)**:
- Contact w3champions Discord → request API token for "replay" scope with higher limits
- Build queue-based replay downloader: `GET api.w3champions.com/api/replays/{gameId}`
- After match sync, offer "analyze recent replays" flow
- Cache parsed `MechanicalSignals` in DB by `gameId` (never re-parse same game)
- Only download/parse replays user explicitly requests

**Spike required before Phase 2**: Confirm `GET api.w3champions.com/api/replays/{gameId}` actually works from an external server (code audit confirms the endpoint exists, but functional verification requires making a real request with a known gameId). Confirm the generated `.w3g` is parseable by w3gjs.

**Phase 3 (wc3v integration — optional)**:
- Adopt only if supply tracking, precise expansion detection, or compare-to-pro grading is needed
- GPL license is acceptable for this open-source project
- Run as a separate Node.js process (not inline in server function) due to complex setup
- Alternative: just keep deep-linking to wc3v.com — the website already does everything we'd want from the parser for end-user analysis needs

---

## Open Questions / Spikes

| Question | Spike Required | Blocking Phase |
|----------|---------------|----------------|
| Does `GET api.w3champions.com/api/replays/{gameId}` respond from an external server (not just from w3c's own frontend)? | YES — make a real test request with a known gameId before building Phase 2 | Phase 2 |
| Do the generated `.w3g` files parse correctly with w3gjs? | YES — same spike as above | Phase 2 |
| Does w3gjs parse time fit within Vercel serverless function limits (50ms CPU soft limit on Hobby, 1GB memory)? | YES — parse a representative replay in a serverless test | Phase 1 |
| Is our eAPM approximation close enough to wc3ai's eAPM for the same replay? | YES — upload 3 replays to wc3ai, compare to our formula output | Phase 1 |
| Can we get a w3champions API token with higher replay rate limits? | Contact w3champions Discord before Phase 2 | Phase 2 |
| Does the expansion heuristic (2nd Town Hall in buildings.order) produce false positives on a sample of 20+ replays? | YES — test on real replay corpus | Phase 1 |
| Will Vercel serverless functions handle receiving a binary `.w3g` file upload without timing out? | YES — test with a large replay (30+ min game) | Phase 1 |

---

## Confidence Assessment

| Finding | Confidence | Source |
|---------|------------|--------|
| w3gjs capabilities (high-level API, Player fields, mappings) | HIGH | Direct source code inspection via GitHub API |
| w3gjs semantic decoding (mappings.ts tables for units/buildings/items) | HIGH | Source code verified |
| w3gjs does NOT provide position data or supply tracking | HIGH | Source code inspection confirms absence |
| wc3v capabilities and GPL license | HIGH | GitHub repo README + license file verified |
| wc3ai has no public API | MEDIUM | Website inspection (no developer docs found) |
| W3champions replay API endpoint exists | HIGH | Source code (`ReplaysController.cs`) verified |
| W3champions rate limits (30-50/hour) | HIGH | Source code (`ReplayRateLimitAttribute.cs`) verified |
| W3champions API token system for higher limits | HIGH | Source code (`ApiToken.cs`) verified |
| W3champions replay API accessible without auth | MEDIUM | No `[Authorize]` attribute in source, but functional test not performed |
| Parse time within Vercel limits | LOW | Untested — spike required |

---

## Sources

- [w3gjs GitHub repo (PBug90/w3gjs)](https://github.com/PBug90/w3gjs) — source code, v4.1.0, MIT license, TypeScript
- [w3gjs Player.ts](https://github.com/PBug90/w3gjs/blob/main/src/Player.ts) — Player output structure (directly inspected)
- [w3gjs mappings.ts](https://github.com/PBug90/w3gjs/blob/main/src/mappings.ts) — semantic decoding tables (directly inspected)
- [w3gjs types.ts](https://github.com/PBug90/w3gjs/blob/main/src/types.ts) — ParserOutput type (directly inspected)
- [w3gjs apm-analysis.ts example](https://github.com/PBug90/w3gjs/blob/main/examples/apm-analysis.ts) — action categories and groupHotkeys (directly inspected)
- [wc3v GitHub repo (jblanchette/wc3v)](https://github.com/jblanchette/wc3v) — GPL-3.0, full game simulation
- [wc3v README](https://github.com/jblanchette/wc3v/blob/main/README.md) — feature list and compare-to-pro capabilities
- [wc3v.com](https://wc3v.com) — live website demonstrating feature set
- [wc3ai.com](https://wc3ai.com) — confirmed no public API
- [w3champions/website-backend ReplaysController.cs](https://github.com/w3champions/website-backend/blob/master/W3ChampionsStatisticService/Replays/ReplaysController.cs) — replay API endpoints (directly inspected)
- [w3champions ReplayRateLimitAttribute.cs](https://github.com/w3champions/website-backend/blob/master/W3ChampionsStatisticService/WebApi/ActionFilters/ReplayRateLimitAttribute.cs) — rate limits (directly inspected)
- [w3champions ApiToken.cs](https://github.com/w3champions/website-backend/blob/master/W3ChampionsStatisticService/RateLimiting/Models/ApiToken.cs) — API token scope system (directly inspected)
- [WarCraft III Replay format description](http://w3g.deepnode.de/files/w3g_format.txt) — low-level format reference
- [WarCraft III Replay action format](http://w3g.deepnode.de/files/w3g_actions.txt) — action block spec with patch version notes

---

*Replay parsing research for: WC3 Learning Roadmap*
*Researched: 2026-06-28*
