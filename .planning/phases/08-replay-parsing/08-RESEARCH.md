# Phase 8: Replay Parsing - Research

**Researched:** 2026-07-02
**Domain:** WC3 `.w3g` binary replay parsing, semantic signal extraction, patch-aware mastery detection, GPL-3.0 fork integration
**Confidence:** MEDIUM-HIGH (all three planning-gate spikes resolved or favorably de-risked from primary sources; a few numeric benchmarks remain unverified and are flagged as Wave-0 spikes)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Replay Mastery Power (source, ceiling, precedence, monotonicity)**
- **D-01:** New mastery source `"replay"`. Extend the `source` enum (`manual|auto|quiz` → `+replay`) in `src/schemas/progress.ts` and the `text()` column default in `src/db/schema.ts` (no `pgEnum` migration — ADR 009 forward-designed `text()` for exactly this). Server-stamped, never client-supplied.
- **D-02:** A replay signal meeting its patch-aware threshold sets a MECHANIC node **directly to `mastered`**. Replay is the strongest evidence and the **only source** permitted to reach `mastered` from a signal.
- **D-03:** **Replay wins over ALL sources** (auto, quiz, manual) for upgrades — inverts Phase 7 auto's defer-to-everything rule (D-05).
- **D-04:** **Monotonic — replay never downgrades.** Applies `max(existing, replayState)`; stamps `source:"replay"` only when it actually *raises* the state. Write semantic: **monotonic-max upsert** — `onConflictDoUpdate` guarded so `masteryState` only rises, differing from quiz's latest-write-wins and auto's plain-insert.
- **D-05:** Replay progress **labeled distinctly** ("Mastered · from replay"), reusing `MasteryBadge` `source` prop + `sourceMap` selector; newly-advanced nodes pulse via Phase 7 D-07 transient marker. Exact copy/marker → UI-SPEC.

**wc3v Fork Scope**
- **D-06:** Attempt the wc3v (GPL-3.0) fork **integrated from the start** alongside w3gjs — one combined effort targeting criterion 4 (supply/economy curves, expansion detection, compare-to-pro).
- **D-07 (descope valve):** If wc3v proves heavy, it **splits to Phase 8.x** and base w3gjs signals (REPLAY-01/02/04/05/06/07) ship as **complete**.
- **D-08 (gate):** wc3v feasibility is a planning-gate spike alongside the other two: (1) w3gjs serverless parse cost; (2) w3champions `/api/replays/{gameId}` functional test + token; (3) wc3v fork builds + parses current-patch + emits usable output.

**Signal & Race Coverage**
- **D-09:** In-scope base signals: APM, eAPM approximation, control-group/hotkey usage, hero buy timing, expansion timing — race-agnostic, MECHANIC-only, patch-aware thresholds.
- **D-10:** Build-order timing extracted + shown for everyone; **one canonical opening build-order MECHANIC node per race (4 nodes total)** authored this phase — a bounded pull-forward of RACE-*, not the full v2 workstream.

**Semantic Signal Layer & Patch Awareness**
- **D-11:** The semantic signal layer (REPLAY-02) is a **pure, framework-free deep module** (raw w3gjs → typed WC3 events/signals → per-node target masteryState), mirroring `detectMasterySignals`. **Unlike Phase 7, NOT untouched-only** — replay can override existing rows per D-03/D-04.
- **D-12:** Patch-aware object-ID maps (REPLAY-08) resolve via `patches.ts` `objectIdMapVersion`. Both resolved `patchId` and the raw WC3 build number from the replay header are stored alongside the result.

**Upload, Auto-Pull & Feedback UX (Claude autonomous)**
- **D-13:** Manual upload (REPLAY-04) + auto-pull (REPLAY-05) on a **dedicated Replay Analysis surface** (e.g. `/replays`): drag-drop uploader + "Pull recent replays" action. Auto-pull reuses the Phase 7 w3champions client + rate-limit/TTL guard precedent.
- **D-14:** Match user's slot by BattleTag from Battle.net identity; no match → clear message + manual player pick.
- **D-15:** **Only 1v1 replays drive node mastery.** Team/FFA still parse + show signals as feedback but never advance nodes.
- **D-16:** Feedback presentation (REPLAY-07): per-replay analysis report ("you did X at time Y; target is Z" + node mapping + advanced nodes) + graph pulse (D-05) + latest-replay signal inline in node detail panel. Exact layout → UI-SPEC.
- **D-17:** Parsed-result cache keyed by **gameId**; a replay with a known gameId is **never re-parsed**; auto-pull dedupes on gameId.

### Claude's Discretion

- **BO threshold source of truth** (content-authored vs derived from replay corpus/wc3v) — default toward content-authored + citations unless wc3v corpus makes empirical targets near-free.
- **Threshold location** (per-node frontmatter extending `autoDetect` vs central patch-keyed threshold table) — depends on node/patch cardinality (this research resolves it — see Architecture Patterns).
- **Parse location** (client vs serverless vs background job) — spike/research resolved below.
- **Cache table keying** (per-user history vs global-by-gameId) → planner.
- **Exact UI copy, report layout, marker styling** → UI-SPEC / UI phase.

### Deferred Ideas (OUT OF SCOPE)

- Full race/matchup build-order coverage beyond one canonical build per race (RACE-01..05) — v2 content additions once schema + parser support them.
- Matchup W/L & finer matchup detection (ADET-01..02) — v2.
- Team/FFA replay → mastery mapping — future; targets are 1v1-calibrated (D-15).
- wc3v advanced-analysis layer — may split to Phase 8.x if the fork proves heavy (D-07).
- Background/automatic replay ingestion (no user action) — out of scope; upload + auto-pull are user-triggered only.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| REPLAY-01 | Parse `.w3g` with w3gjs — build-order timing, APM/eAPM, control-group/hotkey use, hero/item timing, unit/upgrade timeline | Spike 1 RESOLVED — w3gjs v4.1.0 confirmed npm-published, actively maintained; `ParserOutput`/`Player` types expose every listed signal directly (see Code Examples, Standard Stack) |
| REPLAY-02 | Semantic-signal layer maps w3gjs output → mechanic nodes | Architecture Patterns Pattern 1 (pure deep module mirroring `detectMasterySignals`); Pitfall 3 (object-ID mapping layering) |
| REPLAY-03 | Integrate wc3v fork (GPL-3.0) for advanced analysis | Spike 3 PARTIALLY RESOLVED — `lib/` core is import-lightweight, isolated from `canvas`/3D/UI deps; integration effort documented (Pitfall 2, Open Question 3) |
| REPLAY-04 | Manual `.w3g` upload | Common Pitfalls 1/6; Architecture Patterns (project structure, `/replays` route) |
| REPLAY-05 | Auto-pull from `/api/replays/{gameId}` | Spike 2 RESOLVED — exact endpoint, auth, rate limits confirmed from source |
| REPLAY-06 | Replay signals auto-mark MECHANIC mastery against patch-aware thresholds | Code Examples (monotonic-max upsert); Architecture Patterns Pattern 2; Pitfall 5 |
| REPLAY-07 | Actionable feedback ("you did X at time Y; target is Z") | Architecture Patterns (system diagram, report surface); D-16 |
| REPLAY-08 | Patch-version-aware object-ID maps + thresholds | Pitfall 3; D-12; `buildNumber`/`version` fields confirmed in `ParserOutput` |

</phase_requirements>

## Summary

All three planning-gate spikes resolve favorably enough to plan the phase with confidence, though none is a zero-risk green light.

