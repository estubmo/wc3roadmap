# Phase 8: Replay Parsing - Pattern Map

**Mapped:** 2026-07-02
**Files analyzed:** 16 (greenfield + modified)
**Analogs found:** 13 / 16

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|-----------------|----------------|
| `src/lib/replay-parser.ts` (w3gjs buffer→ParserOutput wrapper) | utility | transform, file-I/O | `src/lib/w3champions-client.ts` (I/O wrapper, no direct precedent for binary parse) | role-match |
| `src/lib/replay-signals.ts` (pure raw→WC3 events) | utility (pure deep module) | transform | `src/lib/detect-mastery-signals.ts` | exact |
| `src/lib/replay-thresholds.ts` (pure signals+patch→target masteryState) | utility (pure deep module) | transform | `src/lib/detect-mastery-signals.ts` (`meetsThreshold`) | exact |
| `src/lib/mastery-ordinal.ts` (`masteryStateIndex()`) | utility | transform | `src/lib/mmr-tiers.ts` (`tierIndex`/`tierForMmr` ordinal registry) | exact |
| `src/lib/object-id-maps/*.ts` (patch-keyed object-ID maps) | config/utility | CRUD (lookup) | `src/lib/patches.ts` (`_PATCHES` registry + `getPatch`) | exact |
| `src/lib/wc3v/*.js` (vendored analysis modules) | utility (vendored, external) | transform | none — greenfield vendor, no in-repo analog | none |
| `src/server/replay.ts` (`uploadReplay`, `pullReplays` orchestrating write path) | controller (server fn) | request-response + CRUD write | `src/server/w3champions.ts` (`syncW3championsHandler`) | exact |
| `src/server/replay.ts` (`getReplayAnalysis` read) | controller (server fn) | request-response (read) | `src/server/w3champions.ts` (`getW3championsSyncStatusHandler`) / `src/server/progress.ts` (`getUserProgressHandler`) | exact |
| `src/db/schema.ts` (+ `replayAnalysis` table) | model | CRUD | `src/db/schema.ts` (`w3championsSync` table — single/gameId-keyed cache shape) | exact |
| `src/db/schema.ts` (`nodeProgress.source` extend `+replay`) | model | CRUD | existing `nodeProgress` table (D-01 text() column) | exact |
| `src/schemas/progress.ts` (`source` enum extend) | model (schema) | transform (validation) | existing `ProgressRecordSchema` | exact |
| `src/schemas/node.ts` + `content-collections.ts` (replay criteria + object-ID frontmatter) | model (schema, parallel-sync) | transform (validation) | `AutoDetectCriteriaSchema` (discriminated union + parallel-schema-sync note) | exact |
| `src/hooks/useUploadReplayMutation.ts` | hook | request-response (mutation) | `src/hooks/useSyncW3championsMutation.ts` | exact |
| `src/hooks/usePullReplaysMutation.ts` | hook | request-response (mutation) | `src/hooks/useSyncW3championsMutation.ts` | exact |
| `src/routes/replays.tsx` (`/replays` route: uploader + pull CTA + report) | component (route) | request-response, file-I/O (upload) | `src/routes/preview/auto-advance.tsx` (route shape) + `src/components/profile/SyncW3championsButton.tsx` (action/status UI) | role-match |
| `content/nodes/build-order-{human,orc,undead,nightelf}.mdx` (4 new MECHANIC nodes) | config (content) | — | existing `content/nodes/*.mdx` files (any current MECHANIC node with `autoDetect`) | exact |

## Pattern Assignments

### `src/lib/replay-signals.ts` (pure deep module, transform)

**Analog:** `src/lib/detect-mastery-signals.ts`

**Module-header discipline pattern** (lines 1-33 of analog):
```typescript
// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors

/**
 * detectMasterySignals — the pure, zero-I/O auto-detect eligibility function.
 * ...
 * NO I/O: this module imports NOTHING from db, fetch, or auth layers. Its only
 * dependency is the pure ./mmr-tiers ordinal registry.
 */
```
Copy this exact discipline for `replay-signals.ts`: a top JSDoc block stating STRUCTURAL GUARANTEES (D-09 race-agnostic-only signals, D-15 1v1-only filter enforced upstream of this module per Pitfall 7) and a "NO I/O" line naming the only pure dependency it may import (`mastery-ordinal.ts` / object-id-map lookups — never `db`, `fetch`, or `auth-middleware`).

