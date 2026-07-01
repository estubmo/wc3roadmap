# Phase 7: w3champions Auto-Detection - Research

**Researched:** 2026-07-01
**Domain:** External REST API integration (w3champions ladder stats) + server-side caching + content-driven rule evaluation
**Confidence:** HIGH (API shape, error semantics, rate-limit reality — all verified against live source code and live HTTP calls) / MEDIUM (exact TTL value, MMR tier bucket boundaries — no authoritative external guidance exists, calibrated from real but limited data)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Phase Boundary:** A user-triggered sync that pulls coarse w3champions ladder signals (MMR tier, games-played volume, matchup W/L) and auto-advances eligible MECHANIC nodes to `in-progress`. The sync is rate-limit-respecting (DB TTL + TanStack stale-while-revalidate), labels its results as distinct from manual/quiz progress, and never blocks manual tracking — auto-detection is an enhancement, not a prerequisite.

Locked by roadmap/prior phases (NOT re-discussed):
- BattleTag + gateway come from the Battle.net identity captured at login — **no separate linking step** (Phase 4, ADR 008).
- `source: "auto"` is **server-stamped**, never client-supplied (Phase 5, ADR 009).
- Only `MECHANIC` nodes auto-advance; **CONCEPTUAL nodes never advance from a sync** (criterion 5).
- Server functions are **principal-keyed** via `authMiddleware` (ADR 007).
- Cache respects criterion 3: two syncs within TTL return cached data, no 2nd API call.