**Spike 1 (w3gjs serverless cost) — RESOLVED (architecture), PARTIALLY RESOLVED (numeric benchmarks).** `w3gjs` is a real, actively maintained, npm-published TypeScript library (v4.1.0, published 2026-04-29, MIT license, 70 GitHub stars, 256 commits, single dependency `protobufjs`) `[VERIFIED: npm registry]`. Its typed `ParserOutput`/`Player` interfaces expose every REPLAY-01 signal directly — `buildNumber`, `version`, per-player `units.order`/`buildings.order`/`upgrades.order`/`items.order` (all timestamped), `heroCollector` (skill/item timing), `actions` (categorized counts for eAPM), `groupHotkeys` (`{assigned, used}` per hotkey — a direct control-group signal), and `apm` `[CITED: npm package w3gjs@4.1.0 dist/*.d.ts]`. No official parse-time/memory benchmark exists publicly; `.w3g` files are event-stream-compressed and historically small (tens of KB to low single-digit MB even for long games) `[ASSUMED — no benchmark found]`. Given Vercel's Hobby-plan defaults (2 GB memory, 60s timeout, extendable) and the small package footprint (47 KB packed), inline server-function parsing is very likely feasible for w3gjs alone — but this must be confirmed with real sample replays in a Wave-0 spike before committing to "parse inline in the upload/auto-pull server fn" as the final architecture. **A real, confirmed constraint is Vercel's 4.5 MB request-body limit combined with TanStack Start's full in-memory `request.formData()` buffering** (no streaming, no pre-handler size check) — this bounds the manual-upload path and needs an explicit client-side size guard.

**Spike 2 (w3champions replay endpoint) — RESOLVED, HIGH confidence.** `GET /api/replays/{gameId}` exists exactly as assumed in D-08, confirmed by reading `W3ChampionsStatisticService/Replays/ReplaysController.cs` directly from `w3champions/website-backend` `[CITED: github.com/w3champions/website-backend, source read via gh api]`. It requires **no bearer token or API key** for the base download — only the `/chats` sub-route requires a Moderation-scoped bearer token, which this phase does not need. Rate limits are real and documented in code: 30/hour + 70/day for matches older than 7 days, 50/hour + 100/day for matches ≤7 days old, partitioned by IP or optional API token, returning HTTP 429 on exceedance. The endpoint returns raw `application/octet-stream` bytes named `{gameId}.w3g` — directly parseable by w3gjs with zero transformation.

**Spike 3 (wc3v fork) — PARTIALLY RESOLVED, MEDIUM confidence, favorable but non-trivial.** wc3v (`jblanchette/wc3v`, GPL-3.0, 54 stars, actively pushed 2026-06-27) is **not published to npm** (confirmed 404) — it must be vendored/forked as source, which is consistent with D-06's "fork" framing and already-accepted GPL-3.0 licensing (ADR 004). Critically, the core analysis engine (`lib/ResourceSeries.js`, `lib/BuildingBackfill.js`, `lib/BattleDetector.js`, `lib/Player.js`, `lib/World.js` — exactly the modules producing supply/economy curves, expansion detection via `EXPANSION_BUILDING_IDS`, and battle detection) imports **only** `rbush` (pure-JS spatial index) and local helpers — it does **not** import `canvas`, `@wowserhq/stormjs`, `d3`, or `image-js`, which are confined to the `client/` (3D viewer), `marketing/`, and `tools/` directories `[CITED: github.com/jblanchette/wc3v, direct source inspection]`. This means the "advanced analysis" slice D-06 wants is architecturally separable from the heavy browser-rendering/native-binding surface. The real integration cost is elsewhere: wc3v pins `w3gjs@3.0.0` (one major version behind our planned 4.1.0) and its CLI entry (`wc3v.js`) monkey-patches `w3gjs`'s **internal, non-exported** `StatefulBufferParser` class (reached via `node_modules/w3gjs/dist/lib/parsers/StatefulBufferParser.js`) to tolerate truncated/single-player replay blocks — this patch is not guaranteed to apply cleanly to w3gjs 4.1.0's internals and must be re-verified or re-ported.

**Primary recommendation:** Install `w3gjs@4.1.0` directly via npm for REPLAY-01/02/04–08 base signals; parse inline inside the principal-keyed replay server function (not client-side, not a separate background job), pending a Wave-0 timing/memory spike on 3–5 real sample replays. Attempt the wc3v fork as a size-bounded vendor of `lib/`'s pure analysis modules only (not the 3D viewer, not `canvas`/`stormjs`) with an early, explicit go/no-go checkpoint on the w3gjs-3.0.0→4.1.0 patch-porting effort — keeping D-07's descope valve to Phase 8.x fully ready to exercise if that porting proves heavy.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Replay upload intake (drag-drop) | Browser / Client | API/Backend (server fn receives FormData) | File selection + client-side size pre-check is a UX/DOM concern; the actual parse must run server-side (Node `Buffer` APIs, DB writes) |
| Auto-pull trigger + w3champions fetch | API/Backend | Browser (button + TanStack Query mutation) | Mirrors Phase 7's `syncW3champions` — principal-keyed, no client-supplied gameId trust boundary for player matching |
| `.w3g` binary parsing (w3gjs) | API/Backend | — | Needs Node `Buffer`; w3gjs works in both runtimes but this project's server functions already run on Nitro/Node — no reason to ship the parser to the client bundle |
| Semantic signal layer (raw → WC3 events → per-node signals) | API/Backend (pure lib) | — | Pure deep module (D-11), zero I/O, unit-testable without DB/auth — same tier discipline as `detect-mastery-signals.ts` |
| wc3v advanced-analysis layer (supply/economy/expansion) | API/Backend (pure lib, vendored) | — | Confirmed import-lightweight (no canvas/3D deps in `lib/`); stays server-side alongside the base signal layer |
| Patch-aware object-ID map resolution | API/Backend | — | Keyed via `patches.ts` `objectIdMapVersion`; must run before/alongside signal detection, not in content or UI layers |
| Monotonic-max mastery write | Database (atomic upsert) | API/Backend (orchestration) | D-04's "never downgrades" invariant is safest as an atomic SQL-level guard (`setWhere`), not a check-then-write race in application code |
| Replay-analysis cache (gameId → signals) | Database | API/Backend | D-17: signals-only cache, never raw `.w3g` bytes — avoids storage growth and redistribution ambiguity |
| Replay analysis report UI | Browser / Client (SSR route) | — | New `/replays` route; report rendering is pure display of already-computed signals |
| Node detail panel inline signal | Browser / Client | — | Reuses Phase 3/6/7 panel + `sourceMap`/`MasteryBadge` precedent |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `w3gjs` | 4.1.0 `[VERIFIED: npm registry, npm view 2026-07-02]` | `.w3g` binary replay parser — build order, APM, hero events, hotkey usage, header metadata (build number, version) | Only actively maintained, TypeScript-typed, npm-published WC3 replay parser found; 256 commits, MIT license, single dependency (`protobufjs`); is itself the dependency wc3v builds on. `[ASSUMED — package name/choice from training + WebSearch, cross-checked against npm registry and GitHub repo directly]` |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `protobufjs` | `^8.0.1` (transitive, via w3gjs) | Binary protobuf-style decoding used internally by w3gjs | No direct project usage — transitive dependency only; do not import directly |

### wc3v (vendored, not npm-installed)