**Pure function shape** (lines 87-98, 106-116 of analog):
```typescript
export function detectMasterySignals(
  nodes: AutoDetectableNode[],
  signals: W3cSignals,
  existingProgressNodeIds: ReadonlySet<string>,
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
  signals: W3cSignals,
): boolean {
  if (criteria.signal === "gamesPlayed") {
    return signals.gamesPlayed >= criteria.gte;
  }
  if (signals.mmrTier === null) return false;
  return tierIndex(signals.mmrTier) >= tierIndex(criteria.gte);
}
```
`deriveReplaySignals(parsed: ParserOutput, player: Player): ReplaySignals` mirrors this filter-chain-then-map shape but the CONTEXT.md D-11 note is critical: **NOT untouched-only** — do not carry over the `!existingProgressNodeIds.has(n.id)` filter into the threshold-detection stage; that filter belongs only in the write path (`replay-thresholds.ts` / `server/replay.ts` orchestration), which then applies monotonic-max (D-04), not additive-only (D-05/D-06 as in auto).

**Type interface pattern for the pure input contract** (lines 45-70 of analog) — copy the "minimal structural subset" convention: `ReplaySignals` interface should only carry the fields the pure function needs, not the full `ParserOutput`/`Player` w3gjs types, exactly as `AutoDetectableNode` is a structural subset of `NodeFrontmatter`.

---

### `src/lib/mastery-ordinal.ts` (`masteryStateIndex()`)

**Analog:** `src/lib/mmr-tiers.ts`

