# CONTEXT.md — WC3 Roadmap Domain Language

> This file is the canonical glossary for the WC3 Learning Roadmap codebase.
> Every later phase appends new terms here. Terms defined below are the
> project's **ubiquitous domain language** — use them exactly in code,
> comments, PRs, and documentation.
>
> Last updated: Phase 05

---

## Foundational Principle

**One `.mdx` file fully describes one node** (D-01). Structured metadata lives
in the frontmatter (Zod-validated). Learning prose and the required
"## How to Apply" section live in the MDX body. There is no separate edges
file — prerequisites are declared directly on each node.

---

## Core Terms

### node

The atomic unit of the learning graph. Each node represents a single WC3 /
RTS learning concept or mechanic that a player can study and master. A node is
authored as one `.mdx` file under `content/nodes/`. Its frontmatter is
validated by `NodeFrontmatterSchema`; its MDX body contains the prose.

### nodeType

Classifies what kind of learning a node represents. Two values, locked:

- `MECHANIC` — a concrete, executable game action (e.g., creep-jacking,
  supply block, upkeep timing). Can be practiced and evaluated objectively.
- `CONCEPTUAL` — an abstract principle or mental model (e.g., resource
  denial, macro tempo, risk/reward). Shapes decision-making; harder to
  evaluate directly.

All schemas and graph filters key on `nodeType`. Never invent new values
without a schema migration and ADR.

### skillType

Sub-classification of the cognitive/physical demand a node places on the
player. Three values:

- `macro` — economy, expansion timing, supply management, tech trees.
- `micro` — unit-level mechanical execution: kiting, focus fire, spell
  usage, creep pulling.
- `mental` — game sense, decision trees, composure under pressure, adaptation.

Exists from Phase 1 to support GRAPH-04 filtering (Phase 3) without migration.

### difficulty

Relative learning curve of a node, calibrated to the WC3 community audience.
Three values:

- `beginner` — foundational concept accessible to players with < 50 ladder
  games; mandatory before advancing.
- `intermediate` — requires understanding of the beginner tier; most
  improvement happens here.
- `advanced` — nuanced execution or deep theory; relevant once intermediate
  concepts are solid.

Values are Claude's discretion per D-07. New values require a schema migration.

### race

The WC3 race a node applies to. Five values:

- `agnostic` — universal across all races (default for v1 content).
- `human` — Human-specific strategy or mechanic.
- `orc` — Orc-specific.
- `undead` — Undead-specific.
- `nightelf` — Night Elf-specific.

v1 content defaults to `agnostic`. Race-specific branch content is deferred to
v2 (RACE-01..05). The field exists now to avoid a future migration.

### mastery state

The three-state lifecycle of a player's progress on a node. Three values:

- `untouched` — the player has not engaged with this node.
- `in-progress` — the player has started studying or practicing the node but
  has not yet met the mastery threshold.
- `mastered` — the player has met the `masteryThreshold` criteria for the
  current patch.

Stored in `ProgressRecord.masteryState`. Drives visual state on the graph node
(Phase 2) and staleness alerts when a mastered node's patch context becomes
stale (Phase 9). `in-progress` is the canonical mid-state value end-to-end —
DB column value, Zod enum, code, and user-facing copy all use the same term
(D-03, Phase 5). No value↔label translation layer.

### pathway

A named, ordered sequence of nodes that forms a coherent learning arc — e.g.,
"Core Fundamentals", "Human Expansion Timing". Pathways are overlays on the
graph, not a separate data structure; the graph engine derives them from node
metadata and mastery state. Infrastructure lives in Phase 2; pathway content
authoring is Phase 9.

### signal

A data point used to infer a player's mastery state automatically. Signals
come from external sources: w3champions ladder data (win rate, matchup record,
APM trends). Signal ingestion is Phase 7; the term is defined here so schema
fields are consistent.

### patch

A specific released version of Warcraft III: Reforged, identified by a
`patchId` string (e.g., `"patch-1.36.2"`). Patches are the temporal dimension
of mastery — thresholds, content validity, and progress records are all
patch-tagged. The patch registry (`src/lib/patches.ts`) is the single source
of truth.

### patchId