| Source | Status | Purpose | Integration Mode |
|--------|--------|---------|-------------------|
| `jblanchette/wc3v` `lib/` subset | GPL-3.0, pushed 2026-06-27, `[CITED: github.com/jblanchette/wc3v]` | Supply/economy curves, expansion detection, battle detection, compare-to-pro simulation | **Not `npm install`-able** (confirmed 404 on npm registry) — vendor/fork the specific `lib/*.js` analysis modules (ResourceSeries, BuildingBackfill, BattleDetector, Player, World, Unit, etc.), NOT `client/`, `marketing/`, or `tools/` |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `w3gjs` | `w3g` (npm) | Older/less actively maintained fork of the same lineage (`HydraOrc/w3g` "Node.js copy of w3g-julas"); w3gjs has the more complete typed API and is what wc3v itself depends on |
| `w3gjs` | `w3rs` (Rust, `aesteve/w3rs`) | Wrong runtime for a TanStack Start/Node.js server function — would require WASM compilation and a Node↔WASM bridge for no clear benefit over a mature JS-native parser |
| Vendoring wc3v `lib/` | Shelling out to `wc3v.js` as a subprocess (its documented CLI usage) | The CLI writes `.wc3v.gz` files to disk and is designed for a local batch workflow, not a request-scoped serverless invocation; importing the `lib/` modules directly avoids subprocess spawn overhead and filesystem writes inside a stateless function |
| Custom eAPM heuristic | A hypothetical "eAPM library" | None exists — every WC3 tool that reports eAPM (including w3gjs's own ecosystem) computes it via a locally-defined action-classification heuristic; there is no canonical shared implementation to depend on (see Assumptions Log A3) |

**Installation:**
```bash
npm install w3gjs
```

**Version verification:** `npm view w3gjs version` → `4.1.0`, `time.modified` → `2026-04-29T20:07:20.244Z` `[VERIFIED: npm registry]`. `npm view w3gjs dependencies` → `{ protobufjs: '^8.0.1' }` `[VERIFIED: npm registry]`. Package tarball: 47.1 kB packed / 391.3 kB unpacked, 107 files — trivially within any serverless function bundle-size limit `[VERIFIED: npm pack --dry-run]`.

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|--------------|---------|-------------|
| `w3gjs` | npm | Repo active since ~2020 (256 commits); current major v4.1.0 published 2026-04-29 | 403/week `[VERIFIED via gsd-tools package-legitimacy check]` | `github.com/PBug90/w3gjs` (70 stars, 10 open issues, pushed 2026-06-15) | **SUS** (`low-downloads` signal only) | **Flagged — planner must add `checkpoint:human-verify` before install.** Independently corroborated as legitimate: MIT license, no `postinstall` script, real 256-commit history, is a load-bearing dependency of the separately-verified `jblanchette/wc3v` project. Low weekly downloads are expected for a niche-game replay parser — not a slopsquat signal in this domain. |
| wc3v (`jblanchette/wc3v`, vendored) | Not applicable — not an npm package (`npm view wc3v` → 404) | Repo pushed 2026-06-27 (5 days before this research), 54 stars, 4 open issues | N/A (git source, not registry-installed) | `github.com/jblanchette/wc3v` | Not registry-checkable — assessed by direct source read: GPL-3.0 license (`[CITED]`, matches ADR-004's accepted assumption), no obfuscation, `lib/` core has a small, legible, pure-JS dependency footprint (`rbush` only) | **Approved for vendoring** with the scope constraint documented above (lib/ analysis modules only) |

**Packages removed due to [SLOP] verdict:** none.
**Packages flagged as suspicious [SUS]:** `w3gjs` — planner must insert a `checkpoint:human-verify` task before the `npm install w3gjs` step, even though independent verification here found no red flags beyond the low-download-count heuristic.

*wc3v is source-vendored under its own GPL-3.0 terms (compatible with this project's GPL-3.0-or-later license per ADR-004) — it is not subject to the npm registry legitimacy gate, but the planner should still treat "clone/vendor a third-party GPL-3.0 repo" as requiring the same human-verification discipline as an npm install.*

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────┐   ┌──────────────────────────────────────┐
│  Browser: /replays route     │   │  Browser: node detail panel          │
│  - drag-drop .w3g uploader   │   │  - latest-replay signal inline (D-16)│
│  - "Pull recent replays" CTA │   └──────────────────────────────────────┘
└──────────────┬────────────────────────────────┬─────────────────────────┘
               │ FormData (upload)               │ (no client input — principal-keyed)
               ▼                                  ▼
   ┌────────────────────────────┐    ┌──────────────────────────────────┐
   │ POST replay upload server fn│    │ POST replay auto-pull server fn   │
   │ authMiddleware → principal   │    │ authMiddleware → principal        │
   └───────────────┬─────────────┘    └───────────────┬────────────────────┘
                    │ raw .w3g bytes                    │ GET w3champions
                    │                                    │ /api/replays/{gameId}
                    │                                    │ (no token, rate-limited)
                    ▼                                    ▼
              ┌─────────────────────────────────────────────┐
              │  gameId cache-gate (D-17)                     │
              │  known gameId? → reuse cached signals, skip   │
              │  parse entirely                                │
              └───────────────────┬─────────────────────────┘
                                    │ cache miss
                                    ▼
              ┌─────────────────────────────────────────────┐
              │  w3gjs parse (buffer → ParserOutput)          │
              │  buildNumber, version, players[], per-player  │
              │  units/buildings/upgrades/items.order,        │
              │  heroCollector, actions, groupHotkeys, apm    │
              └───────────────────┬─────────────────────────┘
                                    ▼
              ┌─────────────────────────────────────────────┐
              │  Semantic signal layer (D-11, PURE)           │
              │  ParserOutput → typed WC3 events              │
              │  (build-order timing, eAPM, control-group     │
              │  usage, hero timing, expansion timing)         │
              └───────────────────┬─────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                                 ▼
     ┌───────────────────────────┐    ┌──────────────────────────────────┐
     │ wc3v advanced layer (opt.)  │    │ Patch-aware object-ID map (D-12)  │
     │ supply/economy curves,      │    │ resolves via patches.ts           │
     │ expansion detection,        │    │ objectIdMapVersion(buildNumber)   │
     │ compare-to-pro (D-06/D-07)  │    └──────────────────────────────────┘
     └───────────────────────────┘
                    │
                    ▼
     ┌─────────────────────────────────────────────────┐
     │  Threshold detector (pure, patch-aware)            │
     │  MECHANIC-only + 1v1-only (D-15) filters +         │
     │  per-node target masteryState                      │
     └───────────────────┬─────────────────────────────┘
                          ▼
     ┌─────────────────────────────────────────────────┐
     │  Monotonic-max upsert (D-03/D-04, atomic SQL)      │
     │  onConflictDoUpdate + setWhere ordinal guard        │
     │  source:"replay" stamped only when raised           │
     └───────────────────┬─────────────────────────────┘
                          ▼
     ┌─────────────────────────────────────────────────┐
     │  Response: report + advanced nodeIds + gameId cache│
     │  write → drives report UI, graph pulse, panel inline│
     └─────────────────────────────────────────────────┘
```

### Recommended Project Structure

```
src/
├── lib/
│   ├── replay-parser.ts        # I/O wrapper around w3gjs — buffer → ParserOutput
│   ├── replay-signals.ts       # PURE (D-11): ParserOutput → typed WC3 signals
│   ├── replay-thresholds.ts    # PURE: signals + patch-aware criteria → target masteryState per node
│   ├── mastery-ordinal.ts      # NEW: masteryStateIndex() — mirrors mmr-tiers.ts tierIndex() pattern
│   ├── wc3v/                   # vendored subset of jblanchette/wc3v lib/*.js (GPL-3.0 headers preserved)
│   │   ├── ResourceSeries.js   # supply/economy curves
│   │   ├── BuildingBackfill.js # expansion detection (EXPANSION_BUILDING_IDS)
│   │   ├── BattleDetector.js   # battle/combat detection
│   │   └── ...                 # only lib/ modules actually needed — audit each import chain
│   └── object-id-maps/         # NEW: patch-keyed object-ID → node-criteria maps (D-12)
├── server/
│   └── replay.ts               # orchestrating server fns: upload, auto-pull, gameId cache gate,
│                                # monotonic-max write — mirrors w3champions.ts structure
├── hooks/
│   ├── useUploadReplayMutation.ts
│   └── usePullReplaysMutation.ts
├── routes/
│   └── replays.tsx             # new dedicated Replay Analysis surface (D-13)
└── db/
    └── schema.ts                # + replayAnalysis cache table (gameId-keyed, D-17)

content/nodes/
├── build-order-human.mdx        # 4 new canonical opening build-order MECHANIC nodes (D-10)
├── build-order-orc.mdx
├── build-order-undead.mdx
└── build-order-nightelf.mdx
```

### Pattern 1: Pure semantic signal layer (mirrors `detectMasterySignals`)

**What:** A zero-I/O function `deriveReplaySignals(parsed: ParserOutput, playerSlot: number): ReplaySignals` that turns w3gjs's raw output into typed, node-mappable events — build-order timing array, eAPM number, control-group usage summary, hero timing, expansion timing. No DB, no fetch, no auth import — same discipline as `src/lib/detect-mastery-signals.ts`.

**When to use:** Every replay parse, before any threshold evaluation. Keeps the "what happened in this replay" logic independently unit-testable with fixture `ParserOutput` objects (no real `.w3g` file needed in most tests).

**Example:**
```typescript
// Source: w3gjs@4.1.0 dist/cjs/types.d.ts + Player.d.ts (verified via npm pack)
import type { ParserOutput, Player } from "w3gjs";

export interface ReplaySignals {
  buildOrder: { unitOrBuildingId: string; ms: number }[];
  eapm: number;
  controlGroupUsage: { groupId: number; assigned: number; used: number }[];
  heroTiming: { heroId: string; level: number; ms: number }[];
  expansionTimingMs: number | null;
}

// PURE — no I/O. Caller owns fetch/parse/persist (mirrors detect-mastery-signals.ts).
export function deriveReplaySignals(
  parsed: ParserOutput,
  player: Player,
): ReplaySignals {
  const buildOrder = [
    ...player.units.order.map((u) => ({ unitOrBuildingId: u.id, ms: u.ms })),
    ...player.buildings.order.map((b) => ({ unitOrBuildingId: b.id, ms: b.ms })),
  ].sort((a, b) => a.ms - b.ms);

  const controlGroupUsage = Object.entries(player.groupHotkeys).map(
    ([groupId, { assigned, used }]) => ({ groupId: Number(groupId), assigned, used }),
  );

  // eAPM approximation — see Common Pitfalls / Assumptions Log A3 for the
  // "exclude spam" heuristic and its ASSUMED status.
  const eapm = estimateEffectiveActions(player.actions);

  return { buildOrder, eapm, controlGroupUsage, heroTiming: [], expansionTimingMs: null };
}
```

### Pattern 2: Atomic monotonic-max upsert (D-03/D-04)

**What:** A single `onConflictDoUpdate` call with a `setWhere` clause comparing an ordinal-mapped `masteryState` — the update (including the `source` stamp) only fires when the new state ranks higher than the existing one. This avoids a check-then-write race and keeps "source flips to replay only on an actual raise" atomic and race-safe, which a JS-level `if (newRank > oldRank)` pre-check cannot guarantee under concurrent writes.

**When to use:** The replay write path only — quiz still uses plain latest-write-wins `onConflictDoUpdate` (ADR 010), auto still uses plain-insert `onConflictDoNothing` (ADR 009/`w3champions.ts`). Do not generalize this pattern to those paths.

**Example:**
```typescript
// Source: drizzle-orm official upsert guide (orm.drizzle.team/docs/guides/upsert)
// verified pattern — setWhere + excluded pseudo-table for conditional upsert.
import { sql } from "drizzle-orm";
import { nodeProgress } from "#/db/schema";

// Ordinal CASE mirrors MasteryStateSchema's enum order (untouched=0, in-progress=1,
// mastered=2) — src/schemas/progress.ts is authoritative for the enum; this SQL
// fragment is a parallel constant that MUST stay in sync (see Pitfall 5).
const MASTERY_ORDINAL_CASE = sql`
  CASE mastery_state
    WHEN 'mastered' THEN 2
    WHEN 'in-progress' THEN 1
    ELSE 0
  END
`;

await db
  .insert(nodeProgress)
  .values({
    id: crypto.randomUUID(),
    userId: principal.id,        // ADR 007: never from client input
    nodeId,
    masteryState: targetState,   // computed by the pure threshold detector
    source: "replay",            // server-stamped
    patchId: CURRENT_PATCH.id,
  })
  .onConflictDoUpdate({
    target: [nodeProgress.userId, nodeProgress.nodeId], // progress_user_node_unique
    set: {
      masteryState: sql`excluded.mastery_state`,
      source: sql`excluded.source`,
      patchId: sql`excluded.patch_id`,
    },
    // Only fires the update (including the source stamp) when the replay's
    // target state ranks strictly higher than the existing row — D-04's
    // "never downgrades, only stamps replay when it actually raises" in one
    // atomic statement.
    setWhere: sql`(CASE excluded.mastery_state
                     WHEN 'mastered' THEN 2 WHEN 'in-progress' THEN 1 ELSE 0 END)
                   > (${MASTERY_ORDINAL_CASE})`,
  });
```

### Pattern 3: gameId cache-gate (D-17 — "never re-parsed")

**What:** Before invoking w3gjs (or wc3v), check the replay-analysis cache table for an existing row keyed by `gameId`. Manual uploads don't have a `gameId` until after parsing (w3gjs's `id`/generated ID or the w3champions match lookup) — so the gate applies most directly to the auto-pull path, where `gameId` is known before any fetch.

**When to use:** Auto-pull always checks first (avoids redundant w3champions fetches AND redundant parses). Manual upload can only dedupe post-parse (compare the parsed replay's own identifying fields).

### Pattern 4: `createServerFn` must be lexically visible (ADR 009 Fix 2 — MANDATORY, not optional)

**What:** Every replay server function must be declared as `createServerFn(...).middleware([authMiddleware]).handler(...)` with no factory/wrapper indirection. This is a project-wide, already-fixed-once bug class (see `src/db/schema.ts`'s referenced ADR 009 "Fix 2"): TanStack Start's Vite compiler statically pattern-matches `createServerFn(...).handler(...)` at the literal call site to split server code from the client bundle. Wrapping it in a helper silently ships the handler (DB writes, w3gjs parse, `process.env` reads) into the browser bundle, where it crashes or leaks nothing useful.

**Example:**
```typescript
// Source: src/server/w3champions.ts (existing project pattern, verified by direct read)
export const uploadReplay = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: FormData) => data)
  .handler(uploadReplayHandler); // named export — testable without the TanStack runtime
```

### Anti-Patterns to Avoid

- **Parsing/authorizing inside `beforeLoad`/route loaders:** Not a security boundary (ADR 007 Pitfall 7) — a direct HTTP call to the server function bypasses it entirely.
- **Trusting w3gjs's bundled `mappings.ts` as the patch-aware object-ID source of truth:** It is a static table shipped with a specific w3gjs npm version, not versioned against WC3 patches by this project. Treat it as a fallback/reference, not authoritative — see Pitfall 3.
- **Storing raw `.w3g` bytes in the cache table:** D-17's cache is explicitly signals-only. Storing raw replay files adds unbounded storage growth and raises redistribution-rights questions the project has not addressed.
- **Vendoring wc3v's entire repo (including `client/`, `canvas`, `@wowserhq/stormjs`):** Pulls in native bindings and 3D-rendering dependencies with no analysis value for this phase's server-side signal extraction — vendor only the `lib/` modules whose import chains were independently verified to be canvas/stormjs-free.
- **Reusing quiz's latest-write-wins or auto's plain-insert upsert helper for the replay write:** Both are the wrong semantic for D-03/D-04's monotonic-max requirement — a plain `onConflictDoUpdate` without `setWhere` would let a worse later replay downgrade progress.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|--------------|-----|
| `.w3g` binary format parsing | A custom binary reader for the undocumented, versioned, compressed replay format | `w3gjs` | The format has no official specification; block/action encoding has subtle version-dependent quirks (see wc3v's own EOF-tolerance patch) that a from-scratch parser would rediscover the hard way |
| Supply/economy/expansion simulation | A from-scratch WC3 game-state simulator (unit tracking, tech-tree inference, building placement) | wc3v `lib/` (vendored) | wc3v's `docs/DESIGN.md` documents thousands of lines of simulation logic (object-ID inference, selection tracking, tier requirements) built specifically to solve this; re-deriving it is a multi-month undertaking — exactly why D-07's descope valve exists |
| Ordinal state/tier comparison | Ad-hoc `if/else` chains scattered across the write path | A `masteryStateIndex()` helper mirroring the existing `tierIndex()`/`tierForMmr()` pattern in `src/lib/mmr-tiers.ts` | The project already has a proven ordinal-registry convention (private array + public ID tuple + index lookup) — reuse it instead of inventing a second comparison idiom |
| eAPM classification | — (no existing library solves this; must be hand-built, but see Assumptions Log A3) | Custom heuristic over `Player.actions`, with the heuristic itself documented and testable | Not a "don't hand-roll" candidate — no canonical library exists. Flagged here explicitly so the planner does not spend time searching for one |

**Key insight:** This phase stacks two "don't hand-roll" layers — w3gjs solves the binary wire format, wc3v (optionally) solves the semantic game-state simulation on top of it. Both layers exist as real, working open-source projects specifically because building either from scratch is expensive; the phase's job is integration and signal-mapping, not reimplementation.

## Common Pitfalls

### Pitfall 1: Vercel's 4.5 MB body limit + TanStack Start's full in-memory FormData buffering
**What goes wrong:** A manual `.w3g` upload for an unusually long or team-game replay could exceed Vercel's default 4.5 MB serverless function request-body limit, returning a `413 FUNCTION_PAYLOAD_TOO_LARGE` error `[CITED: vercel.com/docs/errors/FUNCTION_PAYLOAD_TOO_LARGE]`.
**Why it happens:** TanStack Start automatically calls `await request.formData()` for multipart uploads before the handler runs, loading the entire file into memory with no streaming and no pre-handler size check `[CITED: github.com/TanStack/router issue #5704 discussion, via WebSearch]` — this compounds with, rather than bypasses, Vercel's separate body-size ceiling.
**How to avoid:** Add a client-side file-size guard before upload (typical `.w3g` files are well under 1 MB — see Assumptions Log A1 — so a generous cap like 4 MB with a clear rejection message covers the vast majority of real replays without needing Vercel Blob or a streaming-upload workaround). Confirm the actual limit empirically in Wave 0 rather than assuming 4.5 MB applies unmodified in this project's specific Vercel configuration.
**Warning signs:** Uploads failing silently or with a generic network error for longer replays; test with at least one real 40+ minute or team-game replay during Wave 0.

### Pitfall 2: wc3v's w3gjs-internals patch is pinned to w3gjs@3.0.0, not 4.1.0
**What goes wrong:** wc3v's CLI entry monkey-patches `w3gjs`'s internal (non-exported) `StatefulBufferParser` class by reaching directly into `node_modules/w3gjs/dist/lib/parsers/StatefulBufferParser.js` to make buffer reads EOF-tolerant for truncated/single-player-replay action blocks. This is not a stable public API — porting it to w3gjs 4.1.0 risks the internal file path, class name, or method signatures having changed between major versions.
**Why it happens:** wc3v was built against an older w3gjs major version; this project is standardizing on the current 4.1.0.
**How to avoid:** Before committing effort to the wc3v integration, spend a small, time-boxed task checking whether (a) w3gjs 4.1.0's CHANGELOG/issues already fixed the truncated-block problem natively, making the patch unnecessary, or (b) the patch needs porting, and scope that porting effort explicitly as its own task with a hard time box feeding the D-07 descope decision.
**Warning signs:** Parse errors or dropped action-stream tails specifically on single-player saves, TFT-era replays, or replays with non-ladder game modes — the exact failure class wc3v's patch targets.

### Pitfall 3: w3gjs's bundled object/unit/item ID→name mapping is NOT the project's patch-aware map
**What goes wrong:** Assuming w3gjs's internal `mappings.ts` (`items`, `units`, `buildings`, `upgrades`, `heroAbilities` string tables, bundled with the npm package) is automatically current for the WC3 patch a given replay was recorded on.
**Why it happens:** w3gjs ships one static mapping table per npm release — it is not itself patch-versioned against WC3's actual game-data changes, and this project needs its OWN patch-keyed resolution (D-12, `objectIdMapVersion`) independent of whatever w3gjs happens to bundle.
**How to avoid:** Treat the `id` strings w3gjs returns (`Player.units.order[].id`, etc.) as inputs to the project's own patch-keyed object-ID map lookup, not as final display-ready names. Resolve the map version from the replay's own `buildNumber`/`version` fields (both exposed directly by `ParserOutput`) via `patches.ts`.
**Warning signs:** Unit/item names rendering as raw numeric or internal-string IDs for a patch not covered by w3gjs's bundled table, or (subtler) names silently resolving to the WRONG unit because a later patch reused an object ID.

### Pitfall 4: `createServerFn` factory wrapping breaks the Node/browser bundle split
**What goes wrong:** Wrapping `createServerFn` in any indirection (a shared factory, a helper function returning the builder) causes the Vite compiler to miss the server/client split, shipping DB writes and w3gjs parsing into the client bundle where they crash (`process.env` is empty in the browser).
**Why it happens:** Documented and already fixed once in this project (ADR 009 "Fix 2") — the compiler statically pattern-matches `createServerFn(...).handler(...)` at the literal call site.
**How to avoid:** Every new replay server function must have `createServerFn(...).handler(...)` lexically visible at its definition, exactly as `src/server/w3champions.ts` and `src/server/quiz.ts` already do. Unit tests calling the exported handler function directly will NOT catch this class of bug — it only manifests when invoked from the client.
**Warning signs:** A server function that "works" in `vitest` but throws a database-connection-string error only when clicked in the browser.

### Pitfall 5: `masteryState` ordinal comparison must be manually kept in sync with `MasteryStateSchema`
**What goes wrong:** The atomic `setWhere` SQL CASE expression (Pattern 2) hardcodes the ordinal ranking of `untouched`/`in-progress`/`mastered` because Postgres cannot import a TypeScript enum. If `MasteryStateSchema`'s array order in `src/schemas/progress.ts` ever changes, the SQL CASE will silently drift out of sync.
**Why it happens:** `masteryState` is `text()` not `pgEnum` (ADR 009 §2, deliberate — avoids DDL hyphen-quoting issues), so there is no database-level enum to reference from SQL; the ordinal mapping has to be expressed as a literal CASE.
**How to avoid:** Document the CASE expression's dependency on `MasteryStateSchema`'s order explicitly at its definition site (a comment linking to the schema file), the same way `content-collections.ts` documents its parallel-schema-sync dependency on `src/schemas/node.ts`. Consider adding a unit test that asserts the SQL ordinal literals match `MasteryStateSchema.options` at runtime (fetchable from Zod) to catch drift.
**Warning signs:** A future schema change to `MasteryStateSchema`'s enum values without a corresponding change to the replay write path's `setWhere` clause.

### Pitfall 6: Replay player identification for manual uploads has no `gameId`-based shortcut
**What goes wrong:** For a manually uploaded `.w3g` file (no `gameId`, unlike auto-pull), matching the signed-in user's slot requires comparing the BattleTag from the Battle.net session against the in-replay player name(s) from `parser.playerList`/`players`. WC3 in-replay names may differ from the stored BattleTag in casing, or include clan-tag brackets, causing a naive exact-string match to fail.
**Why it happens:** The replay file only knows what WC3 recorded as the in-game player name at match time — it has no concept of the project's Battle.net-derived BattleTag identity.
**How to avoid:** Normalize both sides (case-insensitive, strip common clan-tag bracket patterns) before comparing, and always keep D-14's manual-pick fallback as the safety net rather than trying to make the automatic match perfect.
**Warning signs:** Higher-than-expected rate of "no match found" prompts for BattleTags that include a clan tag or unusual capitalization.

### Pitfall 7: 1v1-only mastery gate (D-15) must be enforced structurally, not just at threshold-check time
**What goes wrong:** Team/FFA replays parse successfully and produce real signals; without an explicit filter, those signals could accidentally advance MECHANIC node mastery even though D-15 says only 1v1 replays should.
**Why it happens:** w3gjs parses any replay uniformly — there is no built-in "1v1-only" flag; the phase must derive it from `players.length` (excluding observers) or the `matchup` field.
**How to avoid:** Filter at the same structural layer AUTO-03's MECHANIC-only guard lives in `detect-mastery-signals.ts` — i.e., a `players.filter(p => !isObserver).length === 2` (or equivalent using w3gjs's own `matchup`/`gametype` fields) check runs BEFORE any threshold evaluation for the replay write path, mirroring the "filter-then-detect" order already established in that module.
**Warning signs:** A test replay from a 2v2 or FFA game unexpectedly advancing a node to `mastered`.

### Pitfall 8: w3champions replay endpoint rate limits are partitioned per caller, not per end-user
**What goes wrong:** The `/api/replays/{gameId}` rate limits (30–50/hour, 70–100/day depending on match age) are enforced server-side by w3champions per IP or API token `[CITED: ReplayRateLimitAttribute.cs, direct source read]`. If this project's outbound calls all originate from a shared/rotating Vercel serverless egress IP, ALL users of the app effectively share one rate-limit budget with w3champions, not one budget per signed-in user.
**Why it happens:** w3champions has no concept of "this request is on behalf of app X's user Y" without an API token registered for that purpose.
**How to avoid:** Flag this for the planner as a scaling risk to watch, not necessarily something to solve in Phase 8 at expected v1 traffic levels. If traffic grows, requesting a w3champions API token (the `AdminApiTokens.vue` surface suggests a token system exists) would move this project into its own rate-limit partition instead of the shared default.
**Warning signs:** Auto-pull failures with a `rate-limited`-equivalent status appearing even for users who have not personally triggered many pulls.

## Code Examples

### Parsing a `.w3g` buffer with w3gjs

```typescript
// Source: w3gjs@4.1.0 README (github.com/PBug90/w3gjs) + dist/cjs/W3GReplay.d.ts
// (verified directly against the published package's type definitions)
import W3GReplay from "w3gjs";

const parser = new W3GReplay();
const result = await parser.parse(buffer); // Buffer, not a file path, server-side

// result.buildNumber / result.version — the raw WC3 build number + version
// string from the replay header (REPLAY-08 / D-12's "raw WC3 build number"
// requirement is satisfied directly by this field — no separate parsing needed).
console.log(result.buildNumber, result.version, result.duration, result.matchup);

// result.players: Player[] — each Player has .apm, .groupHotkeys, .actions,
// .units.order / .buildings.order / .upgrades.order / .items.order (all
// timestamped {id, ms}[]), and .heroCollector for hero level/skill/item timing.
```

### Drizzle monotonic-max upsert with an ordinal `setWhere` guard

See Architecture Patterns → Pattern 2 above for the full example (verified against `orm.drizzle.team/docs/guides/upsert`'s documented `setWhere` + `excluded` pseudo-table syntax).

### w3champions replay download (no auth required)

```typescript
// Source: W3ChampionsStatisticService/Replays/ReplaysController.cs
// (github.com/w3champions/website-backend, [Route("api/replays")] [HttpGet("{gameId}")])
// Mirrors the existing W3C_BASE_URL constant + encodeURIComponent pattern from
// src/lib/w3champions-client.ts (SSRF guard — hardcoded host, encoded param only).
const res = await fetch(`${W3C_BASE_URL}/api/replays/${encodeURIComponent(gameId)}`);
if (res.status === 429) {
  // rate-limited — 30-50/hr, 70-100/day depending on match age (server-enforced)
}
if (!res.ok) {
  // 404 if the gameId's flo match id cannot be resolved
}
const buffer = Buffer.from(await res.arrayBuffer()); // application/octet-stream, {gameId}.w3g
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|-------------------|---------------|--------|
| wc3v built against `w3gjs@3.0.0`'s internal buffer-parsing classes | Current npm-published `w3gjs` is v4.1.0 | w3gjs v4.1.0 published 2026-04-29 `[VERIFIED: npm registry]` | Any wc3v-derived internals patch needs re-verification against the current major version before being trusted (Pitfall 2) |

**Deprecated/outdated:** None identified specific to this domain — both w3gjs and wc3v are actively maintained as of research date (w3gjs pushed 2026-06-15, wc3v pushed 2026-06-27).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|----------------|
| A1 | Typical WC3 `.w3g` 1v1 replay files are well under Vercel's 4.5 MB body limit (commonly tens of KB to low single-digit MB even for long games) | Summary, Pitfall 1 | Manual upload could fail for a meaningful fraction of real replays without a pre-check; no official file-size benchmark was found in this research session |
| A2 | w3gjs parse time/memory for a typical 1v1 replay comfortably fits Vercel's default function limits (2 GB memory, 60s+ timeout) | Summary, Spike 1 | If wrong, inline server-fn parsing is not viable and a background-job architecture (not currently in this project's stack) would be needed instead |
| A3 | eAPM approximation via filtering "spam" action types (e.g. repeated `esc`/`select`-only actions) out of `Player.actions` is the correct heuristic direction | Don't Hand-Roll, Code Examples | No canonical eAPM formula was found from w3gjs or w3champions documentation; the exact classification needs its own design pass and should be treated as content/UX-reviewable, not a hard scientific claim |
| A4 | BattleTag-to-replay-player-name matching needs case-insensitive + clan-tag-normalized comparison | Pitfall 6 | If wrong (WC3 names always match BattleTags exactly), the normalization is harmless extra robustness; if the mismatch rate is higher than assumed, more users fall through to the D-14 manual-pick fallback than expected (acceptable, but worth tracking) |
| A5 | Vercel's serverless outbound egress IP for this project's deployment may be shared/non-static across tenants, risking shared w3champions rate-limit partitioning | Pitfall 8 | If wrong (egress is effectively dedicated or w3champions partitions by something else), this risk is overstated and can be deprioritized; if right, it becomes a real scaling constraint worth an API token request |

**Note:** wc3v's `lib/` core dependency footprint (isolated from `canvas`/`stormjs`/`d3`) was independently confirmed via direct `grep`-equivalent inspection of `ResourceSeries.js`, `BattleDetector.js`, `BuildingBackfill.js`, `Player.js`, and `World.js`'s import statements against the live GitHub repository — this is tagged `[CITED: github.com/jblanchette/wc3v]`, not `[ASSUMED]`, because it was verified against the primary source rather than inferred.

## Open Questions

1. **Real w3gjs parse time/memory for representative replays (short/long, 1v1/team)**
   - What we know: file sizes are historically small; the package itself is lightweight (47 KB packed); no simulation is involved (w3gjs is an event-stream parser, not a game-state simulator like wc3v).
   - What's unclear: no published numeric benchmark exists.
   - Recommendation: first Wave-0 task — parse 3–5 real sample `.w3g` files (varying length, 1v1 and team) locally with `console.time`/memory logging before finalizing "parse inline in the server fn" as the committed architecture.

2. **Whether TanStack Start's FormData buffering effectively lowers the practical upload limit below Vercel's stated 4.5 MB**
   - What we know: TanStack Start fully buffers the request body into memory before the handler runs; Vercel enforces its own 4.5 MB ceiling independently.
   - What's unclear: whether the two combine to something stricter, or whether TanStack Start's buffering happens inside the same request lifecycle Vercel already limits (making Vercel's limit the sole binding constraint).
   - Recommendation: a literal small end-to-end upload test (e.g. a 3–4 MB dummy file) during Wave 0, in the actual deployed environment, not just locally.

3. **Whether wc3v's w3gjs-3.0.0-internals EOF-tolerance patch is still needed against 4.1.0, or whether 4.1.0 already fixed the underlying truncated-block issue natively**
   - What we know: the patch exists and its rationale (single-player saves, TFT-era replays with short data blocks) is documented in `wc3v.js`'s own comments.
   - What's unclear: w3gjs's own CHANGELOG/issue history between v3.0.0 and v4.1.0 was not checked for this specific fix.
   - Recommendation: check this first — it directly gates the wc3v integration effort estimate and therefore the D-07 descope decision timing.

4. **Whether wc3v's pro-build-library / compare-to-pro dataset (16 curated builds, 221 pro replay references across 12 tournaments) ships as static data in the repo or must be re-derived at runtime**
   - What we know: the README describes it as "curated" and "backed by real pro replays."
   - What's unclear: whether this is precomputed JSON checked into the repo (cheap to vendor) or requires running the full parse+analysis pipeline over 221 replay files at build/runtime (expensive).
   - Recommendation: inspect the repo's data directories (not covered in this research pass) before scoping "compare-to-pro" effort.

5. **Real-world w3champions rate-limit partition behavior for this project's specific Vercel deployment**
   - What we know: the rate limit is IP-or-token partitioned server-side.
   - What's unclear: Vercel's actual current (2026) outbound IP behavior for this project's specific region/plan.
   - Recommendation: no way to verify without live testing post-deploy; treat as a known unknown to monitor, not a pre-launch blocker given expected v1 traffic.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|--------------|-----------|---------|----------|
| `w3gjs` (npm) | REPLAY-01/02/04/05/06/07/08 | ✓ | 4.1.0 `[VERIFIED: npm registry]` | — |
| w3champions replay endpoint (`GET /api/replays/{gameId}`) | REPLAY-05 | ✓ (public, unauthenticated) | live, confirmed via source read `[CITED]` | — |
| wc3v source (GPL-3.0, vendored, not npm) | REPLAY-03 | ✓ (git-clonable) | repo pushed 2026-06-27 | Descope to Phase 8.x per D-07 if `lib/` vendoring + w3gjs-version reconciliation proves heavy |
| Vercel serverless (deploy target) | All server-side parsing/writes | ✓ (already the project's deploy target since Phase 1) | Hobby: 60s/2GB (300s w/ Fluid Compute); Pro: 300s/2GB+ `[CITED: vercel.com/docs/functions/limitations]` | Background job architecture (not currently in stack) if Wave-0 timing spike shows inline parsing is too slow |
| Node.js `Buffer` APIs | w3gjs/wc3v parsing | ✓ (TanStack Start server runtime is Nitro/Node-based) | — | — |

**Missing dependencies with no fallback:** none — both external integrations (w3gjs npm package, w3champions replay endpoint) are confirmed installable/reachable.

**Missing dependencies with fallback:** wc3v integration effort is the one open-ended item; D-07's descope valve to Phase 8.x is the already-designed fallback if the fork proves heavier than expected.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.9 `[VERIFIED: package.json]` |
| Config file | `vitest.config.ts` — `environment: "node"` default, `include: ["src/**/*.test.{ts,tsx}", "scripts/**/*.test.ts"]` |
| Quick run command | `npx vitest run src/lib/replay-signals.test.ts` (or the equivalent new file) |
| Full suite command | `npm test` (`vitest run`) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|---------------------|--------------|
| REPLAY-01 | w3gjs wrapper correctly surfaces build order / APM / hotkeys / hero timing from a parsed `ParserOutput` fixture | unit | `vitest run src/lib/replay-signals.test.ts` | ❌ Wave 0 |
| REPLAY-02 | `deriveReplaySignals` is pure — same fixture input always produces same output, no I/O imports | unit | `vitest run src/lib/replay-signals.test.ts` | ❌ Wave 0 |
| REPLAY-03 | wc3v-derived supply/economy/expansion output (if integrated) matches expected shape for a fixture replay | unit | `vitest run src/lib/wc3v/*.test.ts` | ❌ Wave 0 (contingent on D-07 go decision) |
| REPLAY-04 | Manual upload server fn rejects oversized files with a clear error before attempting a parse | unit | `vitest run src/server/replay.test.ts` | ❌ Wave 0 |
| REPLAY-05 | Auto-pull server fn is principal-keyed (no `gameId`/`userId` client-trust channel for the player-match step), reuses gameId cache-gate | unit | `vitest run src/server/replay.test.ts` | ❌ Wave 0 |
| REPLAY-06 | Monotonic-max upsert never downgrades an existing higher `masteryState`; stamps `source:"replay"` only on an actual raise | unit (mocked db, mirrors `w3champions.test.ts`'s `vi.doMock` strategy) | `vitest run src/server/replay.test.ts` | ❌ Wave 0 |
| REPLAY-06 | 1v1-only gate: team/FFA replay signals never advance mastery (Pitfall 7) | unit | `vitest run src/lib/replay-thresholds.test.ts` | ❌ Wave 0 |
| REPLAY-07 | Feedback report data always includes a node mapping + target value alongside every raw signal (never a bare stat) | unit | `vitest run src/lib/replay-signals.test.ts` | ❌ Wave 0 |
| REPLAY-08 | Object-ID map resolution is correctly keyed by the replay's `buildNumber` via `patches.ts` `objectIdMapVersion` | unit | `vitest run src/lib/object-id-maps/*.test.ts` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** the specific new/changed test file(s) via `npx vitest run <file>`.
- **Per wave merge:** `npm test` (full suite).
- **Phase gate:** full suite green before `/gsd-verify-work`, plus at least one real (non-fixture) `.w3g` file exercised end-to-end (upload → parse → signals → write) as a Wave-0/manual verification step, since w3gjs's real-world parsing behavior against actual replay files cannot be fully captured by hand-authored fixtures alone.

### Wave 0 Gaps

- [ ] `src/lib/replay-parser.test.ts` — w3gjs wrapper against at least one real sample `.w3g` fixture (binary fixture committed or fetched in CI-safe way) — also the vehicle for the Open Question 1 timing spike.
- [ ] `src/lib/replay-signals.test.ts` — pure signal-derivation tests against hand-authored `ParserOutput`/`Player` fixtures (fast, no real binary needed for most cases).
- [ ] `src/lib/mastery-ordinal.test.ts` — new ordinal helper, mirrors existing `mmr-tiers.test.ts` coverage shape.
- [ ] `src/server/replay.test.ts` — orchestrating server fn tests, mirrors `w3champions.test.ts`'s `vi.doMock()` + `vi.resetModules()` mocking strategy (mock db, w3champions-client-equivalent, content-collections; real patches/mastery-ordinal).
- [ ] No new test framework install needed — Vitest is already fully configured for this project.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|-----------------|---------|---------------------|
| V2 Authentication | Yes (indirect) | Existing `authMiddleware`/`better-auth` session — no new auth mechanism introduced this phase |
| V3 Session Management | No (unchanged) | Reuses existing session infrastructure |
| V4 Access Control | Yes | `authedServerFn`/`.middleware([authMiddleware])` pattern (ADR 007) — every replay server fn is principal-keyed by construction, no `userId`/`gameId`-as-ownership-proof input channel |
| V5 Input Validation | Yes | Zod-validate every parsed field before it reaches a DB write or is echoed to the client; treat the uploaded `.w3g` buffer and the w3champions-downloaded buffer identically as **untrusted binary input** to w3gjs (and wc3v, if integrated) — a malformed or adversarial replay file should fail parsing safely, not crash the server function or leak internal state |
| V6 Cryptography | No | Not applicable — no new cryptographic operations this phase |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|------------------------|
| Untrusted binary parsing (malformed/adversarial `.w3g` triggering a parser crash, resource exhaustion, or unexpected behavior in w3gjs/wc3v) | Denial of Service | Wrap the parse call in a try/catch that returns an opaque "could not parse this replay" error (mirrors the existing `T-07-06c` "no upstream error strings ever leave this module" discipline from `w3champions-client.ts`); enforce the upload size cap (Pitfall 1) as a first-line resource-exhaustion guard before any parse is attempted |
| SSRF via the auto-pull `gameId` parameter | Tampering | The `gameId` is passed only as a path segment to the hardcoded `W3C_BASE_URL` host, `encodeURIComponent`-ed, exactly mirroring the existing `w3champions-client.ts` SSRF guard (T-07-06a) — never construct the outbound URL from any other client-supplied field |
| IDOR via replay-analysis cache or progress writes | Elevation of Privilege | Every DB query/write in the replay path is principal-keyed via `context.principal.id` (ADR 007 D-12) — no `userId` accepted as request input, same structural guarantee already proven for progress/quiz/auto paths |
| Malicious file upload (oversized payload, non-`.w3g` content masquerading as a replay) | Denial of Service / Tampering | Client-side size pre-check (Pitfall 1) + server-side re-validation (never trust a client-side check alone) + w3gjs's own parse failure as the final backstop (a non-`.w3g` file should fail to parse cleanly, not partially succeed with garbage data) |
| Leaking upstream w3champions error detail (status codes, internal error strings) to the client | Information Disclosure | Mirror the existing `classifyW3championsResponse` pattern (`w3champions-client.ts`) — map every outcome to an opaque bucket status before it reaches the client, never forward raw upstream response bodies |

## Sources

### Primary (HIGH confidence)
- `w3gjs@4.1.0` npm package — `npm view`, `npm pack --dry-run`, and direct inspection of the published `.d.ts` type definitions (`types.d.ts`, `Player.d.ts`, `W3GReplay.d.ts`, `mappings.d.ts`, `convert.d.ts`, `ReplayParser.d.ts`, `MetadataParser.d.ts`) `[VERIFIED: npm registry]`
- `github.com/w3champions/website-backend` — direct source read of `W3ChampionsStatisticService/Replays/ReplaysController.cs`, `W3ChampionsStatisticService/WebApi/ActionFilters/ReplayRateLimitAttribute.cs`, `RateLimitAttribute.cs`, `W3C.Domain/ReplayService/ReplayServiceClient.cs` via `gh api` `[CITED: github.com/w3champions/website-backend]`
- `github.com/jblanchette/wc3v` — direct source read of `package.json`, `README.md`, `docs/DESIGN.md`, `LICENSE.md`, `wc3v.js`, and import statements of `lib/ResourceSeries.js`, `lib/BattleDetector.js`, `lib/BuildingBackfill.js`, `lib/Player.js`, `lib/World.js` via `gh api` `[CITED: github.com/jblanchette/wc3v]`
- This project's own codebase — `src/lib/w3champions-client.ts`, `src/server/w3champions.ts`, `src/lib/detect-mastery-signals.ts`, `src/lib/mmr-tiers.ts`, `src/lib/patches.ts`, `src/db/schema.ts`, `src/schemas/progress.ts`, `src/schemas/node.ts`, `content-collections.ts`, `src/lib/auth-middleware.ts`, `docs/adr/007`, `docs/adr/009`, `docs/adr/010` — read directly, HIGH confidence, project-internal ground truth

### Secondary (MEDIUM confidence)
- `orm.drizzle.team/docs/guides/upsert` — `onConflictDoUpdate` + `setWhere` + `excluded` pseudo-table syntax `[CITED via WebFetch]`
- `vercel.com/docs/functions/limitations`, `vercel.com/docs/errors/FUNCTION_PAYLOAD_TOO_LARGE`, `vercel.com/docs/functions/configuring-functions/duration` — serverless function limits `[CITED via WebSearch, cross-referencing official Vercel docs pages]`
- `github.com/TanStack/router` issue #5704 — documented FormData full-buffering limitation in TanStack Start `[CITED via WebSearch]`

### Tertiary (LOW confidence)
- Typical `.w3g` file size range (Assumptions Log A1) — general domain knowledge, no single authoritative benchmark source found
- eAPM classification heuristic direction (Assumptions Log A3) — no canonical source found; flagged for design review

## Metadata

**Confidence breakdown:**
- Standard stack (w3gjs): HIGH — confirmed via direct npm registry + package type-definition inspection
- w3champions replay endpoint: HIGH — confirmed via direct backend source-code read, not inference
- wc3v integration architecture: MEDIUM — favorable structural finding (canvas/stormjs isolation) is HIGH confidence (source-verified); actual porting effort for the w3gjs-version-mismatch patch is unverified (needs Wave 0)
- Serverless parse-time/memory feasibility: MEDIUM-LOW — architecturally plausible, no numeric benchmark found; flagged as the top Wave-0 priority
- Pitfalls: HIGH — each is either a documented, sourced project pattern (ADR references) or a directly observed source-code fact (rate limits, dependency imports)

**Research date:** 2026-07-02
**Valid until:** ~30 days for the w3champions/w3gjs/wc3v ecosystem facts (all three are actively maintained and could shift); the Vercel platform-limits facts should be re-verified against current docs at actual deploy/implementation time given how frequently serverless platform limits change.