**Ordinal singleton-registry pattern** (lines 43-81):
```typescript
const _TIERS = [
  { id: "bronze", order: 0, minMmr: 0 },
  ...
] as const satisfies readonly TierEntry[];

export const TIERS: readonly TierEntry[] = _TIERS;
export const TIER_IDS: [string, ...string[]] = _TIERS.map((t) => t.id) as [string, ...string[]];

export function tierForMmr(mmr: number): string {
  return [..._TIERS].reverse().find((t) => mmr >= t.minMmr)!.id;
}

export function tierIndex(id: string): number {
  return _TIERS.findIndex((t) => t.id === id);
}
```
`mastery-ordinal.ts` should mirror this exactly: a private `_MASTERY_STATES` array (`untouched`=0, `in-progress`=1, `mastered`=2 — matching `MasteryStateSchema`'s enum order), a public readonly view, and `masteryStateIndex(id): number` via `findIndex`. Per RESEARCH.md Pitfall 5, add an explicit comment linking this file's array order to `src/schemas/progress.ts`'s `MasteryStateSchema` order as the drift-prevention doc, mirroring `mmr-tiers.ts`'s own "WHY NOT w3champions' own League names" doc-comment style.

---

### `src/lib/patches.ts` extension for object-ID maps (D-12)

**Analog:** `src/lib/patches.ts` itself (already has the reserved hook)

**Existing hook** (lines 10-24, 32-35):
```typescript
export interface PatchEntry {
  readonly id: string;
  readonly order: number;
  readonly released: string;
  /**
   * Reserved for Phase 8 replay parsing. Each patch may ship a new replay
   * object-ID map; this field is the version hook for that feature.
   * Do not use before Phase 8.
   */
  readonly objectIdMapVersion: number;
}
const _PATCHES = [
  { id: "patch-1.36.1", order: 0, released: "2022-11-16", objectIdMapVersion: 1 },
  { id: "patch-1.36.2", order: 1, released: "2024-03-15", objectIdMapVersion: 1 },
] as const satisfies readonly PatchEntry[];
```
New `src/lib/object-id-maps/index.ts` should follow the same private-array + public-readonly-view + lookup-function shape as `_PATCHES`/`getPatch()`, keyed by `objectIdMapVersion` (not patch `id` directly) so multiple patches sharing a map version resolve to the same table without duplication.

---

### `src/server/replay.ts` — upload + auto-pull orchestrating write path

**Analog:** `src/server/w3champions.ts` (`syncW3championsHandler`)

**Full orchestration structure to mirror** (lines 96-187): auth via `context.principal` only, TTL/cache gate before any outbound work, pure-detect call, then server-stamped write. Key excerpt — the server-stamped insert values block (lines 172-184):
```typescript
for (const { nodeId } of candidates) {
  await db
    .insert(nodeProgress)
    .values({
      id: crypto.randomUUID(),
      userId: principal.id, // ADR 007: NEVER from data
      nodeId,
      masteryState: "in-progress", // D-04 ceiling — auto NEVER sets "mastered"
      source: "auto", // ADR 009: server-stamped, NEVER from data/upstream
      patchId: CURRENT_PATCH.id, // server-stamped
    })
    .onConflictDoNothing();
}
```
Replay inverts this exact block per D-03/D-04 into the monotonic-max `onConflictDoUpdate` shown below (Pattern 2, RESEARCH.md) — same server-stamping discipline (`userId: principal.id`, `source` hardcoded, `patchId: CURRENT_PATCH.id`), different conflict strategy.

**gameId cache-gate structure** — mirror the TTL-gate shape at lines 99-105:
```typescript
const cached = await db.query.w3championsSync.findFirst({
  where: eq(w3championsSync.userId, principal.id),
});
const withinTtl =
  cached != null && Date.now() - cached.lastSyncedAt.getTime() < SYNC_TTL_MS;
```
Replay's gate is presence-based, not TTL-based: `db.query.replayAnalysis.findFirst({ where: eq(replayAnalysis.gameId, gameId) })` — if found, skip parse entirely and reuse cached signals (D-17 "never re-parsed"), same early-return shape as the `withinTtl` branch.

**Failure-safety / opaque-status return shape** (lines 42-47, 150-154):
```typescript
export type SyncStatus = "ok" | "cached" | "no-data" | "unreachable" | "rate-limited";
...
} else {
  return { status: result.status, advanced: [] };
}
```
Mirror this exactly for replay upload/pull results — an opaque status union, zero writes on failure branches, no upstream error strings surfaced (T-07-06c precedent).

**`createServerFn` lexical-visibility rule (Pitfall 4, MANDATORY):**
```typescript
export const uploadReplay = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: FormData) => data)
  .handler(uploadReplayHandler); // named export — testable without the TanStack runtime
```
No factory/wrapper indirection — exactly as `syncW3champions` and `recordQuizPass` are declared.

---

### `src/server/replay.ts` — monotonic-max write (D-03/D-04)

**Analog:** `src/server/quiz.ts` (`recordQuizPassHandler`'s `onConflictDoUpdate` shape) for the upsert mechanics, combined with RESEARCH.md Pattern 2's `setWhere` guard (not present anywhere else in the codebase — this is the one genuinely new write semantic in the phase).

**Existing onConflictDoUpdate shape to extend** (quiz.ts lines 125-133):
```typescript
await db
  .insert(nodeProgress)
  .values({
    id: crypto.randomUUID(),
    userId: principal.id,
    nodeId,
    masteryState: "mastered",
    source: "quiz",
    patchId: CURRENT_PATCH.id,
  })
  .onConflictDoUpdate({
    target: [nodeProgress.userId, nodeProgress.nodeId],
    set: {
      masteryState: sql`'mastered'`,
      source: sql`'quiz'`,
      patchId: sql`excluded.patch_id`,
      updatedAt: sql`now()`,
    },
  });
```
Replay's write adds a `setWhere` ordinal-comparison clause (RESEARCH.md Pattern 2, verbatim) on top of this exact `onConflictDoUpdate` shape — same `target: [nodeProgress.userId, nodeProgress.nodeId]`, but `set.masteryState`/`set.source` become conditional via the CASE-guarded `setWhere`, not unconditional `sql\`'mastered'\`` literals. Document the CASE ordinal literals' dependency on `mastery-ordinal.ts`/`MasteryStateSchema` at the definition site (Pitfall 5).

---

### `src/lib/w3champions-client.ts` → replay download client extension

**Analog:** `src/lib/w3champions-client.ts` itself (same file, extend or add a sibling function)

**SSRF-guard + native-fetch pattern** (lines 43-44, 167-208):
```typescript
export const W3C_BASE_URL = "https://website-backend.w3champions.com";
...
export async function fetchW3championsSignals(
  battleTag: string,
  gateway: string,
): Promise<W3cSyncResult> {
  const enc = encodeURIComponent(battleTag);
  ...
  try {
    const seasonsRes = await fetch(`${W3C_BASE_URL}/api/ladder/seasons`);
    ...
  } catch {
    return { status: "unreachable" };
  }
}
```
A new `fetchReplayBytes(gameId: string)` function should reuse `W3C_BASE_URL` (hardcoded constant, never client-configurable) and the `encodeURIComponent`-then-interpolate SSRF guard exactly, per RESEARCH.md's own Code Examples section:
```typescript
const res = await fetch(`${W3C_BASE_URL}/api/replays/${encodeURIComponent(gameId)}`);
if (res.status === 429) { /* rate-limited */ }
if (!res.ok) { /* 404 if gameId unresolvable */ }
const buffer = Buffer.from(await res.arrayBuffer());
```

---

### `src/db/schema.ts` — `replayAnalysis` cache table (D-17)

**Analog:** `src/db/schema.ts` `w3championsSync` table (lines 495-542) — closest existing cache-table shape, though keying differs (gameId vs userId).

**Table + unique-index shape to mirror** (lines 495-542):
```typescript
export const w3championsSync = pgTable(
  "w3champions_sync",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    mmrTier: text("mmr_tier"),
    gamesPlayed: integer("games_played").notNull().default(0),
    lastSyncedAt: timestamp("last_synced_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
  },
  (table) => [uniqueIndex("w3c_sync_user_unique").on(table.userId)],
);
```
`replayAnalysis` mirrors the surrogate-text-PK + single-column-unique-index shape but keys the unique index on `gameId` (global cache per D-17, not per-user) instead of `userId`: `uniqueIndex("replay_analysis_gameId_unique").on(table.gameId)`. Store `signals` as `text("signals")` (JSON-stringified, following the project's `text()`-over-structured-column convention seen in `masteryState`/`source`) plus `patchId: text("patch_id").notNull()` and a raw `buildNumber: integer("build_number").notNull()` column (D-12 — both resolved patchId and raw WC3 build number stored per the requirement). Do NOT store raw `.w3g` bytes (RESEARCH.md Anti-Pattern).

**`source` column extension (D-01):** the existing `nodeProgress.source` column (line 324, `text("source").notNull().default("manual")`) needs no DDL change — it is already `text()`, not `pgEnum`, precisely so `"replay"` can be added as a new valid value at the Zod layer only (`src/schemas/progress.ts` line 95: `z.enum(["manual", "auto", "quiz"])` → add `"replay"`).

---

### `src/schemas/node.ts` + `content-collections.ts` — replay criteria frontmatter (D-11/D-12)

**Analog:** `AutoDetectCriteriaSchema` (node.ts lines 226-267) — the exact discriminated-union + parallel-schema-sync pattern to extend/parallel for replay thresholds.

```typescript
// PARALLEL-SCHEMA SYNC NOTE: AutoDetectCriteriaSchema is intentionally defined
// twice:
//   1. Here in src/schemas/node.ts   — runtime/test surface.
//   2. Inline in content-collections.ts — build-time surface.
// Both definitions MUST stay field-for-field identical.
export const AutoDetectCriteriaSchema = z.discriminatedUnion("signal", [
  z.object({ signal: z.literal("mmrTier"), gte: z.enum(TIER_IDS) }),
  z.object({ signal: z.literal("gamesPlayed"), gte: z.number().int().positive() }),
]);
```
A new `ReplayCriteriaSchema` (or extension of `AutoDetectCriteriaSchema`'s discriminant set) should follow this identical discriminated-union + explicit parallel-schema-sync-note convention, defined once in `src/schemas/node.ts` and mirrored inline in `content-collections.ts` (see content-collections.ts's own `citations` field for a live example of the inline-mirror style, lines ~55-75 of that file). Field candidates per D-09/D-10: `{ signal: "buildOrderTiming" | "eapm" | "controlGroupUsage" | "heroTiming" | "expansionTiming", gte: ... }` — keep it a single signal+threshold per node (D-02's "not a compound rule engine" precedent carries over).

---

### `src/hooks/useUploadReplayMutation.ts` / `usePullReplaysMutation.ts`

**Analog:** `src/hooks/useSyncW3championsMutation.ts` (full file)

**Mutation + status-bucket-branching + toast pattern** (lines 63-163) — copy the whole shape: `useMutation` with no signed-out branch (authed-only surface), a `mutateRef` forward-reference for Retry actions, a `switch (result.status)` branching over the opaque status union with per-bucket toast copy, and an `onSettled` that invalidates BOTH the relevant status query key AND `progressKeys.byUser()`:
```typescript
onSettled: () => {
  void queryClient.invalidateQueries({ queryKey: w3championsKeys.syncStatus() });
  void queryClient.invalidateQueries({ queryKey: progressKeys.byUser() });
},
```
For `useUploadReplayMutation`, `mutationFn` takes the FormData (unlike sync's zero-arg call) but the rest of the shape — status-bucket switch, `setRecentlyAdvanced` call on newly-advanced nodes (D-05 pulse), `progressKeys.byUser()` invalidation — is identical. `usePullReplaysMutation` matches `useSyncW3championsMutation` almost exactly (zero-arg principal-keyed call).

**Query-key factory to extend:** `src/lib/w3champions-keys.ts` (full file) — create a sibling `src/lib/replay-keys.ts` with the same `all()`/`byGameId()` tuple-factory shape:
```typescript
export const w3championsKeys = {
  all: () => ["w3champions"] as const,
  syncStatus: () => [...w3championsKeys.all(), "syncStatus"] as const,
} as const;
```

---

### `src/components/profile/SyncW3championsButton.tsx` → `/replays` route UI

**Analog:** `src/components/profile/SyncW3championsButton.tsx` (full file) for the action-button + status-indicator pattern; `src/routes/preview/auto-advance.tsx` for route-file shape (`createFileRoute`, component export).

**Always-live action button pattern** (lines 77-133) — the `DropdownMenuItem` shape doesn't apply directly to a dedicated route, but the **mutation-trigger + `useQuery` status-display combo** does:
```typescript
export function SyncW3championsButton() {
  const { mutate, isPending } = useSyncW3championsMutation();
  const { data: syncStatus } = useQuery({
    queryKey: w3championsKeys.syncStatus(),
    queryFn: () => getW3championsSyncStatus(),
    staleTime: SYNC_TTL_MS,
  });
  return ( /* button + spinner + last-synced text */ );
}
```
The `/replays` route's "Pull recent replays" CTA should follow this identical `useMutation` + `useQuery` combo (pending-spinner swap, no disabled/countdown state per D-11 precedent — though D-15's 1v1-only note doesn't disable the action, it filters mastery advancement downstream).

**Route file shape** (`auto-advance.tsx` lines 1-45): `createFileRoute("/replays")({ component: ReplaysRoute })`, imports `allNodes` from `content-collections` if the report needs node-title lookups, imports `useGraphStore` for `setRecentlyAdvanced` on the report page after an upload/pull completes.

---

### `content/nodes/build-order-{race}.mdx` — 4 new canonical MECHANIC nodes (D-10)

**Analog:** any existing `content/nodes/*.mdx` file with `nodeType: MECHANIC` and (once authored) an `autoDetect` block — inspect existing content directory for the closest current MECHANIC/autoDetect example (e.g. the `creep-routing` node referenced in `auto-advance.tsx`'s preview harness, which is seeded with `nodeType: MECHANIC` + `autoDetect`).

Follow the full required-frontmatter contract from `NodeFrontmatterSchema` (node.ts lines 282-349): `id` (kebab-case), `title`, `nodeType: "MECHANIC"`, `race` (one of `human`/`orc`/`undead`/`nightelf` — NOT `agnostic`, since these are race-specific per D-10), `skillType`, `difficulty`, `tags`, `patchId`, `patch_context` (non-empty), `last_reviewed` (YYYY-MM-DD), `meta_volatile`, `citations` (non-empty per D-03 discipline), plus the new replay-criteria field (see `ReplayCriteriaSchema` above) instead of/alongside `autoDetect`.

## Shared Patterns

### Authorization (principal-keyed server fns)
**Source:** `src/lib/auth-middleware.ts` (`authMiddleware`, `AuthedContext`)
**Apply to:** `uploadReplay`, `pullReplays`, `getReplayAnalysis` server fns
```typescript
export type AuthedContext = { context: { principal: User } };
export const authMiddleware = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session?.user) throw new Error("Unauthorized");
    return next({ context: { principal: session.user as User } });
  }
);
```
Every replay server fn: `createServerFn(...).middleware([authMiddleware]).handler(handlerFn)` — no factory wrapper, no `userId` input channel, BattleTag/gateway read via `context.principal.battleTag`/`context.principal.gateway` for D-14 player identification.

### Server-stamped fields (never from client input)
**Source:** `src/server/w3champions.ts` lines 172-184, `src/server/quiz.ts` lines 114-124
**Apply to:** all replay `nodeProgress` writes
`userId: principal.id`, `source: "replay"` (hardcoded, not from data), `patchId: CURRENT_PATCH.id` — identical discipline across auto/quiz/replay, only the write strategy (plain-insert vs onConflictDoUpdate vs monotonic-max onConflictDoUpdate) differs per source.

### Patch primitive
**Source:** `src/lib/patches.ts`
**Apply to:** `replay-thresholds.ts`, `object-id-maps/*`, `server/replay.ts` writes
```typescript
export const CURRENT_PATCH: PatchEntry = _PATCHES[_PATCHES.length - 1];
export function getPatch(id: string): PatchEntry { ... }
```
Resolve object-ID map version via `getPatch(...).objectIdMapVersion`, not the replay's raw buildNumber directly — buildNumber informs which patch entry to resolve, `objectIdMapVersion` is the actual map key (may be shared across patches).

### Query-key + TTL/cache-key co-location
**Source:** `src/lib/w3champions-keys.ts` (full file)
**Apply to:** new `src/lib/replay-keys.ts`
Client-safe pure-constants file (no fetch/db imports) so client hooks avoid pulling server-only code into the bundle — same rationale documented in the analog's own header comment.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/lib/wc3v/*.js` (vendored jblanchette/wc3v `lib/` modules) | utility (vendored, external, GPL-3.0) | transform | No in-repo analog — external GPL-3.0 source vendored per D-06/ADR-004; RESEARCH.md's own Code Examples + Architecture Patterns sections are the reference, not codebase precedent. Preserve upstream GPL-3.0 headers per licensing requirement. |
| `src/lib/replay-parser.ts` (w3gjs Buffer→ParserOutput binary wrapper) | utility, file-I/O | file-I/O | No existing binary-parsing wrapper in the codebase — `w3champions-client.ts` is the closest I/O-wrapper *style* precedent (thin native-fetch wrapper, deep module, server-only) but parses JSON, not a binary format; treat RESEARCH.md's "Code Examples → Parsing a `.w3g` buffer with w3gjs" section as the primary reference instead. |

## Metadata

**Analog search scope:** `src/lib/`, `src/server/`, `src/hooks/`, `src/components/profile/`, `src/routes/`, `src/db/schema.ts`, `src/schemas/`, `content-collections.ts`, `content/nodes/`
**Files scanned:** 13 (detect-mastery-signals.ts, w3champions.ts, w3champions-client.ts, w3champions-keys.ts, useSyncW3championsMutation.ts, SyncW3championsButton.tsx, schema.ts, progress.ts schema, patches.ts, mmr-tiers.ts, auth-middleware.ts, node.ts schema, content-collections.ts, quiz.ts server, routes/preview/auto-advance.tsx)
**Pattern extraction date:** 2026-07-02