A kebab-case string identifying a specific WC3 patch, e.g. `"patch-1.36.2"`.
Must reference an entry in the patch registry (`PATCHES` in
`src/lib/patches.ts`). Validated at build time via `PATCH_IDS` as a Zod
`z.enum()` — unknown patch IDs fail the build. All three schemas (node,
masteryThreshold, progressRecord) carry a `patchId` field.

### threshold / masteryThreshold

The criteria a player must meet to transition a node from `learning` to
`mastered` for a given patch. Defined in `MasteryThresholdSchema`. Stored as
`thresholdDefinition: Record<string, unknown>` in Phase 1 — extended in
Phases 7–8 when signal sources are wired. A threshold is patch-tagged because
game balance changes alter what "mastered" looks like.

### citation

A source that backs the learning claim made in a node. Each citation carries:

- `source` — human-readable reference (paper title, creator name, video title).
- `url` — optional link.
- `applicationNote` — **required** — one sentence explaining how this specific
  source is relevant to WC3 play. CI enforces that every citation entry carries
  an `applicationNote` (D-03).

Final citation field structure is finalized in Phase 3. The enforcement hook
(per-citation `applicationNote`) is designed into the Phase 1 schema.

### applicationNote

The per-citation bridge between a scientific or community source and its
concrete WC3 application. Required on every citation. Answers: "How does this
source support the claim that [this node concept] makes you better at WC3?"

### prerequisite

A soft, non-locking dependency between nodes. Declared as a list of node IDs
on each node: `prerequisites: string[]`. These declare a *suggested* learning
order, not a hard lock (DATA-05). Players are never blocked from accessing a
node; the graph engine uses prerequisites to derive edges and draw pathways.

CI validates that every referenced prerequisite ID exists in the node corpus
and that the prerequisite graph is **acyclic** (no cycles). The graph engine
(Phase 2) derives all edges by reading node prerequisites — there is no
separate edges file or table.

### meta_volatile