**Signal → Node Mapping:**
- **D-01:** Auto-detect criteria live **per-node in MDX frontmatter** (content), not in a central rule table. `detectMasterySignals()` reads node metadata to decide eligibility. Extends `src/schemas/node.ts`.
- **D-02:** Criteria shape is **single signal + threshold** per node (e.g. `{ signal: 'mmrTier', gte: 'gold' }` or `{ signal: 'gamesPlayed', gte: N }`). No compound AND/OR rule engine.
- **D-03 (Claude's discretion, research-gated):** In-scope signals are the **race-agnostic ones — MMR tier + games-played volume**. Matchup W/L is deferred to v2 unless the API makes it trivial and near-free.

**Advancement Ceiling & Precedence:**
- **D-04:** Auto-detect can set a node to **at most `in-progress`** — never `mastered`.
- **D-05:** Auto-detect touches **only `untouched` nodes** (no existing record). Never overwrites a node already marked by manual or quiz.
- **D-06:** Auto is **monotonic — never downgrades**. `untouched → in-progress` only, one-way additive ratchet.

**Sync UX & Feedback:**
- **D-07:** Successful sync that advances nodes → summary count on profile + transient highlight/pulse of newly-advanced nodes on the graph.
- **D-08:** A sync that qualifies 0 nodes shows an explicit reassuring message, distinct from failure.
- **D-09:** Auto-advanced nodes labeled distinct from manual/quiz — panel label + distinct canvas marker, reusing `MasteryBadge` `source` prop + `sourceMap` pattern from Phase 6.

**Failure & Rate-Limit Guard:**
- **D-10:** Three tailored messages: (a) unreachable/timeout, (b) rate-limited → fall back to cached data (not an error), (c) BattleTag not found/unranked/no ladder data → reads as normal (common for new players). Exact status-code → bucket mapping → research (resolved below).
- **D-11:** Re-sync guard is **silent cache within TTL, button always live**. No disabled state, no countdown.

### Claude's Discretion
- **D-03** signal scope (resolved below — MMR tier + games volume only; matchup W/L NOT trivial/near-free, confirmed out of scope).
- **Exact TTL value** (DB cache + TanStack `staleTime`) — resolved below with explicit confidence flag.
- **Exact UI copy and marker styling** (D-08, D-09, D-10) → UI-SPEC / UI phase (not this research).

### Deferred Ideas (OUT OF SCOPE)
- **Matchup W/L trend signals & finer matchup detection** (ADET-01..02) — inherently race/matchup-specific; belongs with race-specific branch content (RACE-01..05). v2.
- **Auto-advancing to `mastered` from ladder data** — explicitly rejected for coarse signals (D-04). Phase 8 (replay parsing) territory.
- **Background/automatic sync (no user click)** — out of scope; sync is user-triggered per criterion 1.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTO-01 | User links their w3champions data via BattleTag from Battle.net login | Confirmed: no separate linking step needed. `users.battleTag` + `users.gateway` (ADR 008) map directly to w3champions query params. Gateway mapping gap identified (`kr` has no w3champions GateWay — see Pitfall 5). |
| AUTO-02 | Coarse signals (games volume, MMR tier, matchup W/L) auto-advance eligible MECHANIC nodes | MMR tier + games volume confirmed cheaply available from ONE endpoint (`/game-mode-stats`) + ONE endpoint (`/api/players/{battleTag}` for career games). Matchup W/L requires a separate, heavier endpoint (`/api/player-stats/{battleTag}/race-on-map-versus-race`) — confirms D-03's exclusion is correct. |
| AUTO-03 | Auto-detection only ever advances MECHANIC nodes — never CONCEPTUAL | `detectMasterySignals()` pure-function contract below filters `nodeType === "MECHANIC"` before evaluating any criteria — structural guarantee, unit-testable. |
| AUTO-04 | w3champions API calls are cached and rate-limit-respecting (TanStack stale-while-revalidate) | DB-TTL row (new `w3championsSync` table) + TanStack `staleTime` composition documented below. Verified against live source: NO application-layer rate limit exists on player-stat endpoints (only replay endpoints are rate-limited in code) — conservative default recommended regardless, since infra-level limits are unknown. |
| AUTO-05 | Auto-detection enhances but never blocks progress — manual/quiz tracking works without a linked account | Sync is an isolated, additive server fn; existing `setNodeMastery` / `recordQuizPass` paths are untouched by this phase. Confirmed by D-04/D-05/D-06 design (auto never overwrites, never downgrades — cannot break manual/quiz paths even on API failure). |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

Extracted directives this phase must honor (from `./CLAUDE.md`'s Technology Stack + "What NOT to Use" tables):

- **No new HTTP client library** — `tRPC` and `GraphQL` are explicitly rejected; server functions (`createServerFn`) already provide type-safe RPC. This phase's w3champions integration is a plain outbound `fetch`, not an inbound API surface, so this constraint mainly reinforces "don't introduce a new server-communication paradigm."
- **`zod` v4 idioms only** — `z.enum([...])` not `z.nativeEnum()`; `{ error: "..." }` not `{ message: "..." }`; `.min(1)` for non-empty strings — all followed in the `AutoDetectCriteriaSchema` example above, matching existing `CitationSchema`/`QuizSchema` conventions.
- **`drizzle-orm` for all persistence** — the new `w3championsSync` table must follow the pinned `drizzle-orm@0.45.2` conventions already established (surrogate text PK, `uniqueIndex`, cascade FK to `users.id`) — no Prisma, no raw SQL migrations outside `drizzle-kit`.
- **`motion` (not `framer-motion`)** — D-07's transient highlight/pulse must import from `motion/react`.
- **TypeScript strict mode** — do not disable; all new modules (`detect-mastery-signals.ts`, `mmr-tiers.ts`, `w3champions-client.ts`) must type-check cleanly under the existing `tsconfig`.
- **SPDX header convention** — every new hand-authored `src/**/*.ts` file requires the `SPDX-License-Identifier: GPL-3.0-or-later` header line, per the project's established convention (Phase 1, ADR 004).
- **Deep-module + `CONTEXT.md`/`docs/adr/` discipline** — this phase should extend `CONTEXT.md` with new domain terms (e.g. "auto-detect criteria," "mastery signal," "sync") and record a new ADR for the w3champions integration design (mirrors ADR 009/010 precedent for Phase 5/6). Modules must present simple interfaces hiding real complexity — `detectMasterySignals()` is a canonical example: a 3-argument pure function hiding the MECHANIC-filter + untouched-filter + threshold-comparison logic.
- **No secrets in this phase** — the w3champions endpoints used require no API token/auth header (verified live); if a future phase requires a token (e.g. Phase 8 replay auto-pull per `.planning/STATE.md` blockers), it must go through the existing `.env`/SOPS-style secret handling, never committed.
- **GitHub CLI (`gh`) as primary GitHub interaction tool** — followed throughout this research session for source verification.

## Summary

The w3champions API (`website-backend.w3champions.com`, C#/.NET, source: `github.com/w3champions/website-backend`) is real, public, and was verified **directly against its source code and with live HTTP requests** during this research session — the strongest evidence tier available for an undocumented community API. Three endpoints cover this phase's needs with no extra machinery: `GET /api/players/{battleTag}` (career-wide games-played volume, no season param needed), `GET /api/players/{battleTag}/game-mode-stats?gateWay=X&season=Y` (current-season MMR per race/game-mode, sorted by ranking points), and `GET /api/ladder/seasons` (resolves the current season id, cacheable for hours). A fourth endpoint, `GET /api/player-stats/{battleTag}/race-on-map-versus-race`, exists for true per-matchup W/L — it lives in a **separate controller backed by a heavier per-map aggregation service**, confirming CONTEXT.md's D-03 instinct that matchup W/L is not "trivial and near-free": it requires an additional round-trip and per-matchup content criteria this phase's schema shape (D-02, single signal+threshold) doesn't support. **Recommendation: ship MMR tier + games-played volume only, exactly as D-03 defaults to.**

Error/status-code semantics were confirmed by reading `PlayersController.cs` and `BattleTagResolver.cs` and by making live 404/200/empty-array requests: an **unknown BattleTag that w3champions' identity service has never resolved returns HTTP 404** with body `"Player {battleTag} not found."`; a **known BattleTag with zero ranked games returns HTTP 200 with an empty array** (`game-mode-stats`) or all-zero win/loss objects (`/api/players/{battleTag}`) — this is the common "new player, no ladder data yet" case and must never be treated as an error. **Rate limiting**: reading the live `RateLimitAttribute`/`ReplayRateLimitAttribute` source shows the application layer **only rate-limits replay-download endpoints** (30-50 req/hr, 70-100/day) — the player-stats endpoints this phase needs have **no documented or code-level rate limit**. A 429, if it ever occurs (e.g. from an undocumented infra/proxy layer), returns a bare `429` status with **no `Retry-After` header** (confirmed from `RateLimitAttribute.OnActionExecutionAsync`). Given the absence of a hard limit specifically for these endpoints, but genuine uncertainty about infra-level throttling, this research recommends a **conservative 15-minute DB TTL + matching TanStack `staleTime`** — long enough to make accidental spam-clicking irrelevant, short enough to stay useful within an active laddering session. This is flagged `[ASSUMED]` — no authoritative source states this exact number.

A structural gap was discovered that the planner must address: **w3champions' `GateWay` enum has only `America` and `Europe`** (values 10/20) — there is no `Korea`/`Asia` gateway. The project's `users.gateway` column stores `"us" | "eu" | "kr"` (ADR 008). A `kr` gateway has no 1:1 w3champions mapping; this research recommends mapping `kr → America` as a documented, non-blocking assumption (worst case: an empty/unranked result, which degrades gracefully into the existing "no ladder data" bucket per D-10c) and flags it `[ASSUMED — needs human confirmation]`.

**Primary recommendation:** Build the sync as a single new deep module (`src/server/w3champions.ts`) mirroring the exact shape of `src/server/quiz.ts` — `authMiddleware`-wrapped, principal-keyed, server-stamped `source:"auto"`/`masteryState:"in-progress"` — wrapping a pure `detectMasterySignals()` function and a thin fetch client. No new npm packages are required; the entire integration is native `fetch` + the existing TanStack Start / Drizzle / Zod stack. A new `w3championsSync` DB table stores the last-synced signals + timestamp as the TTL source of truth; TanStack Query `staleTime` is a client-side mirror of the same window, not an independent gate — the DB row is authoritative (criterion 3 holds even across browser tabs/devices).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| BattleTag/gateway resolution | API / Backend | — | Already resolved at auth time (Phase 4); server fn reads `context.principal.battleTag`/`.gateway` — no client input. |
| w3champions HTTP fetch + error classification | API / Backend | — | Server-only: avoids CORS, keeps any future API token secret, keeps the 3-bucket error mapping in one auditable place. |
| Mastery-signal evaluation (`detectMasterySignals`) | API / Backend (pure logic, framework-free) | — | Pure function — no DB, no fetch, no auth. Deep module: simple interface (`nodes[], signals, existingIds`) hides comparison logic. Runs inside the server fn but is independently unit-testable. |
| DB TTL cache row | Database / Storage | API / Backend | New `w3championsSync` table is the durable source of truth for "last synced Xm ago" and the TTL gate — must survive across devices/sessions (a TanStack Query cache alone would not). |
| TanStack Query cache (`staleTime`) | Frontend Server / Client | — | Secondary, same-tab optimization only. Prevents redundant server-fn calls within one browser session; does NOT replace the DB gate. |
| Node auto-detect criteria (frontmatter) | Content pipeline (build-time) | — | Follows existing pattern (ADR 002): content is data, not code. `content-collections` validates it at build time exactly like citations/quiz. |
| Sync UI (button, "Last synced Xm ago", summary toast, graph highlight) | Browser / Client | — | Standard React client concerns; Motion already installed for the D-07 pulse highlight. |
| Auto-advanced mastery marker (badge + canvas glyph) | Browser / Client | — | Extends existing `MasteryBadge`/`sourceMap` mechanism from Phase 6 — no new architecture, just a new `source` value (`"auto"`). |

## Standard Stack

### Core

No new runtime dependencies are required for this phase — it is built entirely on the stack already installed and pinned by prior phases.

| Library | Version (installed) | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@tanstack/react-start` | 1.168.x | `createServerFn` for the sync endpoint | Same pattern as `src/server/quiz.ts` / `src/server/progress.ts` — no new pattern introduced. |
| `drizzle-orm` + `@neondatabase/serverless` | 0.45.2 / 1.1.0 | New `w3championsSync` table, upsert on sync | Matches existing `nodeProgress`/`quizProgress` table conventions (surrogate PK, unique index, cascade FK). |
| `zod` | 4.4.3 | Node frontmatter `autoDetect` criteria schema; sync response validation | Zod v4 idioms already established (`z.discriminatedUnion`, `{ error: "..." }`). |
| native `fetch` | Node 20+ runtime (Vercel) | w3champions HTTP client | No HTTP client library needed — w3champions returns plain JSON over public HTTPS, no auth token required for these read endpoints (verified live, no `Authorization` header sent). |
| `motion` | 12.42.0 | D-07 transient highlight/pulse of newly-advanced nodes on canvas return | Already installed; matches CLAUDE.md guidance (`motion/react`, not `framer-motion`). |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `sonner` | (installed, Phase 5) | D-08 "0 nodes qualified" reassurance toast, D-10 error-bucket toasts | Reuse existing `Toaster` mount + `toast.error`/`toast.success` pattern from `useProgressMutation.ts`. |
| `@tanstack/react-query` | 5.101.2 | Client cache for sync status + `staleTime` mirror of DB TTL | Same `progressKeys`-style factory pattern; add `w3championsKeys`. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native `fetch` for w3champions HTTP calls | `ky` / `axios` | Unnecessary — one server-side GET call with a `Response.ok`/status-code branch. Adding a library for this is over-engineering; native `fetch` is available in the Vercel Node.js runtime used by TanStack Start. |
| DB-row TTL as source of truth | TanStack Query `staleTime` alone | Rejected — `staleTime` is per-browser-tab client cache; it does not survive a page reload from a different device, and criterion 3 ("two syncs within TTL return cached data") must hold across devices/sessions since the sync result is server-persisted. |
| Static per-node `autoDetect` frontmatter (D-01, locked) | Central rule table (e.g. `src/lib/auto-detect-rules.ts`) | Rejected by CONTEXT.md D-01 for extensibility reasons — noted here only for completeness, not re-litigated. |

**Installation:**
```bash
# No new packages — everything needed is already in package.json.
```

**Version verification:** Not applicable — no new packages. Existing pinned versions (`drizzle-orm@0.45.2`, `zod@4.4.3`, `@tanstack/react-start@1.168.x`) confirmed current via `package.json` inspection; no drift detected relative to CLAUDE.md's Technology Stack table.

## Package Legitimacy Audit

**No new external packages are introduced by this phase.** The w3champions integration is a native-`fetch` HTTP client against a public REST API — not an npm dependency. The Package Legitimacy Gate is not applicable; this section is included per protocol to state that explicitly.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| — | — | — | — | — | — | N/A — no new packages |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────┐   1. click "Sync with w3champions"
│   Browser    │──────────────────────────────────┐
│ (Profile UI) │                                   │
└─────┬────────┘                                   ▼
      │ 6. graph re-hydrates,                ┌─────────────────────────┐
      │    pulse-highlight new nodes,        │  syncW3champions        │
      │    toast summary/reassurance/error   │  (server fn, authed)    │
      └───────────────────────────────────────┤  src/server/w3champions │
                                               └──────────┬──────────────┘
                                                          │ 2. read context.principal
                                                          │    {id, battleTag, gateway}
                                                          ▼
                                          ┌───────────────────────────────┐
                                          │  w3championsSync (DB row)     │
                                          │  WHERE userId = principal.id  │
                                          └───────────┬───────────────────┘
                                     within TTL?  ┌────┴────┐  expired/missing?
                                        yes ◄─────┘         └─────► 3. fetch w3champions API
                                        │                              GET /api/players/{tag}
                                        │                              GET /.../game-mode-stats
                                        │                              (native fetch, no npm client)
                                        │                                     │
                                        │                          ┌──────────┴──────────┐
                                        │                    200 OK│         404 / network / 429
                                        │                          │                      │
                                        │                          ▼                      ▼
                                        │                 signals: {mmrTier,      bucket (a)/(b)/(c)
                                        │                  gamesPlayed}           per D-10 mapping
                                        │                          │                      │
                                        │                          ▼                      │
                                        │              4. upsert w3championsSync row      │
                                        │                 (cache TTL reset)                │
                                        └──────────────────────────┬──────────────────────┘
                                                                    ▼
                                                   ┌─────────────────────────────────┐
                                                   │ 5. detectMasterySignals(         │
                                                   │      allNodes (content, MECHANIC │
                                                   │        + autoDetect only),       │
                                                   │      signals,                    │
                                                   │      existingProgressNodeIds)    │
                                                   │      — PURE FUNCTION             │
                                                   └───────────────┬───────────────────┘
                                                                    │ candidate nodeIds
                                                                    ▼
                                                   ┌─────────────────────────────────┐
                                                   │ upsert nodeProgress rows          │
                                                   │  source:"auto" (server-stamped)   │
                                                   │  masteryState:"in-progress"       │
                                                   │  patchId: CURRENT_PATCH.id        │
                                                   └─────────────────────────────────┘
```

### Recommended Project Structure
```
src/
├── server/
│   └── w3champions.ts          # syncW3champions server fn (mirrors quiz.ts shape)
├── lib/
│   ├── w3champions-client.ts   # fetch wrapper + error-bucket classifier (pure-ish, testable)
│   ├── mmr-tiers.ts            # TIER_IDS registry + tierForMmr() — mirrors patches.ts pattern
│   ├── detect-mastery-signals.ts  # pure detectMasterySignals() — zero I/O
│   └── w3champions-keys.ts     # TanStack query-key factory, mirrors progress-keys.ts
├── db/
│   └── schema.ts               # + w3championsSync table
├── schemas/
│   └── node.ts                 # + AutoDetectCriteriaSchema (discriminated union, mirrors CitationSchema)
├── hooks/
│   └── useSyncW3championsMutation.ts   # mirrors useProgressMutation.ts shape
└── components/
    └── profile/
        └── SyncW3championsButton.tsx    # "Last synced Xm ago" + button (D-11 always-live)
```

### Pattern 1: Content-driven auto-detect criteria (extends NodeFrontmatterSchema)

**What:** A discriminated-union `autoDetect` field on node frontmatter, following the exact same pattern this codebase already uses for `CitationSchema` (`kind: "science" | "creator"`).
**When to use:** Any MECHANIC node the content author wants to be eligible for w3champions auto-advance. Absence = never auto-advances (graceful default, same convention as `quiz` being `.optional()`).
**Example:**
```typescript
// src/schemas/node.ts — mirrors the existing CitationSchema discriminated-union pattern
import { TIER_IDS } from "../lib/mmr-tiers";

const AutoDetectCriteriaSchema = z.discriminatedUnion("signal", [
  z.object({
    signal: z.literal("mmrTier"),
    gte: z.enum(TIER_IDS), // e.g. "gold" — ordinal comparison via TIER_IDS index
  }),
  z.object({
    signal: z.literal("gamesPlayed"),
    gte: z.number().int().positive(),
  }),
]);

// On NodeFrontmatterSchema (via .extend()):
autoDetect: AutoDetectCriteriaSchema.optional(),
```
This MUST be mirrored field-for-field in `content-collections.ts` per the existing PARALLEL-SCHEMA SYNC convention (see `CitationSchema`/`QuizSchema` comments in that file).

### Pattern 2: `mmr-tiers.ts` — a patches.ts-style registry (NOT w3champions League names)

**What:** A small, project-owned ordinal tier scale (`bronze < silver < gold < platinum < diamond < master < grandmaster`) with static MMR cutoffs, exactly mirroring the `src/lib/patches.ts` singleton-registry pattern (private array, public readonly view, lookup helper, exported ID tuple for `z.enum()`).
**When to use:** Any place a coarse "tier" needs deriving from a raw w3champions `mmr` integer.
**Why NOT w3champions' own League names:** live inspection of `LeagueConstellation`/`League.cs` shows league names ("Grand Master", "Master", "Adept", …) are **season-and-gamemode-specific**, fetched via a *separate* `/api/ladder/league-constellation?season=X` call, and their MMR boundaries shift every season. Depending on them would require an extra API call per sync (against D-03's "near-free" bar) and would silently reinterpret old frontmatter thresholds when w3champions redraws league boundaries next season. A static, project-owned scale is a deep module: one file to recalibrate (using the real `/api/w3c-stats/mmr-distribution` endpoint — see Code Examples — as an occasional calibration tool), no migration needed elsewhere.
**Example:**
```typescript
// src/lib/mmr-tiers.ts — mirrors src/lib/patches.ts structure exactly
export interface TierEntry {
  readonly id: string;
  readonly order: number;
  readonly minMmr: number; // inclusive lower bound, 1v1 solo MMR
}

// [ASSUMED] — round-number defaults; recalibrate later against
// GET /api/w3c-stats/mmr-distribution?season=N&gateWay=Europe&gameMode=GM_1v1
const _TIERS = [
  { id: "bronze",     order: 0, minMmr: 0 },
  { id: "silver",     order: 1, minMmr: 1000 },
  { id: "gold",       order: 2, minMmr: 1200 },
  { id: "platinum",   order: 3, minMmr: 1400 },
  { id: "diamond",    order: 4, minMmr: 1600 },
  { id: "master",     order: 5, minMmr: 1800 },
  { id: "grandmaster",order: 6, minMmr: 2000 },
] as const satisfies readonly TierEntry[];

export const TIER_IDS: [string, ...string[]] = _TIERS.map((t) => t.id) as [string, ...string[]];

export function tierForMmr(mmr: number): string {
  // _TIERS is ascending by minMmr — find the highest tier the mmr qualifies for.
  return [..._TIERS].reverse().find((t) => mmr >= t.minMmr)!.id;
}

export function tierIndex(id: string): number {
  return _TIERS.findIndex((t) => t.id === id);
}
```

### Pattern 3: `detectMasterySignals()` — pure, unit-testable deep module

**What:** Zero-I/O function: nodes + signals + existing-progress-ids in, candidate node IDs out.
**When to use:** Called once per sync, inside `syncW3championsHandler`, after fetching fresh (or cached) signals and loading the principal's current progress.
**Example:**
```typescript
// src/lib/detect-mastery-signals.ts
import { tierIndex } from "./mmr-tiers";

export interface AutoDetectableNode {
  id: string;
  nodeType: "MECHANIC" | "CONCEPTUAL";
  autoDetect?:
    | { signal: "mmrTier"; gte: string }
    | { signal: "gamesPlayed"; gte: number };
}

export interface W3cSignals {
  /** null = no ranked games this season / unranked (D-10 bucket c) */
  mmrTier: string | null;
  /** career-wide total games played across all seasons (0 if none) */
  gamesPlayed: number;
}

/**
 * Pure function (AUTO-03 structural guarantee, D-04/D-05/D-06):
 *   - Only nodeType === "MECHANIC" nodes are ever considered.
 *   - Only nodes with NO existing progress row are considered (D-05 untouched-only).
 *   - No I/O — the caller (server fn) is responsible for fetch + persistence.
 */
export function detectMasterySignals(
  nodes: AutoDetectableNode[],
  signals: W3cSignals,
  existingProgressNodeIds: ReadonlySet<string>
): { nodeId: string }[] {
  return nodes
    .filter((n) => n.nodeType === "MECHANIC")
    .filter((n) => n.autoDetect !== undefined)
    .filter((n) => !existingProgressNodeIds.has(n.id))
    .filter((n) => meetsThreshold(n.autoDetect!, signals))
    .map((n) => ({ nodeId: n.id }));
}

function meetsThreshold(
  criteria: NonNullable<AutoDetectableNode["autoDetect"]>,
  signals: W3cSignals
): boolean {
  if (criteria.signal === "gamesPlayed") {
    return signals.gamesPlayed >= criteria.gte;
  }
  // signal === "mmrTier"
  if (signals.mmrTier === null) return false;
  return tierIndex(signals.mmrTier) >= tierIndex(criteria.gte);
}
```

### Pattern 4: Server fn shape — mirrors `recordQuizPassHandler` exactly

**What:** `syncW3championsHandler` follows the identical authorization + server-stamping contract as `src/server/quiz.ts`.
**Example:**
```typescript
// src/server/w3champions.ts (sketch — planner fills in exact upsert SQL)
export async function syncW3championsHandler({ context }: AuthedContext) {
  const { principal } = context; // { id, battleTag, gateway }

  const cached = await db.query.w3championsSync.findFirst({
    where: eq(w3championsSync.userId, principal.id),
  });
  const withinTtl = cached && Date.now() - cached.lastSyncedAt.getTime() < SYNC_TTL_MS;

  const { signals, status } = withinTtl
    ? { signals: cached, status: "cached" as const }
    : await fetchAndClassify(principal.battleTag, principal.gateway); // native fetch + 3-bucket classifier

  if (!withinTtl && status === "ok") {
    await db.insert(w3championsSync).values({ userId: principal.id, ...signals, lastSyncedAt: new Date() })
      .onConflictDoUpdate({ target: w3championsSync.userId, set: { ...signals, lastSyncedAt: sql`now()` } });
  }

  if (status !== "ok") return { status, advanced: [] }; // D-10 buckets surface to UI; manual tracking unaffected (AUTO-05)

  const existing = await db.query.nodeProgress.findMany({ where: eq(nodeProgress.userId, principal.id) });
  const candidates = detectMasterySignals(
    allNodes.map((n) => ({ id: n.id, nodeType: n.nodeType, autoDetect: n.autoDetect })),
    signals,
    new Set(existing.map((r) => r.nodeId))
  );

  for (const { nodeId } of candidates) {
    await db.insert(nodeProgress).values({
      id: crypto.randomUUID(), userId: principal.id, nodeId,
      masteryState: "in-progress", // D-04: ceiling
      source: "auto",              // server-stamped, never from data
      patchId: CURRENT_PATCH.id,
    }); // no onConflictDoUpdate target needed — D-05 guarantees these nodeIds have no existing row
  }

  return { status: "ok" as const, advanced: candidates.map((c) => c.nodeId) };
}
```

### Anti-Patterns to Avoid
- **Fetching `league-constellation` on every sync to resolve a "tier" name:** unnecessary extra API call, season-fragile. Use the static `mmr-tiers.ts` registry (Pattern 2) instead.
- **Treating an empty array / all-zero response as an error:** confirmed live — this is HTTP 200, the normal "no ranked games yet" case (D-10c). Only a 404 (BattleTag never seen by the identity service) or network failure/timeout is an actual error bucket.
- **Trusting `staleTime` alone for the TTL gate:** a second browser tab or a different device would bypass a client-only cache. The DB row is the authoritative gate; `staleTime` is a same-tab optimization only.
- **Using `onConflictDoUpdate` for the auto-write path:** unlike `setNodeMastery`/`recordQuizPass` (which intentionally overwrite), the auto path must NEVER touch an existing row (D-05) — a plain `insert` is correct here since `detectMasterySignals` already filtered to untouched-only nodes; a conflict should not occur, but consider a defensive `onConflictDoNothing()` rather than `onConflictDoUpdate()` if concurrent-write safety is a concern.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTTP client with retry/backoff for w3champions | Custom retry wrapper library | Plain `fetch` + one `try/catch` + status-code switch | This is a single user-triggered GET, not a polling client — retry/backoff logic adds complexity for a case (D-10) that already degrades to "try again later" messaging, not silent retry. |
| Rate-limit token bucket on the client | Custom leaky-bucket / token-bucket implementation | The DB-row TTL gate (Pattern in Architecture) | The server never calls w3champions more than once per TTL window per user by construction — no client-side rate limiting is needed because the gate is unconditional (button always live, D-11, but the fetch itself is skipped inside the TTL). |
| MMR-tier ordinal comparison | Ad-hoc string comparison / hardcoded if-chains scattered across `detectMasterySignals` | `mmr-tiers.ts` registry + `tierIndex()` helper (Pattern 2) | Centralizes the ordering in one place (matches `patches.ts` precedent) — adding a tier or recalibrating a boundary is a one-file change, not a scan of every threshold comparison. |
| BattleTag URL-encoding for the `#discriminator` | Manual string replace | `encodeURIComponent(battleTag)` | The `#` in a BattleTag (`Name#1234`) must be percent-encoded in the URL path segment — verified live (`Fury%2321156` = `Fury#21156`); a raw `#` truncates the URL at the fragment. |

**Key insight:** The entire integration is small enough that the temptation is to over-build (custom HTTP client, client-side rate limiter, dynamic league-name tiers). Every one of those additions either duplicates something the DB-TTL gate already provides, or reintroduces a season-fragile dependency this research found evidence to avoid.

## Common Pitfalls

### Pitfall 1: Treating "empty response" as a sync failure
**What goes wrong:** A player who signed in via Battle.net but has never played a ranked WC3 game gets `[]` from `/game-mode-stats` and all-zero `winLosses` from `/api/players/{battleTag}` — both HTTP 200. If the sync handler's success check is `data.length > 0` rather than `response.ok`, this is misclassified as an error.
**Why it happens:** Intuitively "no data" feels like "something went wrong," especially coming from other APIs that 404 on empty results.
**How to avoid:** Classify strictly by HTTP status code first (200 = success regardless of payload emptiness), then interpret an empty/zero payload as bucket (c) — "no ladder data found for your BattleTag — play some ranked games" (D-10c). This is verified from `PlayerRepository.LoadGameModeStatPerGateway` (a plain Mongo query returning `[]` when nothing matches — no special-casing on the server side either).
**Warning signs:** New-player test accounts always show the D-10a "unreachable" error instead of the reassuring D-10c message.

### Pitfall 2: `battleTag` never resolved by w3champions ("never played on WC3") vs. "temporarily unranked"
**What goes wrong:** `GET /api/players/{battleTag}` calls `IBattleTagResolver.ResolveCanonical()`, which delegates to w3champions' own identity service. If that BattleTag has genuinely never touched w3champions (e.g., a Battle.net account that plays only via Blizzard's official client, never through the w3champions matchmaking client), this returns `null` → **404**, a real "not found," distinct from "found but no games."
**Why it happens:** Two different failure surfaces look similar from the outside (both "no MMR data"), but only one is an actual 404.
**How to avoid:** A 404 on the base `/api/players/{battleTag}` call should also map to D-10c ("no ladder data found for your BattleTag") — from the end user's perspective both cases mean "you haven't played on w3champions yet," and the messaging in CONTEXT.md D-10c ("play some ranked games") is correct for both. Do NOT surface a 404 as D-10a (unreachable) — that would incorrectly suggest a server problem.
**Warning signs:** Confusing/contradictory error copy for brand-new accounts (e.g. "w3champions is unreachable" for someone who obviously CAN reach the internet).

### Pitfall 3: `#` in BattleTag breaking the request URL
**What goes wrong:** `fetch(`.../api/players/${battleTag}`)` with a raw `Name#1234` truncates the request at the fragment — the server never sees the discriminator.
**Why it happens:** `#` is a URL fragment delimiter; `fetch`/`URL` do not automatically encode it when interpolated into a path.
**How to avoid:** Always `encodeURIComponent(battleTag)` (or the discriminator portion) before building the request URL. Verified live: `Fury%2321156` round-trips correctly; a raw `Fury#21156` would not reach the server as intended.
**Warning signs:** Every sync returns 404 even for BattleTags known to have ladder history.

### Pitfall 4: Gateway enum mismatch (`kr` has no w3champions equivalent)
**What goes wrong:** w3champions' `GateWay` C# enum has exactly three values: `Undefined = 0`, `America = 10`, `Europe = 20` — confirmed by reading `W3C.Contracts/Matchmaking/GateWay.cs`. The project's `users.gateway` column (ADR 008) stores `"us" | "eu" | "kr"`. There is no `Korea`/`Asia` gateway to map `kr` onto.
**Why it happens:** Battle.net's global account model doesn't require players to disclose which matchmaking pool they actually queue in; ADR 008 captured region as a UI-selector best-effort, independent of what w3champions itself models.
**How to avoid:** `[ASSUMED — needs human confirmation]` Map `kr → GateWay.America` (WC3's Asian competitive playerbase has historically clustered on the America gateway for latency/population reasons). If wrong, the practical failure mode is graceful: the sync returns an empty/unranked result for that gateway, which degrades into D-10c ("no ladder data found") rather than crashing or showing a misleading tier. Document this mapping in one place (the fetch client, Pattern 4) so it's a one-line change if evidence later contradicts the assumption.
**Warning signs:** KR-region users always see "no ladder data found" even when they actively ladder.

### Pitfall 5: Confusing w3champions' dynamic League names with the project's own `mmrTier` vocabulary
**What goes wrong:** w3champions' real league names for the current season (verified live via `/api/ladder/league-constellation?season=24`) are "Grand Master", "Master", "Adept" (repeated across multiple divisions), etc. — NOT the "bronze/silver/gold" vocabulary CONTEXT.md's D-02 example uses. If a developer naively tries to match frontmatter `gte: "gold"` against the API's `leagueId`/league name field, it will never match (there is no "gold" league).
**Why it happens:** CONTEXT.md's example is illustrative, using familiar competitive-gaming tier language; the real API uses its own season-specific naming.
**How to avoid:** Do not consume w3champions' `leagueId`/league name at all for this feature. Derive `mmrTier` purely from the raw `mmr` integer (`PlayerGameModeStatPerGateway.mmr`, verified present in the live response) via the project-owned `mmr-tiers.ts` registry (Pattern 2). This also avoids an extra `/league-constellation` API call.
**Warning signs:** `detectMasterySignals` never fires for any player regardless of skill, because the tier-matching logic is comparing against the wrong vocabulary.

### Pitfall 6: Race W/L endpoint (`race-stats`) looks like "matchup W/L" but isn't
**What goes wrong:** `GET /api/players/{battleTag}/race-stats?gateWay=X&season=Y` returns per-race win/loss (e.g. "as Undead: 3W-2L") — this is cheap and available in the same tier as `game-mode-stats`. It is tempting to read this as satisfying the roadmap's "matchup W/L trends" language and build it into v1.
**Why it happens:** The word "matchup" is ambiguous; race-vs-overall-record superficially resembles a matchup stat.
**How to avoid:** True per-opponent-race matchup data (the RACE-*/ADET-* deferred v2 feature) lives in `/api/player-stats/{battleTag}/race-on-map-versus-race` — a genuinely separate, heavier endpoint (different controller, different service, per-map aggregation). `race-stats` (per-race-only) was NOT what D-03 deferred by name, but building on it now would still require new criteria shapes (D-02 is single signal+threshold; "as-race W/L" doesn't cleanly reduce to that without picking one race per node) and starts building matchup-adjacent code paths the roadmap explicitly deferred. Stick to MMR tier + games volume only, per D-03's resolution above.
**Warning signs:** Scope creep — a task appears in the plan that touches `race-stats` or per-race criteria.

## Code Examples

### Live-verified request/response pairs (2026-07-01, `website-backend.w3champions.com`)

```
# Career-wide games-played volume (no season param — all-time, all seasons)
GET https://website-backend.w3champions.com/api/players/Happy%2317228
→ 200 OK
{
  "battleTag": "Happy#17228",
  "name": "Happy",
  "participatedInSeasons": [{"id":24},{"id":20},{"id":19},{"id":18},{"id":16},{"id":15},{"id":14}],
  "winLosses": [
    {"race":1,"wins":0,"losses":0,"games":0,"winrate":0},
    {"race":2,"wins":0,"losses":0,"games":0,"winrate":0},
    {"race":4,"wins":0,"losses":0,"games":0,"winrate":0},
    {"race":8,"wins":151,"losses":157,"games":308,"winrate":0.4902597402597403},
    {"race":0,"wins":0,"losses":0,"games":0,"winrate":0}
  ],
  "playerAkaData": {"id":0,"name":null,"main_race":null,"country":null,"liquipedia":null}
}
# gamesPlayed volume = sum of winLosses[].games = 308 (career, all seasons/gateways combined)
```

```
# Current-season MMR (per race + game mode), sorted by ranking points desc
GET https://website-backend.w3champions.com/api/players/Happy%2317228/game-mode-stats?gateWay=Europe&season=24
→ 200 OK
[{
  "race":8,"gameMode":1,"gateWay":20,
  "playerIds":[{"name":"Happy","battleTag":"Happy#17228"}],
  "season":24,"id":"24_Happy#17228@20_GM_1v1_UD",
  "mmr":1453,"rankingPoints":24.6,"rank":27,
  "leagueId":36,"leagueOrder":4,"division":11,"quantile":0.746,
  "rankingPointsProgress":{"rankingPoints":0,"mmr":0},
  "wins":3,"losses":2,"games":5,"winrate":0.6
}]
# mmrTier = tierForMmr(1453) via the project's own registry — NOT leagueId/leagueOrder.
```

```
# Unknown / never-onboarded BattleTag
GET https://website-backend.w3champions.com/api/players/Fury%2321156
→ 404 Not Found
"Player Fury#21156 not found."
```

```
# Unranked / no games this season+gateway (the common "new player" case)
GET https://website-backend.w3champions.com/api/players/{someKnownButUnranked}/game-mode-stats?gateWay=Europe&season=24
→ 200 OK
[]
```

```
# Resolve the current season id (cache this with a long TTL — seasons change every ~2-3 months)
GET https://website-backend.w3champions.com/api/ladder/seasons
→ 200 OK
[{"id":25},{"id":24},{"id":23}, ...]   # descending; first element = current season
```

```
# Calibration tool for mmr-tiers.ts boundaries (NOT called at sync time — occasional dev/content-author use)
GET https://website-backend.w3champions.com/api/w3c-stats/mmr-distribution?season=25&gateWay=Europe&gameMode=GM_1v1
→ 200 OK
{"top2PercentIndex":26,"top5PercentIndex":35,"top10PercentIndex":42,"top25PercentIndex":52,"top50PercentIndex":60,
 "distributedMmrs":[{"mmr":2766,"count":4}, {"mmr":2741,"count":7}, ...]}
```

### Source: `w3champions/website-backend` GitHub (verified 2026-07-01)
- `PlayersController.cs` — `GET /api/players/{battleTag}` returns `NotFound($"Player {battleTag} not found.")` when `IBattleTagResolver.ResolveCanonical()` returns null; otherwise `Ok(player)` with a `PlayerOverallStats.Create(battleTag)` default (all-zero) if no readmodel row exists yet.
- `BattleTagResolver.cs` — 5-minute in-memory cache on canonical-BattleTag resolution (server-side, not relevant to this project's own TTL).
- `RateLimitAttribute.cs` — on a lease-acquisition failure, sets `context.Result = new StatusCodeResult(StatusCodes.Status429TooManyRequests)` — **no `Retry-After` or other rate-limit header is set**.
- `RateLimitBucketService.cs` — sliding-window limiter (`System.Threading.RateLimiting`), configurable per-attribute `HourlyLimit`/`DailyLimit`; **only applied via `[ReplayRateLimit(...)]` on the two replay-download endpoints** (`ReplaysController.cs`) — confirmed by grepping every `*Controller.cs` in the repo for `[RateLimit`/`[ReplayRateLimit` usage.

## State of the Art

Not deeply applicable — this is an integration against a single, small community API with no meaningfully "old vs. new" approach to contrast. One relevant note:

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| Hardcode w3champions league names as the project's skill-tier vocabulary | Project-owned `mmr-tiers.ts` registry keyed on raw MMR | This research (2026-07-01) | Decouples node-frontmatter thresholds from w3champions' season-specific league naming/boundaries — avoids a silent-reinterpretation bug every new season. |

**Deprecated/outdated:** N/A — no deprecated approach identified for this domain within this codebase's history (this is the first w3champions integration).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `kr` gateway maps to w3champions `GateWay.America` | Pitfall 4 | KR-region users may get "no ladder data" when they actually have data on a different (unmodeled) gateway. Low severity — degrades gracefully to D-10c messaging, never crashes or shows wrong data as right. |
| A2 | Recommended DB TTL = 15 minutes, TanStack `staleTime` = 15 minutes (matching) | Summary / Common Pitfalls / Architecture | No documented rate limit exists for player-stat endpoints (verified — only replay endpoints are code-rate-limited), so this is a respectful-default guess, not a measured requirement. If too short: negligible risk (user-triggered, not polling). If too long: users mid-ladder-session see stale "showing recent data" messaging sooner than ideal — cosmetic only, not a correctness bug. |
| A3 | Static MMR-tier cutoffs in `mmr-tiers.ts` (bronze=0, silver=1000, gold=1200, platinum=1400, diamond=1600, master=1800, grandmaster=2000) | Pattern 2 | These are round-number placeholders, not calibrated against the real distribution (the `/api/w3c-stats/mmr-distribution` endpoint that WOULD calibrate them was found and documented, but not fully queried/analyzed in this research pass). Risk: tier boundaries may over- or under-qualify players relative to the intended "coarse" difficulty framing. Low severity — D-04 already caps auto-detect at `in-progress`, and node authors can retune the registry without a migration. |
| A4 | `gamesPlayed` volume should be sourced from the career-wide `/api/players/{battleTag}` endpoint (all seasons, all gateways combined) rather than a single season+gateway | Code Examples / Architecture | If the intended signal is "recent activity" rather than "career total," career-wide games would over-credit a returning veteran with an old high game count and under-detect someone freshly active this season. This is a product-framing question, not an API limitation — either source is available; the planner/CONTEXT should confirm intent. |

**If this table is empty:** N/A — see entries above; all four should be confirmed or explicitly accepted before/during planning.

## Open Questions

1. **Exact MMR-tier cutoffs for `mmr-tiers.ts`**
   - What we know: The real live MMR distribution endpoint (`/api/w3c-stats/mmr-distribution`) exists and returns percentile indices (top2%/5%/10%/25%/50%) against a sorted MMR array — this is real calibration data.
   - What's unclear: This research did not fully walk the returned `distributedMmrs` array to derive final numeric cutoffs (time-boxed); A3 above uses round-number placeholders instead.
   - Recommendation: Either (a) have the planner task a small calibration step using this exact endpoint before authoring `mmr-tiers.ts`'s real values, or (b) ship the round-number placeholders and treat tier calibration as a post-launch content-tuning pass (low risk per A3, D-04 already caps the blast radius).

2. **`gamesPlayed` signal scope: career-wide vs. current-season**
   - What we know: Both are available from different endpoints at no extra cost (A4).
   - What's unclear: CONTEXT.md doesn't specify which framing is intended; "games-played volume" reads naturally as career-wide but could also mean "recently active."
   - Recommendation: Default to career-wide (`/api/players/{battleTag}` sum of `winLosses[].games`) — it requires no season-resolution step, is simpler, and matches the plain-English "games-played volume" framing best. Flag for the planner to confirm with the user if this matters to the intended UX ("you've played N games" vs. "you've played N games this season").

3. **Current-season resolution caching strategy**
   - What we know: `/api/ladder/seasons` returns the descending season list; seasons change infrequently (every ~2-3 months based on the numbering pattern observed: season 25 is current as of this research, season 24 one prior).
   - What's unclear: Whether to cache the current-season id in a long-TTL in-memory/DB cache, refetch it once per sync (cheap, always correct), or maintain a manually-updated constant analogous to `patches.ts`.
   - Recommendation: Refetch once per sync (it's a tiny, unauthenticated GET, no meaningful cost) rather than adding a second caching layer — simplicity over premature optimization, consistent with "coarse" framing.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `website-backend.w3champions.com` (public HTTPS) | All of AUTO-01..05 | Confirmed reachable via live `curl` during this research session | N/A (community-run service, no version pinning) | AUTO-05 (manual tracking) is the designed fallback if the service is ever unreachable — no code-level fallback needed beyond D-10a error messaging. |
| Node.js `fetch` (Vercel serverless runtime) | HTTP client for the sync server fn | ✓ (Node 20+ ships global `fetch`) | native | — |
| Neon PostgreSQL (existing) | New `w3championsSync` table | ✓ (already provisioned, Phase 4) | — | — |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** the w3champions service itself has no SLA/uptime guarantee (community project) — D-10a error messaging + AUTO-05's "manual tracking always works" is the designed, already-planned fallback.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (existing, `vitest.config.ts`) |
| Config file | `/home/eirikmo/projects/wc3roadmap/vitest.config.ts` |
| Quick run command | `npx vitest run src/lib/detect-mastery-signals.test.ts src/lib/mmr-tiers.test.ts` |
| Full suite command | `npm test` (`vitest run`) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTO-03 | `detectMasterySignals` only emits for `nodeType === "MECHANIC"` | unit | `vitest run src/lib/detect-mastery-signals.test.ts -t "CONCEPTUAL"` | ❌ Wave 0 |
| D-05 | Auto-detect never emits for a node with an existing progress row | unit | `vitest run src/lib/detect-mastery-signals.test.ts -t "untouched"` | ❌ Wave 0 |
| D-06 | Auto-detect is monotonic — a later sync with a lower/no signal never removes a prior auto-advance (verified at the server-fn level: no `onConflictDoUpdate` path exists for auto writes) | unit | `vitest run src/server/w3champions.test.ts -t "monotonic"` | ❌ Wave 0 |
| D-04 | Auto write never sets `masteryState: "mastered"` | unit | `vitest run src/server/w3champions.test.ts -t "ceiling"` | ❌ Wave 0 |
| D-10 | Status-code → bucket classifier maps 404/empty/network-error/429 correctly | unit | `vitest run src/lib/w3champions-client.test.ts` | ❌ Wave 0 |
| AUTO-04 | Two syncs within TTL make exactly one upstream `fetch` call | unit (mocked fetch + DB) | `vitest run src/server/w3champions.test.ts -t "TTL"` | ❌ Wave 0 |
| Auth (ADR 007) | `syncW3championsHandler` is principal-keyed — no `userId` client-input channel | unit | `vitest run src/server/w3champions.test.ts -t "authorization"` | ❌ Wave 0 (mirror the existing `src/server/quiz.test.ts` cross-user pattern) |
| Mmr tier ordinal | `tierIndex`/`tierForMmr` correctly order all tiers | unit | `vitest run src/lib/mmr-tiers.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `vitest run <touched test file>`
- **Per wave merge:** `npm test` (full suite)
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/lib/detect-mastery-signals.test.ts` — covers AUTO-03, D-05
- [ ] `src/lib/mmr-tiers.test.ts` — covers tier ordering/lookup correctness
- [ ] `src/lib/w3champions-client.test.ts` — covers D-10 status→bucket classifier (mock `fetch`, assert bucket for 200/[]/404/network-throw/429)
- [ ] `src/server/w3champions.test.ts` — covers D-04, D-06, AUTO-04 (TTL), authorization (mirrors `src/server/quiz.test.ts` / `src/server/progress.test.ts` patterns already in the repo — no new test infra needed, same `vi.doMock`/`resetModules` conventions apply per prior-phase STATE.md decision)
- No framework install needed — Vitest already configured and used identically by every prior phase's server-fn tests.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Reuses existing `authMiddleware` (ADR 007) — sync endpoint is unreachable without a valid session, identical to `quiz.ts`/`progress.ts`. |
| V3 Session Management | no (unchanged) | No new session logic — session handling is entirely Phase 4's existing `better-auth` config. |
| V4 Access Control | yes | Principal-keyed by construction (no `userId` input channel) — same IDOR-impossible pattern as every existing server fn in this codebase. The w3champions BattleTag/gateway used for the outbound fetch come exclusively from `context.principal`, never from request body. |
| V5 Input Validation | yes | Zod validates any parsed w3champions JSON response before use (defense against an unexpected/malformed upstream shape) and validates the new `autoDetect` frontmatter field at content-build time. |
| V6 Cryptography | no | No new cryptographic material — the w3champions endpoints used require no API token/auth header (verified live: no `Authorization` header sent, none required). |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| SSRF via a client-controlled BattleTag/URL | Tampering | Not applicable here — the BattleTag is server-read from `context.principal.battleTag` (never client input to this endpoint), and the base URL (`website-backend.w3champions.com`) is a hardcoded constant, not client-configurable. |
| Cache-poisoning via a forged sync response | Tampering | The DB cache row is written server-side only, keyed by `principal.id`, after the server itself validated the fetched JSON with Zod — a malicious client cannot write into another user's `w3championsSync` row (same IDOR-impossible-by-construction pattern as `nodeProgress`). |
| Denial-of-wallet / cost amplification via repeated sync-spam | Denial of Service | Mitigated by the DB-row TTL gate (this research's core deliverable) — even with the button "always live" (D-11), the server skips the outbound fetch entirely within the TTL window, bounding upstream call volume to once per TTL per user regardless of click frequency. |
| Information disclosure via error messages | Information Disclosure | D-10's three user-facing messages are intentionally generic/non-technical ("unreachable," "showing recent data," "no ladder data found") — no raw upstream error text, stack traces, or status codes should be surfaced to the client verbatim. |

## Sources

### Primary (HIGH confidence — verified via GitHub source inspection + live HTTP requests, 2026-07-01)
- [github.com/w3champions/website-backend](https://github.com/w3champions/website-backend) — `PlayersController.cs`, `PlayerOverallStats.cs`, `PlayerGameModeStatPerGateway.cs`, `GameModeStatQueryHandler.cs`, `BattleTagResolver.cs`, `PlayerRepository.cs`, `PlayerStatsController.cs`, `LadderController.cs`, `League.cs`/`LeagueConstellation.cs`, `W3CStatsController.cs`, `RateLimitAttribute.cs`, `RateLimitBucketService.cs`, `ReplaysController.cs`, `W3C.Contracts/Matchmaking/GateWay.cs`, `W3C.Contracts/Matchmaking/GameMode.cs`, `W3C.Domain/CommonValueObjects/WinLoss.cs`/`RaceWinLoss.cs` — all fetched and read directly via `gh api repos/w3champions/website-backend/contents/...` during this session.
- Live HTTP requests to `https://website-backend.w3champions.com/api/...` — `GET /api/players/{battleTag}`, `GET /api/players/{battleTag}/game-mode-stats`, `GET /api/players/{battleTag}/race-stats`, `GET /api/players/global-search`, `GET /api/ladder/seasons`, `GET /api/ladder/league-constellation`, `GET /api/w3c-stats/mmr-distribution` — all exercised live with real BattleTags (`Happy#17228`) and a real unknown BattleTag (`Fury#21156`) during this session; status codes and response bodies quoted verbatim in Code Examples above.
- This project's own codebase (`src/server/quiz.ts`, `src/server/progress.ts`, `src/server/user-profile.ts`, `src/lib/auth-middleware.ts`, `src/db/schema.ts`, `src/schemas/node.ts`, `src/schemas/progress.ts`, `src/lib/progress-keys.ts`, `src/lib/db.ts`, `src/lib/patches.ts`, `content-collections.ts`, `src/components/graph/MasteryBadge.tsx`, `src/components/graph/GraphNode.tsx`, `src/hooks/useProgressMutation.ts`) and `docs/adr/008-betterauth-battlenet-integration.md` — all read directly, exact signatures/patterns quoted above.

### Secondary (MEDIUM confidence)
- General w3champions GitHub organization structure (`w3champions/identification-service`, `w3champions/website`) — surfaced via WebSearch, used only for orientation, not for any factual claim above.

### Tertiary (LOW confidence)
- None used as a basis for any claim above — every factual claim about the w3champions API in this document is either `[VERIFIED: GitHub source + live HTTP request]` or explicitly logged in the Assumptions Log as `[ASSUMED]`.

## Metadata

**Confidence breakdown:**
- API shape / endpoints / error semantics: HIGH — verified against both the actual source code and live HTTP responses, the strongest possible evidence for an undocumented community API.
- Rate-limit reality: HIGH (no application-layer limit exists on player-stat endpoints, verified by exhaustive grep of every controller) / LOW (whether an *infrastructure*-level limit — e.g. Cloudflare, reverse proxy — exists is genuinely unknown; no way to verify without a load test, which would be irresponsible to run against a community service).
- Recommended TTL value: MEDIUM — a reasoned, conservative default, not a measured requirement (logged as A2).
- MMR tier cutoffs: LOW — round-number placeholders pending real calibration against the found-but-not-fully-analyzed distribution endpoint (logged as A3).
- Architecture / code patterns: HIGH — every pattern recommended directly mirrors an existing, working pattern already in this codebase (Phase 5/6 precedent), not a novel design.

**Research date:** 2026-07-01
**Valid until:** ~30 days for architecture/pattern guidance (stable — mirrors existing codebase conventions); ~7-14 days for the specific live API response shapes and rate-limit-absence finding (community API, no changelog/versioning — recommend a quick live re-check immediately before implementation if more than 2 weeks have passed).