A boolean flag on a node indicating that its content is likely to become stale
when the WC3 patch changes (e.g., a node about a specific unit's hit points).
Volatile nodes trigger a staleness indicator in Phase 9 when
`CURRENT_PATCH.id !== patchId`. Non-volatile nodes (conceptual principles) are
less patch-sensitive.

### last_reviewed

ISO 8601 date (`YYYY-MM-DD`) recording the last time a node's content was
reviewed and confirmed current against its `patchId`. Used with `meta_volatile`
and `CURRENT_PATCH` to derive staleness (D-06). CI requires this field on
every node.

### patch_context

A short free-text field on a node explaining what, if anything, changed in the
node's content relative to its `patchId`. Required. Answers: "What is
patch-relevant about this node's current content?" CI requires this field on
every node.

---

## Module Vocabulary (codebase-design discipline)

The codebase follows the **deep-module** discipline from
`.agents/skills/codebase-design/SKILL.md`. Key terms:

- **module** — anything with an interface and an implementation (function,
  file, package, or tier slice).
- **interface** — everything a caller must know: type signatures, invariants,
  ordering constraints, error modes.
- **depth** — leverage at the interface: large behaviour behind a small
  interface. The patch registry, content schema, and CI validation layer are
  each designed to be deep.
- **seam** — the location at which a module's interface is placed; where
  behaviour can vary without editing that location.

---

## Graph Engine Terms (Phase 02)

### GraphDisplayNode

The graph engine's typed data contract — a narrow projection of `NodeSummary`
that adds exactly one field: `difficulty` (D-04, ADR 005). Defined in
`src/schemas/graph.ts`. Graph components type their props to
`GraphDisplayNode[]`; importing `NodeFrontmatter` into graph code is
prohibited (ADR 002).

### pathway step

A single node ID entry in a `Pathway.steps[]` array. Steps are ordered —
the array index represents the suggested traversal sequence. The graph engine
uses the step list to determine which nodes are "in pathway" (full opacity)
vs. "off pathway" (dimmed) at initial load (D-08, D-09).

### ancestor chain / prerequisite-chain highlight

The set of edges and nodes that are direct ancestors of the currently
hovered node, computed via BFS over the prerequisite graph. On hover, the
full ancestor chain is highlighted in rune-gold via animated `motion.path`
strokes (D-03). Implemented in `src/lib/graph-store.ts` (Zustand atom) and
`src/lib/pathway-utils.ts` (BFS computation).

### spotlight

The camera framing applied when the graph first loads — `fitView()` is
called with the pathway's step node IDs, centering the viewport on the
guided pathway and leaving non-pathway nodes visible but off-screen or
de-emphasized (D-08). "Explore full map" exits spotlight mode.

### mastery encoding

The dual visual representation of a node's mastery state: (1) **fill +
glow** — the node face background tints from `obsidian-800` toward
`rune-500` with a CSS box-shadow glow as mastery increases; (2) **status
badge** — a small pill overlay at the top-right corner displaying
"Learning" or "Mastered" text (D-05). Both encodings are driven by the
`masteryState` field on the node's data object at render time.

---

## Identity & Auth Terms (Phase 04)

### principal

The authenticated session user injected by `authMiddleware` into every server
function context. The only trusted identity source in a user-data server
function. Accessed via `context.principal` (type `User`, injected by
`authMiddleware` in `src/lib/auth-middleware.ts`).

Server functions built on `authedServerFn` key every query by
`principal.id` — never by any client-supplied value. This is the enforcement
point for the D-12 authorization contract: cross-user access is impossible
by construction, not by convention.

### session

The better-auth 30-day rolling cookie-backed authentication state (AUTH-02,
D-09/D-10). A session encapsulates the authenticated user and is refreshed
on activity (rolling window). Resolved server-side via
`auth.api.getSession({ headers })` in `authMiddleware`. The session cookie is
always-persistent (no "remember me" toggle) and cached in a signed cookie to
avoid a DB round-trip on every request. Client components read the session
via `useSession()` from `#/lib/auth-client`.

### BattleTag

The canonical `"Name#1234"` Battle.net display identity. The exact key
w3champions queries by when resolving a player's ladder data (D-06). Captured
from the Battle.net OAuth userinfo endpoint (`battletag` field) and stored in
`users.battleTag`. Mutable — can change when a player renames their Battle.net
account. Refreshed on every sign-in via `overrideUserInfo: true` on the
`genericOAuth` config (D-08, `src/lib/auth.ts`). Never used as the progress
key; the stable `account UUID` (`users.id`) is the progress key.

### gateway / region

The Battle.net server region a player signs in through: `"us"` | `"eu"` |
`"kr"`. Captured from a UI region selector before the OAuth redirect (not from
the OAuth userinfo response — Battle.net does not expose region in the userinfo
payload; see RESEARCH.md Pitfall 1). Stored in `users.gateway`. Required by
Phase 7 (w3champions ladder sync) and Phase 8 (replay auto-pull) to resolve a
player to their regional w3champions profile without an additional capture step.

### account UUID

The stable internal identifier for a user, stored as `users.id` (UUID v4,
generated via `crypto.randomUUID()`). The immutable progress key used across
all phases (AUTH-04, D-04). Never changes, even if the player's BattleTag or
gateway changes. All Phase 5 progress records and Phase 7/8 ladder/replay rows
are keyed by this UUID. Distinguished from `bnetSub` (the Battle.net account
sub from OAuth, used for deduplication only, not as the progress key).

---

## Progress & Mastery Terms (Phase 05)

### progress record

One user's mastery state on one node for one patch — the atomic unit of
progress persistence. Stored in the `node_progress` Drizzle table as a single
row, keyed by `users.id` UUID (`userId`) and `nodeId`, with a surrogate text
primary key. Each record carries `masteryState`, `source`, `patchId`,
`createdAt`, and `updatedAt`. At most one record exists per `(userId, nodeId)`
pair (enforced by a unique index; upsert strategy via `onConflictDoUpdate`).

### mastery source

The `source` field on a progress record — how the mastery state was set.
Two values:

- `manual` — the player explicitly chose the state via the mastery controls in
  the node detail panel. Written by every Phase 5 server function.
- `auto` — reserved for Phase 7/8 auto-detection signals (w3champions ladder
  data, replay parsing). Not written in Phase 5.

A `manual` mark can override an `auto` state (D-04). The `source` field is
always stamped server-side; clients cannot influence it — the server function
hardcodes `"manual"` and never reads `source` from the request body.

### local progress

Signed-out mastery state held client-side in `localStorage` under the key
`wc3rm:progress` as a JSON object mapping `nodeId` to `MasteryState`. Local
progress is non-authoritative — it is the unsigned-out player's optimistic
cache. Once the player signs in and the fill-gaps merge runs, local progress is
cleared and the server becomes the sole source of truth (D-08). Local progress
is never sent to the server except during the one-time merge. SSR guards
(`typeof window !== 'undefined'`) are required before every `localStorage`
access.

### merge-on-sign-in

The one-time fill-gaps merge that runs the first time a player signs in to an
existing account (or creates a new account). Behavior:

1. Client sends all `wc3rm:progress` localStorage entries to the
   `mergeProgressOnSignIn` server function (POST via `authedServerFn`).
2. Server inserts records **only for nodes where the account has no existing
   row** — "fill gaps". Nodes where the server already has a record are left
   unchanged (server wins).
3. After successful merge, the client sets the `wc3rm:merged` flag in
   `localStorage` and clears `wc3rm:progress`.
4. TanStack Query invalidates the progress cache; a "Progress synced" toast
   appears if any records were merged.

Guard: both `mergeInitiatedRef` (in-session) and `isAlreadyMerged()` (cross-
reload via `wc3rm:merged` flag) prevent re-running the merge on subsequent
page loads or hot reloads (D-07). No conflict-surfacing UI — server-touched
nodes silently win.

---

## Appendix: Phase-Tracked Additions

| Term | Introduced | Notes |
|------|-----------|-------|
| node | Phase 01 | Core unit |
| nodeType | Phase 01 | MECHANIC \| CONCEPTUAL |
| skillType | Phase 01 | macro \| micro \| mental |
| difficulty | Phase 01 | beginner \| intermediate \| advanced |
| race | Phase 01 | agnostic \| human \| orc \| undead \| nightelf |
| mastery state | Phase 01 | untouched \| learning \| mastered |
| pathway | Phase 01 | Named learning arc; infrastructure in Phase 2 |
| signal | Phase 01 | Mastery data point; ingestion in Phase 7 |
| patch | Phase 01 | WC3 patch version primitive |
| patchId | Phase 01 | Registry-validated kebab-case patch identifier |
| threshold / masteryThreshold | Phase 01 | Mastery criteria per patch |
| citation | Phase 01 | Sourced claim in a node |
| applicationNote | Phase 01 | Per-citation WC3 relevance note |
| prerequisite | Phase 01 | Soft, non-locking node dependency |
| meta_volatile | Phase 01 | Patch-sensitivity flag |
| last_reviewed | Phase 01 | Date content was verified against patchId |
| patch_context | Phase 01 | Patch-relative change note on a node |
| GraphDisplayNode | Phase 02 | Graph projection: NodeSummary + difficulty (ADR 005) |
| pathway step | Phase 02 | Single node ID in Pathway.steps[], ordered traversal |
| ancestor chain / prerequisite-chain highlight | Phase 02 | BFS edge set for hover highlight (D-03) |
| spotlight | Phase 02 | fitView camera framing to pathway nodes on load (D-08) |
| mastery encoding | Phase 02 | fill+glow+badge dual visual representation (D-05) |
| principal | Phase 04 | Session-injected identity; only trusted auth source in server fns (D-11/D-12) |
| session | Phase 04 | better-auth 30-day rolling cookie auth state (AUTH-02, D-09/D-10) |
| BattleTag | Phase 04 | "Name#1234" Battle.net display identity; w3champions key (D-06); refreshed on login |
| gateway / region | Phase 04 | us \| eu \| kr Battle.net server region; persisted for Phase 7/8 (D-05/D-07) |
| account UUID | Phase 04 | Stable users.id UUID v4; immutable progress key (AUTH-04, D-04) |
| progress record | Phase 05 | One user's mastery state on one node for one patch; persisted in node_progress (ADR 009) |
| mastery source | Phase 05 | source field: manual (Phase 5) \| auto (Phase 7/8 reserved); manual overrides auto (D-04) |
| local progress | Phase 05 | Signed-out mastery in localStorage wc3rm:progress; non-authoritative; cleared after merge (D-08) |
| merge-on-sign-in | Phase 05 | One-time fill-gaps merge on first sign-in; server wins; clears localStorage; guarded by wc3rm:merged (D-07) |
